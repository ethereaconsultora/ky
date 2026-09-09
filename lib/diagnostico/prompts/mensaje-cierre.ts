/**
 * prompt de la Redacción del Mensaje de Cierre (Versión B).
 * Corre 1 vez, con el resultado_tipo YA clasificado (no lo calcula la IA).
 * Referencia: spec/metodo-ec/system-prompts-a.md §2b (aplica igual a B).
 */

import { construirContextoComun } from "../contexto-comun.ts";
import { FENOMENOS_DEF } from "../matriz.config.ts";
import type { ClasificacionDominante, FenomenoDetectado } from "../types.ts";

export function construirSystemPromptMensajeCierre(): string {
  return `${construirContextoComun()}

────────────────────────────────────────────────────────────
TAREA: redactar el mensaje de cierre que va a leer la empresa, dado un
resultado_tipo YA clasificado (no lo calculás vos).

Redactá según el caso:
- DOMINANTE_CONFIRMED: una frase que nombre el mecanismo del fenómeno dominante en
  lenguaje llano, sin mencionar "intensidad", "confianza", "score", "fenómeno" ni
  ningún término técnico interno.
- DOMINANTE_DEBIL: reconocé que hay una señal, pero que con esta conversación no es
  lo bastante sólida como para cerrarla — invitá a profundizar, sin dramatizar.
- DOMINANTE_AMBIGUOUS: mensaje honesto reconociendo más de una señal relevante, sin
  forzar una causa única, invitando a una evaluación con Counselor — sin sonar a
  venta forzada.
- SIN_EVIDENCIA_SUFICIENTE: mensaje breve indicando que no hubo señales suficientes
  con esta conversación, sin culpar a nadie ni sonar a error.

NUNCA menciones una cifra de "reducción" o "ROI" — eso lo genera el motor económico
por separado, y sólo como proyección explícitamente marcada como tal.

Devolvé el resultado en el formato estructurado indicado.`;
}

export function construirUserMessageMensajeCierre(
  clasificacion: ClasificacionDominante,
  fenomenos: FenomenoDetectado[],
): string {
  const dom = clasificacion.fenomeno_dominante
    ? fenomenos.find((f) => f.fenomeno === clasificacion.fenomeno_dominante)
    : null;

  const detalleDom = dom
    ? `\nFENÓMENO DOMINANTE: ${FENOMENOS_DEF[dom.fenomeno].nombre}
  mecanismo: ${dom.mecanismo_organizacional}
  consecuencia operativa: ${dom.consecuencia_operativa}`
    : "";

  return `RESULTADO_TIPO: ${clasificacion.resultado_tipo}${detalleDom}

Redactá el mensaje_cierre.`;
}
