/**
 * prompt del Motor de Síntesis (Versión B). Corre 1 vez al cerrar.
 * Referencia: spec/metodo-ec/system-prompts-b.md §2 + matriz §Relaciones entre fenómenos.
 */

import { construirContextoComun } from "../contexto-comun.ts";
import { FENOMENOS_DEF, MATRIZ_VERSION } from "../matriz.config.ts";
import type { FenomenoDetectado } from "../types.ts";

export function construirSystemPromptSintesis(): string {
  const contexto = construirContextoComun();

  return `${contexto}

────────────────────────────────────────────────────────────
TAREA (Motor de Síntesis) — se ejecuta una sola vez, al cerrar. Tomate el tiempo.

Recibís: los fenómenos confirmados, cada uno con su cadena completa
(mecanismo → consecuencia_operativa → indicador económico) y su evidencia.

1. RELACIONES. Para cada par de fenómenos confirmados, compará sus cadenas
   explicativas y clasificá:
   - A_B  : la cadena de A explica razonablemente la aparición de B (B consecuente).
   - B_A  : al revés.
   - A_PERP_B (⊥): ninguna cadena explica a la otra — evidencia independiente en
            ambas y ambas con consecuencias operativas propias → CO-DOMINANTES.
   - A_HIP_B (↔): hay indicios de que A alimenta a B y B agrava a A, pero el relato
            no narra la ida y vuelta explícitamente ni hay evidencia de más de un
            momento temporal → HIPÓTESIS DE CIRCUITO (no confirmado).
   - A_CONF_B (⇄): la recursividad está evidenciada explícitamente (el relato narra
            A→B→A) o hay evidencia de más de un momento temporal narrado que muestra
            el efecto volviendo sobre el fenómeno inicial → CIRCUITO CONFIRMADO.
   - A_ABIERTO_B (?): la evidencia no alcanza para clasificar — hipótesis abierta.
   No declares A_PERP_B sólo porque dos fenómenos tengan intensidad/confianza
   parecidas — la co-dominancia se define por independencia explicativa.
   La evidencia temporal es la cronología NARRADA por el entrevistado, no timestamps.

2. CASO GLOBAL: 1 dominante · 2 co-dominante (hay un A_PERP_B) · 3 circuito
   hipotético (hay un A_HIP_B) · 4 circuito confirmado (hay un A_CONF_B).

3. REVERSIBILIDAD por fenómeno (o por el punto de accesibilidad si es circuito):
   grado_temprano (6m) y grado_tardio (24m) sobre 0.20–0.55, plazo_aparicion_efecto
   (inmediato/corto/medio/largo) y una justificación de una frase. Usá como ancla las
   notas de reversibilidad de la matriz para cada fenómeno.

4. PUNTO DE ACCESIBILIDAD (sólo Caso 3/4): dónde intervenir evaluando en conjunto
   viabilidad dentro del alcance de EC, costo relativo, resistencia esperada y tiempo
   de implementación. Puede ser un tercer punto más chico, no A ni B.

5. INTERVENCIÓN PROPUESTA: 1 frente (Caso 1), 2 frentes (Caso 2), el punto de
   accesibilidad (Caso 3/4). Para cada uno: descripción, traducción_humana (qué se
   transforma en la experiencia de las personas), reversibilidad ya calculada,
   horizonte_proyeccion. Si es Caso 3, la intervención debe funcionar además como
   prueba diagnóstica: si el efecto esperado no aparece en el plazo, el circuito no era tal.

NUNCA:
- confirmes un circuito sin recursividad explícita o evidencia temporal narrada.
- fuerces una intervención única cuando el caso es co-dominante o circuito.
- marques aprobada_por_consultor como true — siempre false; la última palabra es del Counselor.
- generes intervenciones para más de 2 frentes (si hay 3+ co-dominantes, elegí los 2
  de mayor peso y dejá el resto anotado en la descripción).

Mapeo de referencia (Caso 1):
${Object.values(FENOMENOS_DEF)
  .map((d) => `  - ${d.nombre} → ${d.intervencion_ec}`)
  .join("\n")}

Devolvé el resultado en el formato estructurado indicado.

[matriz ${MATRIZ_VERSION}]`;
}

export interface EntradaSintesis {
  confirmados: FenomenoDetectado[];
  evidencia_por_fenomeno: Record<string, string[]>; // resúmenes, sin verbatim sensible
  contexto_empresa: { nombre: string; sector: string | null; n: number | null };
}

export function construirUserMessageSintesis(e: EntradaSintesis): string {
  const bloques = e.confirmados
    .map((f) => {
      const ev = (e.evidencia_por_fenomeno[f.fenomeno] ?? []).map((x) => `    · ${x}`).join("\n");
      return `- ${f.fenomeno}
    intensidad: ${f.intensidad} · confianza: ${f.confianza}
    mecanismo: ${f.mecanismo_organizacional}
    consecuencia operativa: ${f.consecuencia_operativa}
    indicador económico: ${f.indicador_economico}
    mecanismos/hilos: ${f.mecanismos.map((m) => m.hilo).join(", ") || "-"}
    evidencia:
${ev || "    · (sin resumen)"}`;
    })
    .join("\n\n");

  return `EMPRESA: ${e.contexto_empresa.nombre} · sector: ${e.contexto_empresa.sector ?? "s/d"} · empleados: ${e.contexto_empresa.n ?? "s/d"}

FENÓMENOS CONFIRMADOS:
${bloques}

Reconstruí las relaciones, el caso, la reversibilidad y la intervención propuesta.`;
}
