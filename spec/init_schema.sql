-- ============================================================
-- KY — Esquema consolidado (proyecto Supabase de ESPACIO CRÍTICO)
-- GENERADO: concatenación de supabase/migrations/0001..0006 (en ese orden).
-- Fuente canónica: supabase/migrations/. NO editar a mano.
-- Idempotente. Implementa spec/DATA_MODEL.md.
-- ============================================================


-- >>> supabase/migrations/0001_extensions.sql

-- ============================================================
-- 0001 — Extensiones
-- Proyecto Supabase de ESPACIO CRÍTICO (KY). Idempotente.
-- ============================================================

-- pgcrypto: cifrado en reposo de los campos sensibles de respuesta_cruda
-- (pgp_sym_encrypt / pgp_sym_decrypt en el backend con EC_PGCRYPTO_KEY).
create extension if not exists pgcrypto;


-- >>> supabase/migrations/0002_auth_y_catalogo.sql

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


-- >>> supabase/migrations/0003_empresa_y_diagnostico.sql

-- ============================================================
-- 0003 — empresa + diagnostico + helper puede_ver_diag()
-- ============================================================

-- ------------------------------------------------------------
-- empresa — entidad propia de EC. organization_client_id es el puente
-- (FK lógico, no enforced) al proyecto Newen (B5 del plan).
-- ------------------------------------------------------------
create table if not exists public.empresa (
  id                      uuid primary key default gen_random_uuid(),
  nombre                  text not null,
  sector                  text,
  tamano_n                int,
  organization_client_id  uuid,
  fecha_alta              timestamptz not null default now()
);

-- ------------------------------------------------------------
-- diagnostico
-- ------------------------------------------------------------
create table if not exists public.diagnostico (
  id                       uuid primary key default gen_random_uuid(),
  empresa_id               uuid not null references public.empresa(id) on delete cascade,
  version                  text not null default 'B' check (version in ('A','B')),
  diagnostico_origen_id    uuid references public.diagnostico(id),
  resultado_tipo           text check (resultado_tipo in
                             ('DOMINANTE_CONFIRMED','DOMINANTE_AMBIGUOUS','DOMINANTE_DEBIL','SIN_EVIDENCIA_SUFICIENTE')),
  caso                     int check (caso between 1 and 4),
  counselor_id             uuid not null references public.users(id),
  modo_captura             text not null default 'audio_transcrito'
                             check (modo_captura in ('manual','audio_transcrito')),
  prompt_version           text,
  mapa_indagacion_version  text,
  estado                   text not null default 'en_curso'
                             check (estado in ('en_curso','cerrado','pausado')),
  fecha_inicio             timestamptz not null default now(),
  fecha_cierre             timestamptz,
  paused_at                timestamptz,
  expires_at               timestamptz,
  resume_token             text
);
create index if not exists idx_diagnostico_counselor on public.diagnostico(counselor_id);
create index if not exists idx_diagnostico_empresa    on public.diagnostico(empresa_id);

