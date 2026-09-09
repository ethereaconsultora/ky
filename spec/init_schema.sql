-- ============================================================
-- KY — Esquema inicial (proyecto Supabase de ESPACIO CRÍTICO)
-- BORRADOR — revisar a mano antes de ejecutar (Protocolo Maestro Bloque 3).
-- Idempotente: puede re-ejecutarse. Ejecutar en Supabase → SQL Editor.
-- Implementa spec/DATA_MODEL.md.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 0. Rol de la app (perfil de usuario) — Supabase Auth provee auth.users
-- ------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  nombre      text,
  rol         text not null default 'counselor' check (rol in ('counselor','admin')),
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 1. Catálogo de textos de consentimiento (versionado)
-- ------------------------------------------------------------
create table if not exists public.consentimiento_textos (
  id             uuid primary key default gen_random_uuid(),
  version        text unique not null,
  cuerpo         text not null,
  vigente_desde  timestamptz not null default now(),
  vigente_hasta  timestamptz
);

-- ------------------------------------------------------------
-- 2. Empresa
-- ------------------------------------------------------------
create table if not exists public.empresa (
  id                      uuid primary key default gen_random_uuid(),
  nombre                  text not null,
  sector                  text,
  tamano_n                int,
  organization_client_id  uuid,               -- FK lógico al proyecto Newen (no enforced)
  fecha_alta              timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. Diagnóstico
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
  modo_captura             text not null default 'audio_transcrito' check (modo_captura in ('manual','audio_transcrito')),
  prompt_version           text,
  mapa_indagacion_version  text,
  estado                   text not null default 'en_curso' check (estado in ('en_curso','cerrado','pausado')),
  fecha_inicio             timestamptz not null default now(),
  fecha_cierre             timestamptz,
  paused_at                timestamptz,
  expires_at               timestamptz,
  resume_token             text
);

-- ------------------------------------------------------------
-- 4. Datos económicos
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
-- 5. Consentimiento (por diagnóstico)
-- ------------------------------------------------------------
create table if not exists public.consentimiento (
  id              uuid primary key default gen_random_uuid(),
  diagnostico_id  uuid not null references public.diagnostico(id) on delete cascade,
  texto_id        uuid not null references public.consentimiento_textos(id),
  aceptado_por    text not null,
  aceptado_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. Respuesta cruda (trazabilidad — campos sensibles cifrados)
--    El cifrado/descifrado se hace en el backend con pgp_sym_encrypt/decrypt
--    usando EC_PGCRYPTO_KEY (nunca en el cliente).
-- ------------------------------------------------------------
create table if not exists public.respuesta_cruda (
  id                     uuid primary key default gen_random_uuid(),
  diagnostico_id         uuid not null references public.diagnostico(id) on delete cascade,
  fenomeno_asociado      text,
  mecanismo_asociado     text,
  tipo_pregunta          text not null check (tipo_pregunta in ('deteccion','evidencia','consecuencia','confirmacion','puente')),
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
-- 7. Fenómeno detectado
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
  estado                    text not null default 'en_observacion' check (estado in ('confirmado','en_observacion','descartado')),
  intensidad                text check (intensidad in ('leve','moderado','severo','critico')),
  confianza                 text check (confianza in ('baja','media','alta')),
  mecanismo_organizacional  text,
  consecuencia_operativa    text,
  indicador_economico       text check (indicador_economico in ('presentismo','rotacion','horas_improductivas','friccion')),
  mecanismos                jsonb not null default '[]'::jsonb,
  perfil_mando              text,
  razonamiento              text,
  updated_at                timestamptz not null default now(),
  unique (diagnostico_id, fenomeno_tipo)
);

-- ------------------------------------------------------------
-- 8. Relación entre fenómenos (síntesis, sólo B)
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

-- ------------------------------------------------------------
-- 9. Reversibilidad (síntesis, sólo B)
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
  plazo_aparicion_efecto    text not null check (plazo_aparicion_efecto in ('inmediato','corto','medio','largo')),
  justificacion             text not null
);

-- ------------------------------------------------------------
-- 10. Pérdida económica
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
-- 11. Intervención propuesta
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

-- ------------------------------------------------------------
-- 12. Auditoría de llamadas a IA
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

-- ============================================================
-- RLS
-- ============================================================
alter table public.users                 enable row level security;
alter table public.empresa               enable row level security;
alter table public.diagnostico           enable row level security;
alter table public.datos_economicos      enable row level security;
alter table public.consentimiento        enable row level security;
alter table public.consentimiento_textos enable row level security;
alter table public.respuesta_cruda       enable row level security;
alter table public.fenomeno_detectado    enable row level security;
alter table public.relacion_fenomeno     enable row level security;
alter table public.reversibilidad        enable row level security;
alter table public.perdida_economica     enable row level security;
alter table public.intervencion_propuesta enable row level security;
alter table public.llamada_ia            enable row level security;

