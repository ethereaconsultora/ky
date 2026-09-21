-- ============================================================
-- 0010 — Lista de usuarios habilitados (la maneja el admin desde Supabase)
--
-- Sólo pueden tener cuenta en KY los emails cargados en `public.usuarios_habilitados`.
-- Esta tabla es la ÚNICA fuente de verdad de quién entra y con qué rol:
--   · un trigger BEFORE INSERT sobre auth.users rechaza la creación de cualquier usuario cuyo email
--     no esté habilitado (por cualquier vía: la app, el dashboard o la API pública de Supabase);
--   · el mismo trigger le pone al usuario la marca `app_metadata.ky_activo = true` (lo único que
--     habilita el uso de la app; ver lib/auth/activo.ts);
--   · si después se desactiva o borra la fila, la marca pasa a false y el usuario queda afuera en su
--     próximo request (no hace falta borrar la cuenta);
--   · el rol (counselor | admin) y el nombre de la fila se copian a `public.users`.
--
-- Cómo habilitar a alguien (Table Editor → usuarios_habilitados → Insert row, o SQL):
--   insert into public.usuarios_habilitados (email, nombre, rol)
--   values ('ana@empresa.com', 'Lic. Ana Ferrer', 'counselor');   -- o 'admin'
-- Después esa persona entra a /registro, pone su email y crea su contraseña con el link que recibe.
--
-- Sin políticas RLS a propósito: nadie la lee ni la escribe por la API pública; sólo el admin
-- (Table Editor / SQL Editor) y el service_role. Idempotente.
-- ============================================================

create table if not exists public.usuarios_habilitados (
  email      text primary key,
  nombre     text,
  rol        text not null default 'counselor' check (rol in ('counselor','admin')),
  activo     boolean not null default true,
  creado_at  timestamptz not null default now()
);

alter table public.usuarios_habilitados enable row level security;
revoke all on public.usuarios_habilitados from anon, authenticated;

-- ------------------------------------------------------------
-- 1. El email y el rol se guardan siempre en minúsculas y sin espacios (aunque el admin los escriba
--    distinto: "Admin", " ANA@Empresa.com "). Corre ANTES del chequeo de la columna `rol`.
-- ------------------------------------------------------------
create or replace function public.ky_normalizar_email_habilitado()
returns trigger
language plpgsql
as $$
begin
  new.email  := lower(btrim(new.email));
  new.rol    := lower(btrim(new.rol));
  new.nombre := nullif(btrim(new.nombre), '');
  return new;
end $$;

drop trigger if exists ky_normalizar_email on public.usuarios_habilitados;
create trigger ky_normalizar_email
  before insert or update on public.usuarios_habilitados
  for each row execute function public.ky_normalizar_email_habilitado();

-- ------------------------------------------------------------
-- 2. auth.users: sólo se crean usuarios habilitados, y nacen con la marca de cuenta habilitada
-- ------------------------------------------------------------
create or replace function public.ky_restringir_altas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.usuarios_habilitados h
    where h.email = lower(btrim(new.email)) and h.activo
  ) then
    raise exception 'Email no habilitado en KY' using errcode = 'P0001';
  end if;
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('ky_activo', true);
  return new;
end $$;

drop trigger if exists ky_antes_de_crear_usuario on auth.users;
create trigger ky_antes_de_crear_usuario
  before insert on auth.users
  for each row execute function public.ky_restringir_altas();

-- ------------------------------------------------------------
-- 3. Perfil en public.users: rol y nombre salen de la lista (reemplaza handle_new_user de 0007)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.usuarios_habilitados;
begin
  select * into h from public.usuarios_habilitados where email = lower(btrim(new.email));

  insert into public.users (id, email, nombre, rol)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(h.nombre, ''),
      nullif(new.raw_user_meta_data->>'nombre', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(h.rol, 'counselor')
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ------------------------------------------------------------
-- 4. Cambios en la lista → se reflejan en la cuenta existente (marca, rol, nombre)
-- ------------------------------------------------------------
create or replace function public.ky_sincronizar_habilitado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text := case when tg_op = 'DELETE' then old.email else new.email end;
  v_activo boolean := (tg_op <> 'DELETE') and new.activo;
begin
  -- si cambiaron el email de la fila, el anterior queda deshabilitado
  if tg_op = 'UPDATE' and old.email <> new.email then
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"ky_activo": false}'::jsonb
     where lower(email) = old.email;
  end if;

  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('ky_activo', v_activo)
   where lower(email) = v_email;

  if tg_op <> 'DELETE' then
    update public.users
       set rol = new.rol,
           nombre = coalesce(nullif(new.nombre, ''), nombre)
     where lower(email) = v_email;
  end if;
  return null;
end $$;

drop trigger if exists ky_sincronizar on public.usuarios_habilitados;
create trigger ky_sincronizar
  after insert or update or delete on public.usuarios_habilitados
  for each row execute function public.ky_sincronizar_habilitado();

-- ------------------------------------------------------------
-- 5. Estado de un email para la API de acceso (sólo service_role)
--    { habilitado: bool, user_id: uuid|null, confirmado: bool }
-- ------------------------------------------------------------
create or replace function public.ky_acceso_estado(p_email text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'habilitado', exists (select 1 from public.usuarios_habilitados h where h.email = lower(btrim(p_email)) and h.activo),
    'user_id',    (select u.id from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1),
    'confirmado', coalesce((select u.email_confirmed_at is not null from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1), false)
  );
$$;

revoke all on function public.ky_acceso_estado(text) from public, anon, authenticated;
grant execute on function public.ky_acceso_estado(text) to service_role;

-- ------------------------------------------------------------
-- 6. Cuentas que ya existían: se alinean con la lista (las que no estén, quedan sin la marca)
-- ------------------------------------------------------------
update auth.users u
   set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
         || jsonb_build_object('ky_activo', exists (
              select 1 from public.usuarios_habilitados h where h.email = lower(u.email) and h.activo));
