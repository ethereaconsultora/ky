/**
 * persistencia-turno - transformaciones puras entre las filas de la DB y los
 * tipos del dominio. Sin IO (el Route Handler hace los selects/inserts).
 */

import { FENOMENOS, type FenomenoDetectado, type FenomenoTipo } from "../diagnostico/types.ts";
import type { FenomenoActualizado, TurnoSalida } from "./validar.ts";

/** Fila de `public.fenomeno_detectado` tal como la devuelve supabase-js. */
export interface FilaFenomeno {
  fenomeno_tipo: FenomenoTipo;
  cond_evidencia: boolean;
  cond_recurrencia: boolean;
  cond_consecuencia: boolean;
  cond_hipotesis: boolean;
  estado: FenomenoDetectado["estado"];
  intensidad: FenomenoDetectado["intensidad"];
  confianza: FenomenoDetectado["confianza"];
  mecanismo_organizacional: string | null;
  consecuencia_operativa: string | null;
  indicador_economico: FenomenoDetectado["indicador_economico"];
  mecanismos: FenomenoDetectado["mecanismos"] | null;
  perfil_mando: string | null;
  razonamiento: string | null;
}

function vacio(f: FenomenoTipo): FenomenoDetectado {
  return {
    fenomeno: f,
    condiciones: { evidencia: false, recurrencia: false, consecuencia: false, hipotesis: false },
    estado: "en_observacion",
    intensidad: null,
    confianza: null,
    mecanismo_organizacional: null,
    consecuencia_operativa: null,
    indicador_economico: null,
    mecanismos: [],
    perfil_mando: null,
    razonamiento: null,
    preguntas_hechas: 0,
  };
}

/**
 * Estado de los 5 fenómenos para el user message del turno. Combina las filas
 * existentes con los fenómenos que todavía no tienen fila, y le pega a cada uno
 * cuántas preguntas se le hicieron (derivado de respuesta_cruda.fenomeno_asociado).
 */
export function estadoFenomenos(
  filas: FilaFenomeno[],
  preguntasPorFenomeno: Partial<Record<FenomenoTipo, number>>,
): FenomenoDetectado[] {
  const porTipo = new Map(filas.map((r) => [r.fenomeno_tipo, r]));
  return FENOMENOS.map((f) => {
    const r = porTipo.get(f);
    const base = vacio(f);
    base.preguntas_hechas = preguntasPorFenomeno[f] ?? 0;
    if (!r) return base;
    return {
      ...base,
      condiciones: {
        evidencia: r.cond_evidencia,
        recurrencia: r.cond_recurrencia,
        consecuencia: r.cond_consecuencia,
        hipotesis: r.cond_hipotesis,
      },
      estado: r.estado,
      intensidad: r.intensidad,
      confianza: r.confianza,
      mecanismo_organizacional: r.mecanismo_organizacional,
      consecuencia_operativa: r.consecuencia_operativa,
      indicador_economico: r.indicador_economico,
      mecanismos: r.mecanismos ?? [],
      perfil_mando: r.perfil_mando,
      razonamiento: r.razonamiento,
    };
  });
}

/** Fila lista para `upsert` en `fenomeno_detectado` (onConflict diagnostico_id,fenomeno_tipo). */
export interface UpsertFenomeno {
  diagnostico_id: string;
  fenomeno_tipo: FenomenoTipo;
  cond_evidencia: boolean;
  cond_recurrencia: boolean;
  cond_consecuencia: boolean;
  cond_hipotesis: boolean;
  estado: FenomenoActualizado["estado"];
  intensidad: FenomenoActualizado["intensidad"];
  confianza: FenomenoActualizado["confianza"];
  mecanismo_organizacional: string | null;
  consecuencia_operativa: string | null;
  indicador_economico: FenomenoActualizado["indicador_economico_afectado"];
  mecanismos: FenomenoActualizado["mecanismos"];
  razonamiento: string | null;
  updated_at: string;
}

export function upsertsFenomenos(
  diagnostico_id: string,
  salida: TurnoSalida,
  ahoraISO: string,
): UpsertFenomeno[] {
  return salida.fenomenos_actualizados.map((f) => ({
    diagnostico_id,
    fenomeno_tipo: f.fenomeno,
    cond_evidencia: f.condiciones.evidencia,
    cond_recurrencia: f.condiciones.recurrencia,
    cond_consecuencia: f.condiciones.consecuencia,
    cond_hipotesis: f.condiciones.hipotesis,
    estado: f.estado,
    intensidad: f.intensidad,
    confianza: f.confianza,
    mecanismo_organizacional: f.mecanismo_organizacional,
    consecuencia_operativa: f.consecuencia_operativa,
    indicador_economico: f.indicador_economico_afectado,
    mecanismos: f.mecanismos,
    razonamiento: f.razonamiento,
    updated_at: ahoraISO,
  }));
}
