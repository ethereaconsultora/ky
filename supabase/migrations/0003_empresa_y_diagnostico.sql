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
