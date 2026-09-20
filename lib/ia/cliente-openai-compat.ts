/**
 * cliente-openai-compat - `ClienteModelo` sobre cualquier endpoint compatible con
 * la API de Chat Completions de OpenAI (Gemini, Groq, OpenRouter, Ollama, ...).
 *
 * Pensado para PROBAR con un proveedor gratuito y despues volver a Claude
 * (`cliente.ts`) sin tocar el resto: el orquestador solo conoce `ClienteModelo`.
 *
 * Diferencia con `cliente.ts`: los modelos gratuitos no garantizan JSON Schema
 * estricto, asi que se usa modo JSON (`response_format: json_object`), el esquema
 * se incluye en el prompt, se re-valida con Zod y se reintenta UNA vez
 * devolviendole al modelo el error de validacion. Ademas, los 5xx transitorios
 * (los tiers gratis dan 503 en picos de demanda) se reintentan con espera.
 *
 * Sin dependencias: usa `fetch`. NO importa el SDK de Anthropic.
 */

import {
  SCHEMA_MENSAJE_CIERRE,
  SCHEMA_MOTOR_SINTESIS,
  SCHEMA_MOTOR_TURNO,
} from "../diagnostico/schemas.ts";
import { ErrorIA } from "./tipos.ts";
import type { ClienteModelo, RespuestaModelo } from "./tipos.ts";
import { zMensajeCierre, zSintesis, zTurno } from "./validar.ts";
import type { MensajeCierreSalida, SintesisSalida, TurnoSalida } from "./validar.ts";
import type { z } from "zod";

export interface ConfigCompat {
  baseUrl: string;
  apiKey: string;
  modelo: string;
  /** `reasoning_effort` (low|medium|high|none) para modelos que razonan: baja la latencia. Opcional. */
  razonamiento?: string;
  /** Inyectable para tests. */
  fetchImpl?: typeof fetch;
  /** Inyectable para tests (espera entre reintentos por errores 5xx transitorios). */
  esperar?: (ms: number) => Promise<void>;
}

/** Esperas antes de reintentar un 5xx transitorio. */
const ESPERAS_5XX_MS = [1500, 3500];
const STATUS_TRANSITORIOS = [500, 502, 503, 504];

interface RespuestaChat {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

type Mensaje = { role: "system" | "user" | "assistant"; content: string };

/** Saca fences ```json y texto alrededor; devuelve el JSON parseado. */
export function extraerJSON(texto: string): unknown {
  let t = texto.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const i = t.indexOf("{");
  const j = t.lastIndexOf("}");
  if (i >= 0 && j > i) t = t.slice(i, j + 1);
  return JSON.parse(t);
}

function instruccionFormato(schema: unknown): string {
  return [
    "────────────────────────────────────────",
    "FORMATO DE SALIDA (obligatorio)",
    "Respondé ÚNICAMENTE con un objeto JSON válido que cumpla exactamente este JSON Schema.",
    "Sin texto antes ni después, sin markdown, sin comentarios. Incluí todos los campos requeridos",
    "(usá null donde el esquema lo permita y no haya dato).",
    JSON.stringify(schema),
  ].join("\n");
}

export function clienteOpenAICompat(cfg: ConfigCompat): ClienteModelo {
  const base = cfg.baseUrl.replace(/\/+$/, "");
  const doFetch = cfg.fetchImpl ?? fetch;
  const esperar = cfg.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  /** POST con reintentos SOLO para 500/502/503/504. 429 (cuota) y otros 4xx salen de inmediato. */
  async function postear(mensajes: Mensaje[], maxTokens: number): Promise<Response> {
    for (let i = 0; ; i++) {
      let res: Response;
      try {
        res = await doFetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.apiKey}`,
          },
          body: JSON.stringify({
            model: cfg.modelo,
            messages: mensajes,
            response_format: { type: "json_object" },
            temperature: 0.4,
            max_tokens: maxTokens,
            ...(cfg.razonamiento ? { reasoning_effort: cfg.razonamiento } : {}),
          }),
        });
      } catch (e) {
        throw new ErrorIA("modelo_no_disponible", "No se pudo conectar con el proveedor de IA.", e);
      }
      if (!STATUS_TRANSITORIOS.includes(res.status) || i >= ESPERAS_5XX_MS.length) return res;
      await esperar(ESPERAS_5XX_MS[i]);
    }
  }

  async function llamar<T>(
    system: string,
    user: string,
    zSchema: z.ZodType<T>,
    schema: unknown,
    maxTokens: number,
  ): Promise<RespuestaModelo<T>> {
    const mensajes: Mensaje[] = [
      { role: "system", content: `${system}\n\n${instruccionFormato(schema)}` },
      { role: "user", content: user },
    ];

    const t0 = Date.now();
    let tokensIn = 0;
    let tokensOut = 0;
    let modeloReal = cfg.modelo;
    let ultimoError = "";

    for (let intento = 0; intento < 2; intento++) {
      const res = await postear(mensajes, maxTokens);

      if (!res.ok) {
        const detalle = (await res.text().catch(() => "")).slice(0, 300);
        throw new ErrorIA(
          "modelo_no_disponible",
          `Proveedor de IA respondió ${res.status}${res.status === 429 ? " (límite de uso)" : ""}: ${detalle}`,
        );
      }

      const json = (await res.json()) as RespuestaChat;
      tokensIn += json.usage?.prompt_tokens ?? 0;
      tokensOut += json.usage?.completion_tokens ?? 0;
      modeloReal = json.model ?? modeloReal;
      const texto = json.choices?.[0]?.message?.content ?? "";

      try {
        const parsed = zSchema.safeParse(extraerJSON(texto));
        if (parsed.success) {
          return {
            datos: parsed.data,
            uso: {
              modelo: modeloReal,
              tokens_in: tokensIn || null,
              tokens_out: tokensOut || null,
              latencia_ms: Date.now() - t0,
            },
          };
        }
        ultimoError = parsed.error.message;
      } catch (e) {
        ultimoError = `JSON no parseable: ${e instanceof Error ? e.message : String(e)}`;
      }

      mensajes.push(
        { role: "assistant", content: texto },
        {
          role: "user",
          content: `Tu respuesta no cumplió el esquema (${ultimoError.slice(0, 600)}). Devolvé de nuevo SOLO el JSON corregido.`,
        },
      );
    }

    throw new ErrorIA(
      "salida_invalida",
      `El modelo no devolvió una salida válida tras 2 intentos: ${ultimoError.slice(0, 300)}`,
    );
  }

  return {
    turno: (s, u): Promise<RespuestaModelo<TurnoSalida>> =>
      llamar(s, u, zTurno, SCHEMA_MOTOR_TURNO.schema, 4000),
    sintesis: (s, u): Promise<RespuestaModelo<SintesisSalida>> =>
      llamar(s, u, zSintesis, SCHEMA_MOTOR_SINTESIS.schema, 8000),
    mensajeCierre: (s, u): Promise<RespuestaModelo<MensajeCierreSalida>> =>
      llamar(s, u, zMensajeCierre, SCHEMA_MENSAJE_CIERRE.schema, 1000),
  };
}
