-- ============================================================
-- 0009 — Vistas ec_publico (lo que ve Newen): sólo lo que el Counselor ya aprobó
--
-- 1. VISIBILIDAD: un diagnóstico llega a Newen únicamente si está cerrado Y
--    - quedó como SIN_EVIDENCIA_SUFICIENTE (no tiene propuesta ni cifras), o
--    - TODAS sus intervenciones están aprobadas por el Counselor.
--    Un borrador nunca sale de EC ("la última palabra es del Counselor").
-- 2. BUG: `order by fd.intensidad desc` ordenaba el TEXTO ('severo' > 'moderado' >
--    'leve' > 'critico'): un fenómeno crítico quedaba último. Ahora se ordena por rango.
-- 3. Columnas nuevas (siempre al final: `create or replace view` no permite reordenar):
--    aprobada_at / enviada_at / fecha_inicio, presentismo / rotación, y la
--    reversibilidad + fenómenos objetivo de cada intervención.
--
-- Nada de esto expone respuesta_cruda ni la evidencia por hilo. Idempotente.
-- ============================================================

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
     order by case fd.intensidad when 'critico' then 4 when 'severo' then 3
                                 when 'moderado' then 2 when 'leve' then 1 else 0 end desc,
              fd.fenomeno_tipo
     limit 1)                                                    as fenomeno_dominante,
  (select fd.mecanismo_organizacional from public.fenomeno_detectado fd
     where fd.diagnostico_id = d.id and fd.estado = 'confirmado'
     order by case fd.intensidad when 'critico' then 4 when 'severo' then 3
                                 when 'moderado' then 2 when 'leve' then 1 else 0 end desc,
              fd.fenomeno_tipo
     limit 1)                                                    as mecanismo_dominante,
  (select max(ip.aprobada_at) from public.intervencion_propuesta ip
     where ip.diagnostico_id = d.id)                             as aprobada_at,
  (select max(ip.enviada_at) from public.intervencion_propuesta ip
     where ip.diagnostico_id = d.id)                             as enviada_at,
  d.fecha_inicio
from public.diagnostico d
join public.empresa e on e.id = d.empresa_id
where d.version = 'B'
  and d.estado = 'cerrado'
  and (
    d.resultado_tipo = 'SIN_EVIDENCIA_SUFICIENTE'
    or (
      exists     (select 1 from public.intervencion_propuesta ip where ip.diagnostico_id = d.id)
      and not exists (select 1 from public.intervencion_propuesta ip
                      where ip.diagnostico_id = d.id and not ip.aprobada_por_consultor)
    )
  );

-- Pérdida económica: sólo de diagnósticos visibles (aprobados). Reducción y ROI, siempre rango.
create or replace view ec_publico.v_perdida_economica as
select p.diagnostico_id, p.perdida_total,
       p.reduccion_ajustada_min, p.reduccion_ajustada_max,
       p.roi_min, p.roi_max, p.horizonte_proyeccion,
       p.presentismo, p.rotacion
from public.perdida_economica p
join ec_publico.v_diagnostico d on d.id = p.diagnostico_id;

-- Intervención: sólo las APROBADAS, de diagnósticos visibles.
create or replace view ec_publico.v_intervencion_propuesta as
select i.diagnostico_id, i.caso, i.descripcion, i.traduccion_humana,
       i.horizonte_proyeccion, i.aprobada_por_consultor, i.enviada_at,
       i.fenomenos_objetivo, i.aprobada_at,
       r.grado_temprano, r.grado_tardio, r.plazo_aparicion_efecto
from public.intervencion_propuesta i
join ec_publico.v_diagnostico d on d.id = i.diagnostico_id
left join public.reversibilidad r on r.id = i.reversibilidad_id
where i.aprobada_por_consultor;
