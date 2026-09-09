-- ============================================================
-- 0002 — Perfil de usuario + catálogo de consentimiento + helper es_admin()
-- RLS y políticas en la misma migración que crea cada tabla.
-- ============================================================

-- ------------------------------------------------------------
-- users — perfil de la app. Supabase Auth provee auth.users.
-- ------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  nombre      text,
  rol         text not null default 'counselor' check (rol in ('counselor','admin')),
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- consentimiento_textos — catálogo global versionado (I8, gap 12 del plan)
-- ------------------------------------------------------------
create table if not exists public.consentimiento_textos (
  id             uuid primary key default gen_random_uuid(),
  version        text unique not null,
  cuerpo         text not null,
  vigente_desde  timestamptz not null default now(),
  vigente_hasta  timestamptz
);

-- ------------------------------------------------------------
-- helper: ¿el usuario actual es admin?
-- security definer + search_path fijo (no confía en el search_path del caller).
-- ------------------------------------------------------------
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.rol = 'admin');
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.users                 enable row level security;
alter table public.consentimiento_textos enable row level security;

-- users: cada quien se lee a sí mismo; admin lee todo. Sin INSERT/UPDATE vía API
-- (el alta la hace un trigger/servicio con service_role, que saltea RLS).
drop policy if exists users_self on public.users;
create policy users_self on public.users
  for select using (id = auth.uid() or public.es_admin());

-- consentimiento_textos: lectura para autenticados, escritura sólo admin.
drop policy if exists ct_read on public.consentimiento_textos;
create policy ct_read on public.consentimiento_textos
  for select using (auth.uid() is not null);

drop policy if exists ct_write on public.consentimiento_textos;
create policy ct_write on public.consentimiento_textos
  for all using (public.es_admin()) with check (public.es_admin());
