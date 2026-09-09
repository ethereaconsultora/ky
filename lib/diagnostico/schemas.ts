/**
 * schemas — JSON Schemas de salida de cada motor de IA.
 * Se pasan como `output_config.format` a la API de Claude: la validación ocurre
 * en la capa de la API y el modelo reintenta si no valida (sin parsing manual).
 *
 * Draft 2020-12, `additionalProperties: false`, todos los campos en `required`.
 *
 * Contraparte ejecutable: `lib/ia/validar.ts` (Zod), que re-valida la respuesta
 * en runtime. Si cambia un esquema, cambian los dos — el test
 * `lib/ia/motor-turno.test.ts` los cruza.
 */

import { CONDICIONES, FENOMENOS } from "./types.ts";

const fenomenoEnum = [...FENOMENOS];

const condicionesSchema = {
  type: "object",
  additionalProperties: false,
  required: [...CONDICIONES],
  properties: Object.fromEntries(
    CONDICIONES.map((c) => [c, { type: "boolean" }]),
  ),
} as const;

const fenomenoActualizadoSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "fenomeno",
    "condiciones",
    "estado",
    "intensidad",
    "confianza",
    "mecanismo_organizacional",
    "consecuencia_operativa",
    "indicador_economico_afectado",
    "mecanismos",
    "razonamiento",
  ],
  properties: {
    fenomeno: { type: "string", enum: fenomenoEnum },
    condiciones: condicionesSchema,
    estado: { type: "string", enum: ["confirmado", "en_observacion", "descartado"] },
    intensidad: { type: ["string", "null"], enum: ["leve", "moderado", "severo", "critico", null] },
    confianza: { type: ["string", "null"], enum: ["baja", "media", "alta", null] },
    mecanismo_organizacional: { type: ["string", "null"] },
    consecuencia_operativa: { type: ["string", "null"] },
    indicador_economico_afectado: {
      type: ["string", "null"],
      enum: ["presentismo", "rotacion", "horas_improductivas", "friccion", null],
    },
    mecanismos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["hilo", "evidencia"],
        properties: {
          hilo: { type: "string" },
          evidencia: { type: "string" },
        },
      },
    },
    razonamiento: { type: ["string", "null"] },
  },
} as const;

export const SCHEMA_MOTOR_TURNO = {
  name: "resultado_turno_ec",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "fenomenos_actualizados",
      "accion",
      "fenomeno_siguiente_prioridad",
      "fin_diagnostico",
      "sugerencias_pregunta",
      "alerta_seguridad",
    ],
    properties: {
      fenomenos_actualizados: {
        type: "array",
        items: fenomenoActualizadoSchema,
      },
      accion: { type: "string", enum: ["cerrar", "saltar", "profundizar"] },
      fenomeno_siguiente_prioridad: { type: ["string", "null"], enum: [...fenomenoEnum, null] },
      fin_diagnostico: { type: "boolean" },
      sugerencias_pregunta: {
        type: "array",
        minItems: 2,
        maxItems: 3,
        items: { type: "string" },
      },
      alerta_seguridad: { type: "boolean" },
    },
  },
} as const;

export const SCHEMA_MOTOR_SINTESIS = {
  name: "resultado_sintesis_ec",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["relaciones", "caso", "intervenciones", "punto_accesibilidad", "aprobada_por_consultor"],
    properties: {
      relaciones: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["fenomeno_a", "fenomeno_b", "tipo", "evidencia_soporte"],
          properties: {
            fenomeno_a: { type: "string", enum: fenomenoEnum },
            fenomeno_b: { type: "string", enum: fenomenoEnum },
            tipo: { type: "string", enum: ["A_B", "B_A", "A_HIP_B", "A_CONF_B", "A_PERP_B", "A_ABIERTO_B"] },
            evidencia_soporte: { type: "string" },
          },
        },
      },
      caso: { type: "integer", minimum: 1, maximum: 4 },
      intervenciones: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "fenomenos_objetivo",
            "descripcion",
            "traduccion_humana",
            "reversibilidad",
            "horizonte_proyeccion",
          ],
          properties: {
            fenomenos_objetivo: { type: "array", items: { type: "string", enum: fenomenoEnum } },
            descripcion: { type: "string" },
            traduccion_humana: { type: "string" },
            reversibilidad: {
              type: "object",
              additionalProperties: false,
              required: ["grado_temprano", "grado_tardio", "plazo_aparicion_efecto", "justificacion"],
              properties: {
                grado_temprano: { type: "number", minimum: 0, maximum: 1 },
                grado_tardio: { type: "number", minimum: 0, maximum: 1 },
                plazo_aparicion_efecto: { type: "string", enum: ["inmediato", "corto", "medio", "largo"] },
                justificacion: { type: "string" },
              },
            },
            horizonte_proyeccion: { type: "string", enum: ["6m", "12m", "24m"] },
          },
        },
      },
      punto_accesibilidad: { type: ["string", "null"] },
      aprobada_por_consultor: { type: "boolean", enum: [false] },
    },
  },
} as const;

export const SCHEMA_MENSAJE_CIERRE = {
  name: "mensaje_cierre_ec",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["mensaje_cierre"],
    properties: {
      mensaje_cierre: { type: "string" },
    },
  },
} as const;
