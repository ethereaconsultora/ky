/**
 * clasificador — Funciones puras que traducen el estado de los fenómenos a un
 * resultado de diagnóstico. Sin IA, sin IO. Determinístico y auditable.
 *
 *  - clasificarDominante(): modo DOMINANTE (usado por A y por el "Caso 1" de B).
 *  - clasificarCaso(): Caso 1–4 a partir de las relaciones de la síntesis.
 *
 * Referencia: spec/metodo-ec/arquitectura-tecnica-a.md §modo DOMINANTE,
 *             spec/metodo-ec/system-prompts-a.md §2a,
 *             spec/PLAN_APROBADO.md B2/B3, spec/DESIGN_DECISIONS.md DD-06.
 */

import {
  DOMINANTE_UMBRAL,
  NORM_CONFIANZA,
  NORM_INTENSIDAD,
} from "./matriz.config.ts";
import type {
  CasoDiagnostico,
  ClasificacionDominante,
  Confianza,
  FenomenoDetectado,
  Intensidad,
  RelacionFenomeno,
} from "./types.ts";

/**
 * score = intensidad_normalizada × confianza_normalizada, ambos en 0–1.
 * La tabla de normalización es la única fuente (matriz.config), no hay números
 * mágicos acá.
 */
export function normalizarScore(
  intensidad: Intensidad | null,
  confianza: Confianza | null,
): number {
  if (!intensidad || !confianza) return 0;
  return NORM_INTENSIDAD[intensidad] * NORM_CONFIANZA[confianza];
}

/**
 * Modo DOMINANTE. Devuelve SIEMPRE uno de los 4 resultado_tipo (nunca undefined),
 * incluido el caso de un único fenómeno confirmado con score < umbral
 * (DOMINANTE_DEBIL — B3 del plan).
 */
export function clasificarDominante(
  fenomenos: FenomenoDetectado[],
): ClasificacionDominante {
  const confirmados = fenomenos.filter((f) => f.estado === "confirmado");

  const scores = confirmados
    .map((f) => ({
      fenomeno: f.fenomeno,
      score: normalizarScore(f.intensidad, f.confianza),
    }))
    .sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return {
      resultado_tipo: "SIN_EVIDENCIA_SUFICIENTE",
      fenomeno_dominante: null,
      scores,
    };
  }

  const score0 = scores[0].score;
  const score1 = scores[1]?.score ?? 0;
  const cumpleUmbral = score0 >= DOMINANTE_UMBRAL.score_minimo;
  const cumpleSeparacion =
    score0 - score1 >= DOMINANTE_UMBRAL.separacion_minima;

  if (cumpleUmbral && cumpleSeparacion) {
    return {
      resultado_tipo: "DOMINANTE_CONFIRMED",
      fenomeno_dominante: scores[0].fenomeno,
      scores,
    };
  }

  if (confirmados.length >= 2) {
    return {
      resultado_tipo: "DOMINANTE_AMBIGUOUS",
      fenomeno_dominante: null,
      scores,
    };
  }

  // Exactamente 1 confirmado que no llegó al umbral: señal real pero floja.
  return {
    resultado_tipo: "DOMINANTE_DEBIL",
    fenomeno_dominante: scores[0].fenomeno,
    scores,
  };
}

/**
 * Caso global 1–4 a partir de las relaciones clasificadas por la síntesis.
 * Prioridad: circuito confirmado > circuito hipotético > co-dominante > dominante.
 * Las relaciones subordinadas (A→B, B→A, A?B) no elevan el caso: quedan en Caso 1
 * con el fenómeno no subordinado como dominante.
 */
export function clasificarCaso(
  relaciones: RelacionFenomeno[],
): CasoDiagnostico {
  if (relaciones.some((r) => r.tipo === "A_CONF_B")) return 4;
  if (relaciones.some((r) => r.tipo === "A_HIP_B")) return 3;
  if (relaciones.some((r) => r.tipo === "A_PERP_B")) return 2;
  return 1;
}

/**
 * Pesos de atribución para el Caso 2 (co-dominante): peso_i = score_i / Σ score.
 * La suma de los pesos devueltos es 1 (salvo que todos los scores sean 0).
 */
export function pesosCoDominancia(
  fenomenos: FenomenoDetectado[],
): Array<{ fenomeno: FenomenoDetectado["fenomeno"]; peso: number }> {
  const confirmados = fenomenos.filter((f) => f.estado === "confirmado");
  const scores = confirmados.map((f) => ({
    fenomeno: f.fenomeno,
    score: normalizarScore(f.intensidad, f.confianza),
  }));
  const total = scores.reduce((acc, s) => acc + s.score, 0);
  if (total === 0) {
    const n = scores.length || 1;
    return scores.map((s) => ({ fenomeno: s.fenomeno, peso: 1 / n }));
  }
  return scores.map((s) => ({ fenomeno: s.fenomeno, peso: s.score / total }));
}