-- ------------------------------------------------------------
-- helper: ¿el diagnóstico es del counselor actual (o es admin)?
-- ------------------------------------------------------------
create or replace function public.puede_ver_diag(diag uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_admin()
      or exists (select 1 from public.diagnostico d where d.id = diag and d.counselor_id = auth.uid());
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.empresa     enable row level security;
alter table public.diagnostico enable row level security;

-- empresa: counselor con al menos un diagnóstico propio de esa empresa, o admin.
drop policy if exists empresa_all on public.empresa;
create policy empresa_all on public.empresa for all using (
  public.es_admin()
  or exists (
    select 1 from public.diagnostico d
    where d.empresa_id = empresa.id and d.counselor_id = auth.uid()
  )
) with check (auth.uid() is not null);

-- diagnostico: dueño o admin.
drop policy if exists diag_all on public.diagnostico;
create policy diag_all on public.diagnostico for all
  using (counselor_id = auth.uid() or public.es_admin())
  with check (counselor_id = auth.uid() or public.es_admin());


-- >>> supabase/migrations/0004_diagnostico_hijas.sql

-- ============================================================
-- 0004 — Tablas hijas del diagnóstico + auditoría
-- Todas comparten la política: puede_ver_diag(diagnostico_id).
-- ============================================================

-- ------------------------------------------------------------
-- datos_economicos — 1:1. Ejes de fricción opcionales (B1);
-- factor_friccion_derivado se calcula al cierre.
-- ------------------------------------------------------------
create table if not exists public.datos_economicos (
  diagnostico_id            uuid primary key references public.diagnostico(id) on delete cascade,
  n_empleados               numeric not null,
  s_salario_mensual         numeric not null,
  r_rotacion_anual          numeric not null,
  eje_1                     numeric,
  eje_2                     numeric,
  eje_3                     numeric,
  factor_friccion_derivado  numeric
);

-- ------------------------------------------------------------
-- consentimiento — 1:1 si modo_captura = audio_transcrito.
-- ------------------------------------------------------------
create table if not exists public.consentimiento (
  id              uuid primary key default gen_random_uuid(),
  diagnostico_id  uuid not null references public.diagnostico(id) on delete cascade,
  texto_id        uuid not null references public.consentimiento_textos(id),
  aceptado_por    text not null,
  aceptado_at     timestamptz not null default now()
);
create index if not exists idx_consentimiento_diag on public.consentimiento(diagnostico_id);

-- ------------------------------------------------------------
-- respuesta_cruda — trazabilidad. texto_cifrado / transcripcion_cifrada
-- se escriben con pgp_sym_encrypt() desde el backend (nunca en claro,
-- nunca en el cliente). Si alerta_seguridad = true, el fragmento sensible
-- NO se persiste en claro (gap 2, protocolo de crisis).
-- ------------------------------------------------------------
create table if not exists public.respuesta_cruda (
  id                     uuid primary key default gen_random_uuid(),
  diagnostico_id         uuid not null references public.diagnostico(id) on delete cascade,
  fenomeno_asociado      text,
  mecanismo_asociado     text,
  tipo_pregunta          text not null
                           check (tipo_pregunta in ('deteccion','evidencia','consecuencia','confirmacion','puente')),
  pregunta_texto         text not null,
  modalidad              text not null check (modalidad in ('texto','audio')),
  texto_cifrado          bytea,
  transcripcion_cifrada  bytea,
  audio_ref              text,
  consentimiento_id      uuid references public.consentimiento(id),
  alerta_seguridad       boolean not null default false,
  ts                     timestamptz not null default now()
);
create index if not exists idx_respuesta_cruda_diag on public.respuesta_cruda(diagnostico_id, ts);

-- ------------------------------------------------------------
-- fenomeno_detectado — 1:5 (uno por fenómeno). mecanismos = nivel 2 de la
-- Mapa de Indagación (hilos detectados con su evidencia); perfil_mando = FAUNA.
-- ------------------------------------------------------------
create table if not exists public.fenomeno_detectado (
  id                        uuid primary key default gen_random_uuid(),
  diagnostico_id            uuid not null references public.diagnostico(id) on delete cascade,
  fenomeno_tipo             text not null check (fenomeno_tipo in
                              ('mandos_medios','clima_vinculos','desgaste','transicion','estructura')),
  cond_evidencia            boolean not null default false,
  cond_recurrencia          boolean not null default false,
  cond_consecuencia         boolean not null default false,
  cond_hipotesis            boolean not null default false,
  nota_condicion            text,
  estado                    text not null default 'en_observacion'
                              check (estado in ('confirmado','en_observacion','descartado')),
  intensidad                text check (intensidad in ('leve','moderado','severo','critico')),
  confianza                 text check (confianza in ('baja','media','alta')),
  mecanismo_organizacional  text,
  consecuencia_operativa    text,
  indicador_economico       text check (indicador_economico in
                              ('presentismo','rotacion','horas_improductivas','friccion')),
  mecanismos                jsonb not null default '[]'::jsonb,
  perfil_mando              text,
  razonamiento              text,
  updated_at                timestamptz not null default now(),
  unique (diagnostico_id, fenomeno_tipo)
);

-- ------------------------------------------------------------
-- relacion_fenomeno — síntesis (sólo B). 0:N.
-- ------------------------------------------------------------
create table if not exists public.relacion_fenomeno (
  id                            uuid primary key default gen_random_uuid(),
  diagnostico_id                uuid not null references public.diagnostico(id) on delete cascade,
  fenomeno_a                    text not null,
  fenomeno_b                    text not null,
  tipo_relacion                 text not null check (tipo_relacion in
                                  ('A_B','B_A','A_HIP_B','A_CONF_B','A_PERP_B','A_ABIERTO_B')),
  evidencia_soporte             text not null,
  requirio_pregunta_puente      boolean not null default false,
  punto_accesibilidad_sugerido  text
);
create index if not exists idx_relacion_fenomeno_diag on public.relacion_fenomeno(diagnostico_id);

-- ------------------------------------------------------------
-- reversibilidad — síntesis (sólo B). 0:N.
-- ------------------------------------------------------------
create table if not exists public.reversibilidad (
  id                        uuid primary key default gen_random_uuid(),
  diagnostico_id            uuid not null references public.diagnostico(id) on delete cascade,
  aplica_a                  text not null,
  grado_temprano            numeric not null,
  grado_tardio              numeric not null,
  peso_atribucion           numeric,
  alcance                   numeric,
  factor_confianza_circuito numeric,
  plazo_aparicion_efecto    text not null
                              check (plazo_aparicion_efecto in ('inmediato','corto','medio','largo')),
  justificacion             text not null
);
create index if not exists idx_reversibilidad_diag on public.reversibilidad(diagnostico_id);

-- ------------------------------------------------------------
-- perdida_economica — 1:1 al cierre. Reducción y ROI SIEMPRE como rango.
-- ------------------------------------------------------------
create table if not exists public.perdida_economica (
  diagnostico_id          uuid primary key references public.diagnostico(id) on delete cascade,
  presentismo             numeric not null,
  rotacion                numeric not null,
  perdida_total           numeric not null,
  reduccion_base          numeric not null,
  reversibilidad_id       uuid references public.reversibilidad(id),
  reduccion_ajustada_min  numeric,
  reduccion_ajustada_max  numeric,
  roi_min                 numeric,
  roi_max                 numeric,
  horizonte_proyeccion    text check (horizonte_proyeccion in ('6m','12m','24m'))
);

-- ------------------------------------------------------------
-- intervencion_propuesta — 1:1 al cierre.
-- ------------------------------------------------------------
create table if not exists public.intervencion_propuesta (
  id                      uuid primary key default gen_random_uuid(),
  diagnostico_id          uuid not null references public.diagnostico(id) on delete cascade,
  caso                    int not null check (caso between 1 and 4),
  fenomenos_objetivo      text[] not null default '{}',
  descripcion             text not null,
  traduccion_humana       text not null,
  reversibilidad_id       uuid references public.reversibilidad(id),
  horizonte_proyeccion    text not null check (horizonte_proyeccion in ('6m','12m','24m')),
  aprobada_por_consultor  boolean not null default false,
  aprobada_at             timestamptz,
  enviada_at              timestamptz,
  artefacto_url           text
);
create index if not exists idx_intervencion_diag on public.intervencion_propuesta(diagnostico_id);

-- ------------------------------------------------------------
-- llamada_ia — auditoría de prompts y costo (gap 6).
-- ------------------------------------------------------------
create table if not exists public.llamada_ia (
  id                       uuid primary key default gen_random_uuid(),
  diagnostico_id           uuid not null references public.diagnostico(id) on delete cascade,
  tipo                     text not null check (tipo in ('turno','sintesis','mensaje')),
  modelo                   text not null,
  prompt_version           text,
  mapa_indagacion_version  text,
  tokens_in                int,
  tokens_out               int,
  latencia_ms              int,
  ts                       timestamptz not null default now()
);
create index if not exists idx_llamada_ia_diag on public.llamada_ia(diagnostico_id, ts);

-- ============================================================
-- RLS — todas las hijas: puede_ver_diag(diagnostico_id)
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'datos_economicos','consentimiento','respuesta_cruda','fenomeno_detectado',
    'relacion_fenomeno','reversibilidad','perdida_economica','intervencion_propuesta','llamada_ia'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format(
      'create policy %I_all on public.%I for all '
      'using (public.puede_ver_diag(diagnostico_id)) '
      'with check (public.puede_ver_diag(diagnostico_id))',
      t, t);
  end loop;
end $$;


-- >>> supabase/migrations/0005_ec_publico_vistas.sql

-- ============================================================
-- 0005 — Esquema ec_publico: vistas de solo lectura para el FDW de Newen.
-- NO expone respuesta_cruda ni campos con personas nombradas.
-- El control de acceso es rol + vista (el FDW no respeta la RLS de EC).
-- ============================================================

create schema if not exists ec_publico;

-- v_diagnostico — estado + resultado + fenómeno dominante (sin evidencia cruda).
create or replace view ec_publico.v_diagnostico as
select
  d.id,
  e.nombre                  as empresa_nombre,
  e.organization_client_id,
  d.estado,
  d.resultado_tipo,
  d.caso,
  d.fecha_cierre,
  (select fd.fenomeno_tipo from public.fenomeno_detectado fd
     where fd.diagnostico_id = d.id and fd.estado = 'confirmado'
     order by fd.intensidad desc nulls last limit 1)            as fenomeno_dominante,
  (select fd.mecanismo_organizacional from public.fenomeno_detectado fd
     where fd.diagnostico_id = d.id and fd.estado = 'confirmado'
     order by fd.intensidad desc nulls last limit 1)            as mecanismo_dominante
from public.diagnostico d
join public.empresa e on e.id = d.empresa_id
where d.version = 'B' and d.estado = 'cerrado';

-- v_perdida_economica — magnitudes agregadas; reducción y ROI como rango.
create or replace view ec_publico.v_perdida_economica as
select p.diagnostico_id, p.perdida_total,
       p.reduccion_ajustada_min, p.reduccion_ajustada_max,
       p.roi_min, p.roi_max, p.horizonte_proyeccion
from public.perdida_economica p
join public.diagnostico d on d.id = p.diagnostico_id
where d.version = 'B' and d.estado = 'cerrado';

-- v_intervencion_propuesta — propuesta sin trazabilidad interna.
create or replace view ec_publico.v_intervencion_propuesta as
select i.diagnostico_id, i.caso, i.descripcion, i.traduccion_humana,
       i.horizonte_proyeccion, i.aprobada_por_consultor, i.enviada_at
from public.intervencion_propuesta i
join public.diagnostico d on d.id = i.diagnostico_id
where d.version = 'B' and d.estado = 'cerrado';

-- El rol newen_reader y sus grants se crean por separado con una contraseña real:
-- ver supabase/roles/newen_reader.sql


-- >>> supabase/migrations/0006_rpc_respuesta_cruda.sql

-- ============================================================
-- 0006 — RPC para persistir respuesta_cruda con cifrado pgcrypto.
--
-- supabase-js no puede invocar pgp_sym_encrypt() en un insert normal.
-- Este RPC recibe el texto plano + la clave (EC_PGCRYPTO_KEY, viaja server→
-- Supabase sobre TLS) y cifra del lado del servidor. security definer;
-- sólo el service_role lo puede llamar (revoke a anon/authenticated).
-- ============================================================

create or replace function public.guardar_respuesta_cruda(
  p_diagnostico_id      uuid,
  p_tipo_pregunta       text,
  p_pregunta_texto      text,
  p_modalidad           text,
  p_contenido           text,   -- texto plano; se cifra acá
  p_key                 text,   -- EC_PGCRYPTO_KEY
  p_fenomeno_asociado   text default null,
  p_mecanismo_asociado  text default null,
  p_consentimiento_id   uuid default null,
  p_alerta_seguridad    boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_cifrado bytea := null;
begin
  if p_contenido is not null and length(p_contenido) > 0 and not p_alerta_seguridad then
    v_cifrado := pgp_sym_encrypt(p_contenido, p_key);
  end if;

  insert into public.respuesta_cruda(
    diagnostico_id, tipo_pregunta, pregunta_texto, modalidad,
    texto_cifrado, transcripcion_cifrada,
    fenomeno_asociado, mecanismo_asociado, consentimiento_id, alerta_seguridad)
  values (
    p_diagnostico_id, p_tipo_pregunta, p_pregunta_texto, p_modalidad,
    case when p_modalidad = 'texto' then v_cifrado end,
    case when p_modalidad = 'audio' then v_cifrado end,
    p_fenomeno_asociado, p_mecanismo_asociado, p_consentimiento_id, p_alerta_seguridad)
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.guardar_respuesta_cruda(
  uuid, text, text, text, text, text, text, text, uuid, boolean) from public, anon, authenticated;

-- Lectura desdecifrada — para las pantallas de Conversación / Resultado (Fase 5/7).
create or replace function public.leer_respuestas_crudas(
  p_diagnostico_id uuid,
  p_key            text
) returns table (
  id             uuid,
  ts             timestamptz,
  tipo_pregunta  text,
  pregunta_texto text,
  modalidad      text,
  contenido      text,
  fenomeno_asociado  text,
  mecanismo_asociado text,
  alerta_seguridad   boolean
)
language sql
security definer
set search_path = public
as $$
  select
    r.id, r.ts, r.tipo_pregunta, r.pregunta_texto, r.modalidad,
    case
      when r.alerta_seguridad then null
      when r.texto_cifrado is not null then pgp_sym_decrypt(r.texto_cifrado, p_key)
      when r.transcripcion_cifrada is not null then pgp_sym_decrypt(r.transcripcion_cifrada, p_key)
      else null
    end as contenido,
    r.fenomeno_asociado, r.mecanismo_asociado, r.alerta_seguridad
  from public.respuesta_cruda r
  where r.diagnostico_id = p_diagnostico_id
  order by r.ts;
$$;

revoke all on function public.leer_respuestas_crudas(uuid, text) from public, anon, authenticated;

