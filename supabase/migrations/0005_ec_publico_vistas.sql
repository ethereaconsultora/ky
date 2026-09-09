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
