/**
 * matriz.config — Fuente única de verdad del método EC para el código.
 *
 * Deriva de spec/metodo-ec/matriz-diagnostica-ec.md. Cualquier cambio al método
 * se hace PRIMERO en ese doc (o se anota en spec/PLAN_APROBADO.md) y DESPUÉS acá.
 *
 * Versión sellada por diagnóstico como `prompt_version` (KY_PROMPT_VERSION).
 */

import type {
  Confianza,
  FenomenoTipo,
  IndicadorEconomico,
  Intensidad,
  PlazoEfecto,
} from "./types.ts";

export const MATRIZ_VERSION = "v0.1.0";

// ── Principio rector (va al [CONTEXTO COMÚN]) ──────────────────────────────
export const PRINCIPIO_RECTOR =
  "Nunca declares algo que la evidencia no sostiene. Es preferible dejar un fenómeno " +
  '"en observación" o "sin evidencia suficiente" que forzar una conclusión. ' +
  "La confiabilidad del diagnóstico depende de esto.";

// ── Las 4 condiciones ─────────────────────────────────────────────────────
export const CONDICIONES_DEF: Record<
  "evidencia" | "recurrencia" | "consecuencia" | "hipotesis",
  { pregunta_verifica: string; se_verifica_con: string }
> = {
  evidencia: {
    pregunta_verifica: "¿Hay una manifestación concreta de que esto ocurre (no solo una opinión general)?",
    se_verifica_con: "Pregunta de detección",
  },
  recurrencia: {
    pregunta_verifica: "¿Se presenta con recurrencia (no es un hecho aislado)?",
    se_verifica_con: "Pregunta de evidencia (frecuencia, desde cuándo, dónde, a quién)",
  },
  consecuencia: {
    pregunta_verifica: "¿Produce una consecuencia operativa relevante?",
    se_verifica_con: "Pregunta de consecuencia",
  },
  hipotesis: {
    pregunta_verifica: "¿Existe una hipótesis plausible que conecte el fenómeno con esa consecuencia?",
    se_verifica_con: "Pregunta de confirmación / profundidad",
  },
};

// ── Presupuesto de preguntas ──────────────────────────────────────────────
export const PRESUPUESTO = {
  blando_min: 8,
  blando_max: 15,
  duro_por_fenomeno: 4,
  // Regla I5 del plan: pasado blando_max se puede CERRAR un fenómeno en curso,
  // pero NO abrir uno nuevo.
} as const;

// ── Normalización de los ejes de graduación a 0–1 (DD-06) ─────────────────
// Punto de partida razonado — RECALIBRAR con casos reales (ver PLAN_APROBADO §Pendientes).
export const NORM_INTENSIDAD: Record<Intensidad, number> = {
  leve: 0.25,
  moderado: 0.55,
  severo: 0.8,
  critico: 1.0,
};
export const NORM_CONFIANZA: Record<Confianza, number> = {
  baja: 0.4,
  media: 0.7,
  alta: 1.0,
};

// ── Umbrales del modo DOMINANTE (DD-06) — RECALIBRAR ──────────────────────
export const DOMINANTE_UMBRAL = {
  /** score mínimo del fenómeno #1 para declararlo dominante confirmado */
  score_minimo: 0.6,
  /** separación mínima entre el score #1 y el #2 */
  separacion_minima: 0.15,
} as const;

// ── Motor económico — constantes (matriz §Motor Económico) ────────────────
export const ECONOMICO = {
  presentismo_factor: 0.048, // presentismo = N·S·12·0.048
  rotacion_meses_salario: 3, // rotación = (N·R)·(S·3)·factor
  costo_intervencion_factor: 0.06, // costo = N·S·0.06  (puntual — ver I4/pendiente)
  reduccion_base_flat: 0.4, // 40% flat (capa "lo que proyectamos")
  // factor de fricción a partir del promedio de los 3 ejes (si se cargan)
  friccion_por_ejes(promedioEjes: number): number {
    if (promedioEjes < 2) return 0.5;
    if (promedioEjes < 3) return 0.75;
    if (promedioEjes < 4) return 1.0;
    return 1.2;
  },
  friccion_min: 0.5,
  friccion_max: 1.2,
} as const;

/**
 * Δfactor de fricción por fenómeno confirmado (DD-05).
 * Reemplaza la fuente ausente de "3 ejes": el factor se DERIVA de los fenómenos.
 * factor = clamp(friccion_min + Σ (delta[f] · intensidad_norm[f]), friccion_min, friccion_max)
 * Punto de partida — RECALIBRAR.
 */
