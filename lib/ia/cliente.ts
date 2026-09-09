/**
 * cliente - implementacion real de `ClienteModelo` sobre el SDK de Anthropic.
 *
 * Unico archivo de la capa de IA que importa `@anthropic-ai/sdk`. Se instancia
 * en el Route Handler (server-only): la key vive en `process.env.ANTHROPIC_API_KEY`.
 *
 * Salida estructurada: `output_config.format` = JSON Schema de `lib/diagnostico/schemas.ts`.
 * La respuesta se re-valida en runtime con los Zod de `validar.ts` (defensa en
 * profundidad + narrowing de tipos).
 *
 * PENDIENTE Fase 4: smoke test contra la API real (modelos, thinking, effort).
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  SCHEMA_MENSAJE_CIERRE,
  SCHEMA_MOTOR_SINTESIS,
  SCHEMA_MOTOR_TURNO,
} from "../diagnostico/schemas.ts";
import { ErrorIA, type ClienteModelo, type RespuestaModelo } from "./tipos.ts";
import {
  zMensajeCierre,
  zSintesis,
  zTurno,
  type MensajeCierreSalida,
  type SintesisSalida,
  type TurnoSalida,
} from "./validar.ts";
import type { z } from "zod";

const MODELO_TURNO = process.env.KY_MODELO_TURNO?.trim() || "claude-haiku-4-5";
const MODELO_SINTESIS = process.env.KY_MODELO_SINTESIS?.trim() || "claude-opus-5";

interface OpcionesLlamada {
  modelo: string;
  maxTokens: number;
  schema: { [k: string]: unknown };
  effort?: "low" | "medium" | "high";
  adaptiveThinking?: boolean;
}

export function clienteAnthropic(apiKey?: string): ClienteModelo {
  const anthropic = new Anthropic(apiKey ? { apiKey } : undefined);

  async function llamar<T>(
    system: string,
    user: string,
    zSchema: z.ZodType<T>,
    o: OpcionesLlamada,
  ): Promise<RespuestaModelo<T>> {
    const t0 = Date.now();
    let msg: Anthropic.Message;
    try {
      msg = await anthropic.messages.create({
        model: o.modelo,
        max_tokens: o.maxTokens,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
        output_config: {
          ...(o.effort ? { effort: o.effort } : {}),
          format: { type: "json_schema", schema: o.schema },
        },
        ...(o.adaptiveThinking ? { thinking: { type: "adaptive" } } : {}),
      });
    } catch (e) {
      if (e instanceof Anthropic.APIError) {
        throw new ErrorIA("modelo_no_disponible", `API de Claude: ${e.message}`, e);
      }
      throw e;
    }
    const latencia_ms = Date.now() - t0;

    if (msg.stop_reason === "refusal") {
      throw new ErrorIA("modelo_rechazo", "El modelo rechazo la solicitud por seguridad.");
    }

    const texto = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    let crudo: unknown;
    try {
      crudo = JSON.parse(texto);
    } catch (e) {
      throw new ErrorIA("salida_invalida", "El modelo no devolvio JSON parseable.", e);
    }

    const parsed = zSchema.safeParse(crudo);
    if (!parsed.success) {
      throw new ErrorIA(
        "salida_invalida",
        `La salida del modelo no cumple el esquema: ${parsed.error.message}`,
        parsed.error,
      );
    }

    return {
      datos: parsed.data,
      uso: {
        modelo: msg.model ?? o.modelo,
        tokens_in: msg.usage?.input_tokens ?? null,
        tokens_out: msg.usage?.output_tokens ?? null,
        latencia_ms,
      },
    };
  }

  return {
    turno(system, user): Promise<RespuestaModelo<TurnoSalida>> {
      return llamar(system, user, zTurno, {
        modelo: MODELO_TURNO,
        maxTokens: 2000,
        schema: SCHEMA_MOTOR_TURNO.schema,
        effort: "low",
      });
    },
    sintesis(system, user): Promise<RespuestaModelo<SintesisSalida>> {
      return llamar(system, user, zSintesis, {
        modelo: MODELO_SINTESIS,
        maxTokens: 8000,
        schema: SCHEMA_MOTOR_SINTESIS.schema,
        effort: "high",
        adaptiveThinking: true,
      });
    },
    mensajeCierre(system, user): Promise<RespuestaModelo<MensajeCierreSalida>> {
      return llamar(system, user, zMensajeCierre, {
        modelo: MODELO_TURNO,
        maxTokens: 1000,
        schema: SCHEMA_MENSAJE_CIERRE.schema,
        effort: "low",
      });
    },
  };
}
