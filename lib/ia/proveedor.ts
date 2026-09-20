/**
 * proveedor - elige la implementacion de `ClienteModelo` segun el entorno.
 *
 *   KY_PROVEEDOR_IA = claude (default) | gemini | groq | openrouter | custom
 *
 * Volver a Claude = cambiar esa variable. Nada mas.
 *
 * SEGURIDAD: los tiers gratuitos suelen usar el contenido para mejorar el
 * producto (Gemini free lo hace). Por eso, en produccion de Vercel un proveedor
 * que no sea Claude se rechaza salvo KY_PERMITIR_IA_GRATIS=1. Para pruebas usar
 * SOLO datos ficticios.
 */

import { clienteAnthropic } from "./cliente.ts";
import { clienteOpenAICompat } from "./cliente-openai-compat.ts";
import { ErrorIA } from "./tipos.ts";
import type { ClienteModelo } from "./tipos.ts";

export type ProveedorIA = "claude" | "gemini" | "groq" | "openrouter" | "custom";

interface Preset {
  baseUrl: string;
  modelo: string;
  /** reasoning_effort por defecto (sólo para modelos que razonan; Llama etc. lo rechazarían). */
  razonamiento?: string;
}

const PRESETS: Record<Exclude<ProveedorIA, "claude" | "custom">, Preset> = {
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    // flash-lite: rápido (~2 s) y con su propia cuota diaria. El plan gratis tiene un tope DIARIO por modelo
    // (3.5-flash: 20 requests/día ≈ 1 entrevista). 3.6/3.7/3.8 y flash-latest daban 503 por saturación;
    // 2.5-flash ya no está disponible para cuentas nuevas (2026-09-20).
    modelo: "gemini-3.5-flash-lite",
    razonamiento: "low",
  },
  groq: { baseUrl: "https://api.groq.com/openai/v1", modelo: "llama-3.3-70b-versatile" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", modelo: "" },
};

type Env = Record<string, string | undefined>;

export function proveedorActual(env: Env = process.env): ProveedorIA {
  const p = (env.KY_PROVEEDOR_IA ?? "claude").trim().toLowerCase();
  if (["claude", "gemini", "groq", "openrouter", "custom"].includes(p)) return p as ProveedorIA;
  throw new ErrorIA("config_ia", `KY_PROVEEDOR_IA="${p}" no es válido.`);
}

export function crearClienteModelo(env: Env = process.env): ClienteModelo {
  const proveedor = proveedorActual(env);
  if (proveedor === "claude") return clienteAnthropic();

  if (env.VERCEL_ENV === "production" && env.KY_PERMITIR_IA_GRATIS !== "1") {
    throw new ErrorIA(
      "config_ia",
      `Proveedor "${proveedor}" bloqueado en producción (puede usar los datos para entrenar). ` +
        "Usá Claude o seteá KY_PERMITIR_IA_GRATIS=1 sabiendo el riesgo.",
    );
  }

  const preset: Preset = proveedor === "custom" ? { baseUrl: "", modelo: "" } : PRESETS[proveedor];
  const baseUrl = env.KY_IA_BASE_URL?.trim() || preset.baseUrl;
  const modelo = env.KY_IA_MODELO?.trim() || preset.modelo;
  const apiKey = env.KY_IA_API_KEY?.trim();

  if (!apiKey) throw new ErrorIA("config_ia", "Falta KY_IA_API_KEY para el proveedor de IA.");
  if (!baseUrl) throw new ErrorIA("config_ia", "Falta KY_IA_BASE_URL para el proveedor de IA.");
  if (!modelo) throw new ErrorIA("config_ia", "Falta KY_IA_MODELO para el proveedor de IA.");

  const razonamiento = env.KY_IA_REASONING_EFFORT?.trim() || preset.razonamiento;

  return clienteOpenAICompat({ baseUrl, apiKey, modelo, razonamiento });
}
