/**
 * validar — esquemas Zod de las salidas de los motores de IA.
 *
 * Son la contraparte ejecutable de `lib/diagnostico/schemas.ts` (JSON Schema).
 * `schemas.ts` es la forma que se documenta / se puede pasar por HTTP crudo;
 * estos Zod son los que se pasan a `client.messages.parse()` vía
 * `zodOutputFormat(...)` y los que validan la respuesta en runtime.
 *
 * Si cambia uno, cambian los dos — el test `motor-turno.test.ts` los cruza.
 */

import { z } from "zod";
import { FENOMENOS } from "../diagnostico/types.ts";

const fenomenoEnum = z.enum(FENOMENOS);
const intensidadEnum = z.enum(["leve", "moderado", "severo", "critico"]);
const confianzaEnum = z.enum(["baja", "media", "alta"]);
const indicadorEnum = z.enum([
  "presentismo",
  "rotacion",
  "horas_improductivas",
  "friccion",
]);

// Las 4 condiciones de cierre (ver CONDICIONES en ../diagnostico/types.ts).
const condicionesSchema = z
  .object({
    evidencia: z.boolean(),
    recurrencia: z.boolean(),
    consecuencia: z.boolean(),
    hipotesis: z.boolean(),
  })
  .strict();

const mecanismoSchema = z
  .object({
    hilo: z.string().min(1),
    evidencia: z.string().min(1),
  })
  .strict();

const fenomenoActualizadoSchema = z
  .object({
    fenomeno: fenomenoEnum,
    condiciones: condicionesSchema,
    estado: z.enum(["confirmado", "en_observacion", "descartado"]),
    intensidad: intensidadEnum.nullable(),
    confianza: confianzaEnum.nullable(),
    mecanismo_organizacional: z.string().nullable(),
    consecuencia_operativa: z.string().nullable(),
    indicador_economico_afectado: indicadorEnum.nullable(),
    mecanismos: z.array(mecanismoSchema),
    razonamiento: z.string().nullable(),
  })
  .strict();

export const zTurno = z
  .object({
    fenomenos_actualizados: z.array(fenomenoActualizadoSchema),
    accion: z.enum(["cerrar", "saltar", "profundizar"]),
    fenomeno_siguiente_prioridad: fenomenoEnum.nullable(),
    fin_diagnostico: z.boolean(),
    sugerencias_pregunta: z.array(z.string().min(1)).min(2).max(3),
    alerta_seguridad: z.boolean(),
  })
  .strict();

export type TurnoSalida = z.infer<typeof zTurno>;
export type FenomenoActualizado = z.infer<typeof fenomenoActualizadoSchema>;

// ── Síntesis ──────────────────────────────────────────────────────────────
const relacionSchema = z
  .object({
    fenomeno_a: fenomenoEnum,
    fenomeno_b: fenomenoEnum,
    tipo: z.enum(["A_B", "B_A", "A_HIP_B", "A_CONF_B", "A_PERP_B", "A_ABIERTO_B"]),
    evidencia_soporte: z.string().min(1),
  })
  .strict();

const reversibilidadSchema = z
  .object({
    grado_temprano: z.number().min(0).max(1),
    grado_tardio: z.number().min(0).max(1),
    plazo_aparicion_efecto: z.enum(["inmediato", "corto", "medio", "largo"]),
    justificacion: z.string().min(1),
  })
  .strict();

const intervencionSchema = z
  .object({
    fenomenos_objetivo: z.array(fenomenoEnum),
    descripcion: z.string().min(1),
    traduccion_humana: z.string().min(1),
    reversibilidad: reversibilidadSchema,
    horizonte_proyeccion: z.enum(["6m", "12m", "24m"]),
  })
  .strict();

export const zSintesis = z
  .object({
    relaciones: z.array(relacionSchema),
    caso: z.number().int().min(1).max(4),
    intervenciones: z.array(intervencionSchema),
    punto_accesibilidad: z.string().nullable(),
    aprobada_por_consultor: z.literal(false),
  })
  .strict();

export type SintesisSalida = z.infer<typeof zSintesis>;

// ── Mensaje de cierre ─────────────────────────────────────────────────────
export const zMensajeCierre = z
  .object({ mensaje_cierre: z.string().min(1) })
  .strict();

export type MensajeCierreSalida = z.infer<typeof zMensajeCierre>;
