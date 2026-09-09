/**
 * Tipos compartidos del núcleo de dominio EC.
 * Puro — no importa nada de Next, Supabase ni el SDK de Claude.
 * Referencia: spec/metodo-ec/ + spec/DATA_MODEL.md.
 */

// ── Fenómenos ──────────────────────────────────────────────────────────────
export const FENOMENOS = [
  "mandos_medios",
  "clima_vinculos",
  "desgaste",
  "transicion",
  "estructura",
] as const;
export type FenomenoTipo = (typeof FENOMENOS)[number];

// ── Las 4 condiciones de cierre ────────────────────────────────────────────
export const CONDICIONES = [
  "evidencia",
  "recurrencia",
  "consecuencia",
  "hipotesis",
] as const;
export type Condicion = (typeof CONDICIONES)[number];
export type Condiciones = Record<Condicion, boolean>;

// ── Ejes de graduación (independientes entre sí) ───────────────────────────
export type Intensidad = "leve" | "moderado" | "severo" | "critico";
export type Confianza = "baja" | "media" | "alta";

export type EstadoFenomeno = "confirmado" | "en_observacion" | "descartado";

export type IndicadorEconomico =
  | "presentismo"
  | "rotacion"
  | "horas_improductivas"
  | "friccion";

// ── Tipo de pregunta (ubica la respuesta en el árbol) ──────────────────────
export type TipoPregunta =
  | "deteccion"
  | "evidencia"
  | "consecuencia"
  | "confirmacion"
  | "puente";

export type RegistroPregunta =
  | "directo"
  | "narrativo"
  | "contrafactico"
  | "contraste_temporal"
  | "cambio_perspectiva";

// ── Mecanismo/hilo detectado dentro de un fenómeno (nivel 2 de la Mapa) ────
export interface MecanismoDetectado {
  hilo: string; // id del hilo en mapa-indagacion.config
  evidencia: string; // resumen de la evidencia que lo activa (sin verbatim sensible)
}

// ── Fenómeno detectado (estado acumulado del diagnóstico) ──────────────────
export interface FenomenoDetectado {
  fenomeno: FenomenoTipo;
  condiciones: Condiciones;
  estado: EstadoFenomeno;
  intensidad: Intensidad | null;
  confianza: Confianza | null;
  mecanismo_organizacional: string | null;
  consecuencia_operativa: string | null;
  indicador_economico: IndicadorEconomico | null;
  mecanismos: MecanismoDetectado[];
  perfil_mando: string | null; // lectura tipo FAUNA emergente
  razonamiento: string | null;
  preguntas_hechas: number; // para el tope duro de 4/fenómeno
}

// ── Resultado del modo DOMINANTE (a nivel de todo el diagnóstico) ──────────
export type ResultadoTipo =
  | "DOMINANTE_CONFIRMED"
  | "DOMINANTE_AMBIGUOUS"
  | "DOMINANTE_DEBIL"
  | "SIN_EVIDENCIA_SUFICIENTE";

export interface ClasificacionDominante {
  resultado_tipo: ResultadoTipo;
  fenomeno_dominante: FenomenoTipo | null;
  /** score = intensidad_norm × confianza_norm, por fenómeno confirmado, desc. */
  scores: Array<{ fenomeno: FenomenoTipo; score: number }>;
}

// ── Relaciones entre fenómenos (síntesis, sólo B) ─────────────────────────
export type TipoRelacion =
  | "A_B" // A → B  : A explica B
  | "B_A" // B → A
  | "A_HIP_B" // A ↔ B  : hipótesis de circuito
  | "A_CONF_B" // A ⇄ B  : circuito confirmado
  | "A_PERP_B" // A ⊥ B  : co-dominantes
  | "A_ABIERTO_B"; // A ? B  : relación abierta

export interface RelacionFenomeno {
  fenomeno_a: FenomenoTipo;
  fenomeno_b: FenomenoTipo;
  tipo: TipoRelacion;
  evidencia_soporte: string;
}

export type CasoDiagnostico = 1 | 2 | 3 | 4;

// ── Motor económico ───────────────────────────────────────────────────────
export interface DatosEconomicos {
  n: number; // empleados
  s: number; // salario promedio mensual
  r: number; // tasa de rotación anual (0–1)
  /** Los 3 ejes de fricción son OPCIONALES (ver DD-05). Escala 1–5. */
  ejes?: [number, number, number];
}

export type HorizonteProyeccion = "6m" | "12m" | "24m";
export type PlazoEfecto = "inmediato" | "corto" | "medio" | "largo";

export interface Reversibilidad {
  aplica_a: string; // `fenomeno:<tipo>` | `relacion` | `circuito`
  grado_temprano: number; // 0–1, a 6 meses
  grado_tardio: number; // 0–1, a 24 meses
  peso_atribucion?: number; // sólo co-dominante
  alcance?: number; // sólo circuito
  factor_confianza_circuito?: number; // 0.5 hipotético / 1.0 confirmado
  plazo_aparicion_efecto: PlazoEfecto;
  justificacion: string;
}

export interface Rango {
  min: number;
  max: number;
}

export interface ResultadoEconomico {
  factor_friccion: number;
  factor_friccion_origen: "ejes" | "derivado" | "default";
  presentismo: number;
  rotacion: number;
  perdida_total: number;
  /** Capa "lo que proyectamos": SIEMPRE rango, nunca escalar (regla de la matriz). */
  reduccion_base: number; // 40% flat, informativo
  reduccion_proyectada: Rango;
  roi: Rango;
  horizonte: HorizonteProyeccion;
  caso: CasoDiagnostico;
}

// ── Intervención propuesta ────────────────────────────────────────────────
export interface IntervencionPropuesta {
  caso: CasoDiagnostico;
  fenomenos_objetivo: FenomenoTipo[];
  descripcion: string;
  traduccion_humana: string;
  reversibilidad: Reversibilidad;
  horizonte_proyeccion: HorizonteProyeccion;
  aprobada_por_consultor: false; // siempre false al generarse
}
