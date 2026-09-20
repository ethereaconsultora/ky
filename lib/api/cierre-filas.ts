/**
 * cierre-filas - arma las filas a insertar al cerrar un diagnostico. Puro: sin Supabase.
 * El Route Handler `/api/diagnostico/[id]/cerrar` las inserta con el service role.
 */

import { FACTOR_CONFIANZA_CIRCUITO, CIRCUITO_ALCANCE_DEFAULT } from "../diagnostico/matriz.config.ts";
import type { CasoDiagnostico, ResultadoEconomico, RelacionFenomeno } from "../diagnostico/types.ts";
import type { IntervencionCierre } from "../ia/cierre.ts";

export function filaPerdidaEconomica(diagnosticoId: string, e: ResultadoEconomico) {
  return {
    diagnostico_id: diagnosticoId,
    presentismo: e.presentismo,
    rotacion: e.rotacion,
    perdida_total: e.perdida_total,
    reduccion_base: e.reduccion_base,
    // La reduccion y el ROI se guardan SIEMPRE como rango (regla de la matriz).
    reduccion_ajustada_min: e.reduccion_proyectada.min,
    reduccion_ajustada_max: e.reduccion_proyectada.max,
    roi_min: e.roi.min,
    roi_max: e.roi.max,
    horizonte_proyeccion: e.horizonte,
  };
}

export function filasRelaciones(
  diagnosticoId: string,
  relaciones: RelacionFenomeno[],
  puntoAccesibilidad: string | null,
) {
  return relaciones.map((r) => ({
    diagnostico_id: diagnosticoId,
    fenomeno_a: r.fenomeno_a,
    fenomeno_b: r.fenomeno_b,
    tipo_relacion: r.tipo,
    evidencia_soporte: r.evidencia_soporte,
    requirio_pregunta_puente: false,
    punto_accesibilidad_sugerido: puntoAccesibilidad,
  }));
}

export function filaReversibilidad(diagnosticoId: string, i: IntervencionCierre, caso: CasoDiagnostico) {
  const circuito = caso >= 3;
  return {
    diagnostico_id: diagnosticoId,
    aplica_a: i.reversibilidad.aplica_a,
    grado_temprano: i.reversibilidad.grado_temprano,
    grado_tardio: i.reversibilidad.grado_tardio,
    peso_atribucion: null,
    alcance: circuito ? CIRCUITO_ALCANCE_DEFAULT : null,
    factor_confianza_circuito: circuito
      ? caso === 3
        ? FACTOR_CONFIANZA_CIRCUITO.hipotetico
        : FACTOR_CONFIANZA_CIRCUITO.confirmado
      : null,
    plazo_aparicion_efecto: i.reversibilidad.plazo_aparicion_efecto,
    justificacion: i.reversibilidad.justificacion,
  };
}

export function filaIntervencion(
  diagnosticoId: string,
  caso: CasoDiagnostico,
  i: IntervencionCierre,
  reversibilidadId: string,
) {
  return {
    diagnostico_id: diagnosticoId,
    caso,
    fenomenos_objetivo: i.fenomenos_objetivo,
    descripcion: i.descripcion,
    traduccion_humana: i.traduccion_humana,
    reversibilidad_id: reversibilidadId,
    horizonte_proyeccion: i.horizonte_proyeccion,
    aprobada_por_consultor: false, // la ultima palabra es del Counselor
  };
}
