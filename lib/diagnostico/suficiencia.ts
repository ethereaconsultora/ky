/**
 * suficiencia - reglas puras que impiden concluir con poca evidencia (DD-11).
 * Sin IA, sin IO. Fuente unica de los numeros: GUARDARRAILES en matriz.config.
 *
 *   R1  piso global de turnos para concluir / cerrar el diagnostico
 *   R2  piso por fenomeno: cuantas condiciones se pueden dar por cumplidas segun
 *       los turnos propios del fenomeno (=> confirmar exige >= 3 turnos propios)
 *   R3  la confianza "alta" exige >= 4 turnos propios
 */

import { GUARDARRAILES } from "./matriz.config.ts";
import { CONDICIONES } from "./types.ts";
import type { Condiciones, Confianza } from "./types.ts";

const TOTAL_CONDICIONES = CONDICIONES.length;

// ── R1 ────────────────────────────────────────────────────────────────────
/** ¿Alcanza el nº de turnos para poder concluir algo? `turnos` incluye el turno actual. */
export function puedeConcluir(turnos: number): boolean {
  return turnos >= GUARDARRAILES.min_turnos_diagnostico;
}

/** Cuántos turnos faltan para poder concluir (0 si ya se puede). */
export function turnosFaltantes(turnos: number): number {
  return Math.max(0, GUARDARRAILES.min_turnos_diagnostico - turnos);
}

export interface EvaluacionCierre {
  /** true = se puede emitir un diagnóstico (fenómenos confirmados, económico, intervención). */
  diagnostico_permitido: boolean;
  turnos: number;
  minimo: number;
  faltan: number;
  /**
   * Si el diagnóstico no está permitido, el único resultado válido es este.
   * El Counselor puede cerrar igual la sesión, pero sin conclusiones.
   */
  resultado_forzado: "SIN_EVIDENCIA_SUFICIENTE" | null;
}

/** Para el endpoint de cierre: ¿se puede emitir diagnóstico con esta cantidad de turnos? */
export function evaluarCierre(turnos: number): EvaluacionCierre {
  const permitido = puedeConcluir(turnos);
  return {
    diagnostico_permitido: permitido,
    turnos,
    minimo: GUARDARRAILES.min_turnos_diagnostico,
    faltan: turnosFaltantes(turnos),
    resultado_forzado: permitido ? null : "SIN_EVIDENCIA_SUFICIENTE",
  };
}

// ── R2 ────────────────────────────────────────────────────────────────────
/** Máximo de condiciones que se pueden dar por cumplidas con `turnosFenomeno` turnos propios. */
export function maxCondiciones(turnosFenomeno: number): number {
  if (turnosFenomeno <= 0) return 0;
  return Math.min(
    TOTAL_CONDICIONES,
    GUARDARRAILES.condiciones_en_primer_turno +
      (turnosFenomeno - 1) * GUARDARRAILES.condiciones_por_turno_adicional,
  );
}

/** Turnos propios mínimos para que las 4 condiciones (y por ende la confirmación) sean posibles. */
export function turnosMinimosParaConfirmar(): number {
  let n = 1;
  while (maxCondiciones(n) < TOTAL_CONDICIONES) n++;
  return n;
}

/**
 * Recorta las condiciones a lo permitido por los turnos propios del fenómeno.
 * Conserva las primeras en orden evidencia → recurrencia → consecuencia → hipótesis:
 * la hipótesis (que valida el entrevistado en un turno propio) es la primera en caer.
 */
export function recortarCondiciones(
  condiciones: Condiciones,
  turnosFenomeno: number,
): { condiciones: Condiciones; recortadas: number } {
  const max = maxCondiciones(turnosFenomeno);
  const resultado = { ...condiciones };
  let conservadas = 0;
  let recortadas = 0;
  for (const c of CONDICIONES) {
    if (!resultado[c]) continue;
    if (conservadas < max) {
      conservadas++;
    } else {
      resultado[c] = false;
      recortadas++;
    }
  }
  return { condiciones: resultado, recortadas };
}

// ── R3 ────────────────────────────────────────────────────────────────────
/** Confianza máxima admisible según los turnos propios del fenómeno. */
export function confianzaMaxima(turnosFenomeno: number): Confianza {
  return turnosFenomeno >= GUARDARRAILES.confianza_alta_min_turnos ? "alta" : "media";
}
