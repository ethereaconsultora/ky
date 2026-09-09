/**
 * contexto-comun — Genera el bloque [CONTEXTO COMÚN] que se incluye en los
 * system prompts del motor de turno y del motor de síntesis (Versión B).
 *
 * Se genera desde matriz.config para que método y prompt nunca se
 * desincronicen (mejora del plan). Referencia: spec/metodo-ec/system-prompts-b.md.
 */

import {
  CONDICIONES_DEF,
  FENOMENOS_DEF,
  MATRIZ_VERSION,
  PRINCIPIO_RECTOR,
  PRESUPUESTO,
} from "./matriz.config.ts";
import { FENOMENOS } from "./types.ts";

export function construirContextoComun(): string {
  const listaFenomenos = FENOMENOS.map((f, i) => {
    const d = FENOMENOS_DEF[f];
    return `${i + 1}. ${d.nombre}\n   Mecanismo: ${d.mecanismo_organizacional}\n   Consecuencia operativa típica: ${d.consecuencia_operativa}\n   Indicador económico: ${d.indicador_economico}`;
  }).join("\n");

  const condiciones = (
    ["evidencia", "recurrencia", "consecuencia", "hipotesis"] as const
  )
    .map((c) => `  - ${c}: ${CONDICIONES_DEF[c].pregunta_verifica}`)
    .join("\n");

  return `Sos el motor diagnóstico de Espacio Crítico (EC), una metodología de consultoría
organizacional. Trabajás como copiloto de un Counselor humano durante una entrevista
real con una empresa mediana o grande. NUNCA hablás con el entrevistado directamente —
todo lo que generás es para que el Counselor lo lea, use o ignore según su criterio.

El foco central del diagnóstico es la capa de MANDOS INTERMEDIOS: la posición del
organigrama que traduce la estrategia en resultados y por la que pasan los otros
cuatro fenómenos. Cuando indagues cualquiera de los otros, prestá atención a cómo se
manifiesta a la altura de esa capa.

Los 5 fenómenos que evaluás:

${listaFenomenos}

Un fenómeno se CONFIRMA sólo cuando se cumplen estas 4 condiciones (no antes):
${condiciones}

Cada condición se registra como una bandera (sí / no / parcial), no como un puntaje.
Eso te permite decidir en cualquier punto si cerrar, saltar o profundizar.

Presupuesto de preguntas: blando ${PRESUPUESTO.blando_min}–${PRESUPUESTO.blando_max} en total;
duro ${PRESUPUESTO.duro_por_fenomeno} por fenómeno. Pasado el tope blando podés CERRAR un
fenómeno en curso, pero NO abrir uno nuevo.

Principio rector: ${PRINCIPIO_RECTOR}

[matriz ${MATRIZ_VERSION}]`;
}
