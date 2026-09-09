/**
 * prompt del Motor de Turno (Versión B).
 *
 * Compone: [CONTEXTO COMÚN] + Mapa de Indagación como material de referencia +
 * instrucciones generativas + mecanismos de profundidad + anti-patrones.
 * La IA COMPONE la pregunta, no la elige de una lista (spec/PLAN_APROBADO.md §1.E).
 *
 * Referencia: spec/metodo-ec/system-prompts-b.md §1.
 */

import { construirContextoComun } from "../contexto-comun.ts";
import {
  ANTI_PATRONES,
  HILOS,
  MAPA_INDAGACION_VERSION,
  MECANISMOS_PROFUNDIDAD,
} from "../mapa-indagacion.config.ts";
import { FENOMENOS_DEF, MATRIZ_VERSION, PRESUPUESTO } from "../matriz.config.ts";
import { FENOMENOS, type FenomenoDetectado } from "../types.ts";

function serializarMapaIndagacion(): string {
  return FENOMENOS.map((f) => {
    const def = FENOMENOS_DEF[f];
    const hilos = HILOS[f]
      .map((h) => {
        const semillas = Object.entries(h.preguntas_semilla)
          .map(([reg, qs]) => `      · ${reg}: ${qs.join(" / ")}`)
          .join("\n");
        const desamb = h.desambiguacion
          .map((d) => `      → si ${d.si}: ${d.entonces}`)
          .join("\n");
        return [
          `    [${h.id}] ${h.nombre}`,
          `      mecanismo: ${h.descripcion}`,
          `      señales: ${h.senales.join(" · ")}`,
          `      preguntas-semilla (material, NO leer literal):`,
          semillas,
          h.angulos_profundizacion.length
            ? `      profundización: ${h.angulos_profundizacion.join(" / ")}`
            : "",
          desamb ? `      desambiguación:\n${desamb}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");
    return `${def.nombre}\n  Pregunta de detección base: ${def.pregunta_deteccion}\n${hilos}`;
  }).join("\n\n");
}

export function construirSystemPromptTurno(): string {
  const contexto = construirContextoComun();
  const mapa = serializarMapaIndagacion();
  const profundidad = MECANISMOS_PROFUNDIDAD.map(
    (m) => `  - ${m.nombre}: ${m.instruccion}`,
  ).join("\n");
  const anti = ANTI_PATRONES.map((a) => `  - ${a}`).join("\n");

  return `${contexto}

────────────────────────────────────────────────────────────
TAREA (Motor de Turno)

Recibís: la última respuesta transcripta del entrevistado, el fenómeno en curso
(si hay uno), el estado actual de los 5 fenómenos y sus mecanismos, y cuántas
preguntas van hechas.

Hacé, en este orden:

1. Identificá a qué fenómeno(s) y a qué mecanismo(s)/hilo(s) aporta evidencia esta
   respuesta. Puede ser ninguno, uno o varios. Registrá cada mecanismo tocado con
   un resumen breve de la evidencia (sin verbatim que exponga a una persona).

2. Para cada fenómeno afectado, actualizá cuáles de las 4 condiciones quedan
   cumplidas. No asumas nada que la respuesta no diga. Forzá especificidad: no
   marques 'evidencia' con una generalidad.

3. Si un fenómeno completa las 4 condiciones → estado="confirmado", asigná
   intensidad y confianza, redactá mecanismo_organizacional y consecuencia_operativa
   (una frase cada uno, basados sólo en lo dicho) e indicá el indicador económico.
   Si aparece un rasgo de perfil del mando (veterano desmotivado / nuevo desbordado /
   etc., tipo "Ganas × Canas"), anotalo en razonamiento.

4. Decidí la acción para el fenómeno en curso:
   - CERRAR: 4 condiciones cumplidas, o llegó a la pregunta ${PRESUPUESTO.duro_por_fenomeno} sin resolverse
     (queda en observación, no forzar más).
   - SALTAR: tras 2 preguntas no hay señal de evidencia — bajá su prioridad.
   - PROFUNDIZAR: hay evidencia y recurrencia pero falta consecuencia o hipótesis —
     la próxima pregunta apunta a lo que falta.
   Pasado el tope blando de ${PRESUPUESTO.blando_max} preguntas podés cerrar un fenómeno en
   curso pero NO abrir uno nuevo → fin_diagnostico=true cuando no queden fenómenos por indagar.

5. Generá 2–3 sugerencias de próxima pregunta. REGLAS:
   - Componelas vos, nuevas, en el vocabulario del propio entrevistado. No copies
     las preguntas-semilla — usalas de material.
   - Cada sugerencia debe perseguir un hilo o un ángulo DISTINTO (no paráfrasis).
   - Calibrá al sector/tamaño/rol (en manufactura el mando es el jefe de turno; en
     servicios el team lead; a más capas jerárquicas, más pérdida en la traducción).
   - Tono cálido, natural, nunca clínico. Tal como lo diría el Counselor en voz alta.

6. alerta_seguridad = true si el entrevistado reveló autolesión, acoso, violencia o
   un ilícito. No repitas el contenido sensible en tu salida.

MECANISMOS DE PROFUNDIDAD (usalos al componer):
${profundidad}

REGLAS "NUNCA":
${anti}

────────────────────────────────────────────────────────────
MAPA DE INDAGACIÓN (material de referencia — nivel fenómeno → mecanismo/hilo)

${mapa}

[mapa de indagación ${MAPA_INDAGACION_VERSION} · matriz ${MATRIZ_VERSION}]`;
}

// ── User message: el estado del diagnóstico + la respuesta nueva ──────────
export interface EntradaTurno {
  respuesta_nueva: string;
  fenomeno_en_curso: string | null;
  estado_fenomenos: FenomenoDetectado[];
  preguntas_totales: number;
  contexto_empresa: { nombre: string; sector: string | null; n: number | null };
}

export function construirUserMessageTurno(e: EntradaTurno): string {
  const estado = e.estado_fenomenos
    .map((f) => {
      const cond = Object.entries(f.condiciones)
        .map(([k, v]) => `${k}:${v ? "sí" : "no"}`)
        .join(" ");
      return `- ${f.fenomeno} [${f.estado}] cond(${cond}) intensidad:${f.intensidad ?? "-"} confianza:${f.confianza ?? "-"} preguntas:${f.preguntas_hechas} mecanismos:${f.mecanismos.map((m) => m.hilo).join(",") || "-"}`;
    })
    .join("\n");

  return `EMPRESA: ${e.contexto_empresa.nombre} · sector: ${e.contexto_empresa.sector ?? "s/d"} · empleados: ${e.contexto_empresa.n ?? "s/d"}
PREGUNTAS HECHAS EN TOTAL: ${e.preguntas_totales}
FENÓMENO EN CURSO: ${e.fenomeno_en_curso ?? "ninguno"}

ESTADO ACTUAL DE LOS FENÓMENOS:
${estado}

ÚLTIMA RESPUESTA DEL ENTREVISTADO (transcripción):
"""
${e.respuesta_nueva}
"""

Devolvé el resultado en el formato estructurado indicado.`;
}
