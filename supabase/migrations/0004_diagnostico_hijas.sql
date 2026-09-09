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