export const DELTA_FACTOR_FRICCION: Record<FenomenoTipo, number> = {
  desgaste: 0.5, // "desgaste confirmado → sube el factor de fricción" (matriz)
  estructura: 0.45, // ambigüedad de roles → factor de fricción general
  clima_vinculos: 0.35, // fricción sostenida entre personas/áreas
  mandos_medios: 0.3, // retrabajo, escalamiento excesivo
  transicion: 0.15, // impacto más indirecto sobre la fricción
};

// ── Definición de cada fenómeno (matriz §1–5) ─────────────────────────────
export interface DefinicionFenomeno {
  tipo: FenomenoTipo;
  nombre: string;
  pregunta_deteccion: string;
  evidencia_esperada: string;
  pregunta_consecuencia: string;
  pregunta_confirmacion: string;
  mecanismo_organizacional: string;
  consecuencia_operativa: string;
  indicador_economico: IndicadorEconomico;
  traduccion_humana_intervencion: string;
  intervencion_ec: string;
  reversibilidad: {
    /** grado a 6 meses (ancla temprana) */
    grado_temprano: number;
    /** grado a 24 meses (ancla tardía) */
    grado_tardio: number;
    plazo_aparicion_efecto: PlazoEfecto;
    nota: string;
  };
}

export const FENOMENOS_DEF: Record<FenomenoTipo, DefinicionFenomeno> = {
  mandos_medios: {
    tipo: "mandos_medios",
    nombre: "Mandos medios / traducción estratégica-operativa",
    pregunta_deteccion:
      "¿Cómo llegan las decisiones de dirección hasta quienes tienen que ejecutarlas?",
    evidencia_esperada:
      'Menciones de reinterpretación, silencios, "se pierde en el camino", quejas sobre instrucciones poco claras.',
    pregunta_consecuencia:
      "¿Qué ocurre cuando esa decisión no puede ejecutarse como fue planteada?",
    pregunta_confirmacion:
      "¿Qué cree que hace que esa traducción falle en ese punto?",
    mecanismo_organizacional:
      "La decisión se filtra/reinterpreta al bajar de nivel jerárquico.",
    consecuencia_operativa:
      "Retrabajo, escalamiento excesivo, demora en ejecución.",
    indicador_economico: "rotacion",
    traduccion_humana_intervencion:
      "Coaching de liderazgo intermedio, entrenamiento en comunicación descendente y toma de decisión.",
    intervencion_ec: "Diagnóstico específico de conducción / desarrollo de mandos medios.",
    reversibilidad: {
      grado_temprano: 0.45,
      grado_tardio: 0.5,
      plazo_aparicion_efecto: "corto",
      nota: "Alta y rápida — es un rol puntual, entrenable.",
    },
  },
  clima_vinculos: {
    tipo: "clima_vinculos",
    nombre: "Clima y vínculos (conflicto)",
    pregunta_deteccion:
      "¿Cómo describirías el clima entre los equipos que más interactúan entre sí?",
    evidencia_esperada:
      'Tono defensivo, mención repetida de una persona/área, "no nos entendemos".',
    pregunta_consecuencia: "¿Qué pasa en el día a día cuando ese roce aparece?",
    pregunta_confirmacion:
      "¿Hay algo puntual que pasó y que todavía condiciona esa relación?",
    mecanismo_organizacional:
      "Fricción sostenida entre personas o áreas que deriva en evitación.",
    consecuencia_operativa:
      "Demoras por evitación de contacto, ausentismo puntual, tiempo de gestión del conflicto.",
    indicador_economico: "presentismo",
    traduccion_humana_intervencion:
      "Mediación y reconstrucción de vínculo entre las partes.",
    intervencion_ec: "Intervención de clima y vínculos.",
    reversibilidad: {
      grado_temprano: 0.3,
      grado_tardio: 0.4,
      plazo_aparicion_efecto: "medio",
      nota: "Media — depende de la antigüedad del conflicto.",
    },
  },
  desgaste: {
    tipo: "desgaste",
    nombre: "Desgaste / sobrecarga",
    pregunta_deteccion:
      "¿Cómo llegan las personas a un viernes, comparado con cómo llegaban hace un año?",
    evidencia_esperada:
      'Menciones de cansancio, licencias, "no dan más", ironía o resignación.',
    pregunta_consecuencia: "¿Qué cambió en la carga de trabajo en ese último año?",
    pregunta_confirmacion:
      "¿Qué pasaría si esa carga siguiera igual seis meses más?",
    mecanismo_organizacional:
      "Demanda sostenida que superó la capacidad de recuperación del equipo.",
    consecuencia_operativa:
      "Errores, presentismo, licencias por salud, caída de velocidad.",
    indicador_economico: "presentismo",
    traduccion_humana_intervencion:
      'Rediseño de carga + espacios de recuperación real (no solo discurso de "bienestar").',
    intervencion_ec: "Programa de recuperación de capacidad.",
    reversibilidad: {
      grado_temprano: 0.27,
      grado_tardio: 0.4,
      plazo_aparicion_efecto: "medio",
      nota: "Media-baja al inicio, sube con el tiempo — es fisiológico, no solo organizativo.",
    },
  },
  transicion: {
    tipo: "transicion",
    nombre: "Transición / duelo organizacional",
    pregunta_deteccion:
      "¿Qué cambió en la organización en los últimos dos años que la gente todavía menciona?",
    evidencia_esperada:
      '"Antes era distinto", resistencia a lo nuevo sin razón operativa clara.',
    pregunta_consecuencia:
      "¿Cómo se vivió ese cambio en el momento en que ocurrió?",
    pregunta_confirmacion:
      "¿Qué se perdió (en el sentido que sea) con ese cambio, que todavía no se nombró?",
    mecanismo_organizacional:
      "Un cambio real (fusión, salida de un líder, reestructuración) no fue procesado colectivamente.",
    consecuencia_operativa:
      "Lentitud en adopción de nuevas formas de trabajo, pérdida de conocimiento de quienes se fueron sin cierre.",
    indicador_economico: "rotacion",
    traduccion_humana_intervencion:
      "Procesar colectivamente la pérdida — nombrar y cerrar el ciclo (duelo organizacional).",
    intervencion_ec: "Intervención de duelo organizacional.",
    reversibilidad: {
      grado_temprano: 0.45,
      grado_tardio: 0.55,
      plazo_aparicion_efecto: "corto",
      nota: "Alta una vez identificado — intervención breve, efecto profundo, visible ya en los primeros 3 meses.",
    },
  },
  estructura: {
    tipo: "estructura",
    nombre: "Estructura organizacional",
    pregunta_deteccion:
      "¿Quién decide qué, cuando dos áreas necesitan lo mismo al mismo tiempo?",
    evidencia_esperada:
      '"Depende", "no está claro", respuestas distintas según a quién se le pregunte.',
    pregunta_consecuencia: "¿Qué pasa cuando nadie tiene claro quién decide?",
    pregunta_confirmacion:
      "¿Hace cuánto que la estructura no se revisa formalmente?",
    mecanismo_organizacional:
      "Ambigüedad de roles y funciones por diseño, no por comportamiento de las personas.",
    consecuencia_operativa:
      "Doble trabajo, decisiones lentas, responsabilidad diluida.",
    indicador_economico: "horas_improductivas",
    traduccion_humana_intervencion:
      "Rediseño del sistema en el que operan; el foco humano es ayudar a soltar roles/costumbres viejas durante la transición al nuevo diseño.",
    intervencion_ec: "Consultoría organizacional (rediseño estructural).",
    reversibilidad: {
      grado_temprano: 0.22,
      grado_tardio: 0.42,
      plazo_aparicion_efecto: "largo",
      nota: "Baja al inicio, alta y duradera después — el rediseño formal es lento pero, una vez asentado, no depende de sostener a nadie.",
    },
  },
};

// ── Mapeo fenómeno dominante → Resultado / Intervención (Caso 1) ──────────
export const MAPEO_RESULTADO: Record<
  FenomenoTipo,
  { letra: "A" | "B" | "C" | "D" | "E"; intervencion: string }
> = {
  mandos_medios: { letra: "A", intervencion: "Diagnóstico de conducción" },
  clima_vinculos: { letra: "B", intervencion: "Intervención de clima y vínculos" },
  desgaste: { letra: "C", intervencion: "Programa de recuperación de capacidad" },
  transicion: { letra: "D", intervencion: "Intervención de duelo organizacional" },
  estructura: { letra: "E", intervencion: "Consultoría organizacional" },
};

// ── Factor de confianza para circuitos (Caso 3 vs 4) ─────────────────────
export const FACTOR_CONFIANZA_CIRCUITO = {
  hipotetico: 0.5, // Caso 3 — descuento por incertidumbre
  confirmado: 1.0, // Caso 4
} as const;
