-- ============================================================
-- 0006 — RPC para persistir/leer respuesta_cruda con cifrado pgcrypto.
--
-- supabase-js no puede invocar pgp_sym_encrypt() en un insert normal.
-- Estos RPC reciben el texto plano + la clave (EC_PGCRYPTO_KEY, viaja server→
-- Supabase sobre TLS) y cifran/descifran del lado del servidor. security definer;
-- sólo el service_role los puede llamar (revoke a anon/authenticated).
--
-- En Supabase pgcrypto se instala en el esquema `extensions`. Como estos RPC
-- fijan search_path = public, las funciones se llaman calificadas:
-- `extensions.pgp_sym_encrypt` / `extensions.pgp_sym_decrypt`.
-- Si en tu proyecto pgcrypto quedó en `public`, cambiá el prefijo.
-- Verificar con:  select n.nspname from pg_proc p
--                 join pg_namespace n on n.oid=p.pronamespace
--                 where p.proname='pgp_sym_encrypt';
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
    v_cifrado := extensions.pgp_sym_encrypt(p_contenido, p_key);
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

-- Lectura descifrada — para las pantallas de Conversación / Resultado (Fase 5/7).
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
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id, r.ts, r.tipo_pregunta, r.pregunta_texto, r.modalidad,
    case
      when r.alerta_seguridad then null::text
      when r.texto_cifrado is not null then extensions.pgp_sym_decrypt(r.texto_cifrado, p_key)
      when r.transcripcion_cifrada is not null then extensions.pgp_sym_decrypt(r.transcripcion_cifrada, p_key)
      else null::text
    end as contenido,
    r.fenomeno_asociado, r.mecanismo_asociado, r.alerta_seguridad
  from public.respuesta_cruda r
  where r.diagnostico_id = p_diagnostico_id
  order by r.ts;
end $$;

revoke all on function public.leer_respuestas_crudas(uuid, text) from public, anon, authenticated;