-- helper: ¿el usuario actual es admin?
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.rol = 'admin');
$$;

-- helper: ¿el diagnóstico es del counselor actual (o es admin)?
create or replace function public.puede_ver_diag(diag uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_admin()
      or exists (select 1 from public.diagnostico d where d.id = diag and d.counselor_id = auth.uid());
$$;

-- users: cada quien se lee a sí mismo; admin lee todo
drop policy if exists users_self on public.users;
create policy users_self on public.users for select using (id = auth.uid() or public.es_admin());

-- consentimiento_textos: lectura autenticada, escritura admin
drop policy if exists ct_read on public.consentimiento_textos;
create policy ct_read on public.consentimiento_textos for select using (auth.uid() is not null);
drop policy if exists ct_write on public.consentimiento_textos;
create policy ct_write on public.consentimiento_textos for all using (public.es_admin()) with check (public.es_admin());

-- empresa: counselor con al menos un diagnóstico propio de esa empresa, o admin
drop policy if exists empresa_all on public.empresa;
create policy empresa_all on public.empresa for all using (
  public.es_admin()
  or exists (select 1 from public.diagnostico d where d.empresa_id = empresa.id and d.counselor_id = auth.uid())
) with check (auth.uid() is not null);

-- diagnostico: dueño o admin
drop policy if exists diag_all on public.diagnostico;
create policy diag_all on public.diagnostico for all
  using (counselor_id = auth.uid() or public.es_admin())
  with check (counselor_id = auth.uid() or public.es_admin());

-- tablas hijas: usan puede_ver_diag(diagnostico_id)
do $$
declare t text;
begin
  foreach t in array array[
    'datos_economicos','consentimiento','respuesta_cruda','fenomeno_detectado',
    'relacion_fenomeno','reversibilidad','perdida_economica','intervencion_propuesta','llamada_ia'
  ] loop
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format(
      'create policy %I_all on public.%I for all using (public.puede_ver_diag(diagnostico_id)) with check (public.puede_ver_diag(diagnostico_id))',
      t, t);
  end loop;
end $$;

-- ============================================================
-- Vistas expuestas al FDW de Newen (schema ec_publico) — SIN evidencia cruda
-- ============================================================
create schema if not exists ec_publico;

create or replace view ec_publico.v_diagnostico as
select
  d.id,
  e.nombre                   as empresa_nombre,
  e.organization_client_id,
  d.estado,
  d.resultado_tipo,
  d.caso,
  d.fecha_cierre,
  (select fd.fenomeno_tipo from public.fenomeno_detectado fd
     where fd.diagnostico_id = d.id and fd.estado = 'confirmado'
     order by fd.intensidad desc nulls last limit 1)               as fenomeno_dominante,
  (select fd.mecanismo_organizacional from public.fenomeno_detectado fd
     where fd.diagnostico_id = d.id and fd.estado = 'confirmado'
     order by fd.intensidad desc nulls last limit 1)               as mecanismo_dominante
from public.diagnostico d
join public.empresa e on e.id = d.empresa_id
where d.version = 'B' and d.estado = 'cerrado';

create or replace view ec_publico.v_perdida_economica as
select p.diagnostico_id, p.perdida_total,
       p.reduccion_ajustada_min, p.reduccion_ajustada_max,
       p.roi_min, p.roi_max, p.horizonte_proyeccion
from public.perdida_economica p
join public.diagnostico d on d.id = p.diagnostico_id
where d.version = 'B' and d.estado = 'cerrado';

create or replace view ec_publico.v_intervencion_propuesta as
select i.diagnostico_id, i.caso, i.descripcion, i.traduccion_humana,
       i.horizonte_proyeccion, i.aprobada_por_consultor, i.enviada_at
from public.intervencion_propuesta i
join public.diagnostico d on d.id = i.diagnostico_id
where d.version = 'B' and d.estado = 'cerrado';

-- ============================================================
-- Rol de solo lectura para el FDW (ejecutar por separado, con contraseña real):
--   create role newen_reader login password '***';
--   grant usage on schema ec_publico to newen_reader;
--   grant select on all tables in schema ec_publico to newen_reader;
--   alter default privileges in schema ec_publico grant select on tables to newen_reader;
--   -- NUNCA: grant en el schema public a newen_reader.
-- ============================================================
