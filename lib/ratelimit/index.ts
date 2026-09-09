/**
 * ratelimit - límite de tasa para los endpoints que llaman a Claude / STT.
 *
 * Si hay credenciales de Upstash en el entorno, usa un sliding-window real
 * (compartido entre instancias serverless). Si no, cae a un limiter en memoria
 * (suficiente para dev / una sola instancia) y lo deja registrado en el log.
 *
 * Presupuestos por `spec/API_CONTRACTS.md`.
 */

export interface ResultadoLimite {
  ok: boolean;
  restantes: number;
  resetEnMs: number;
}

export interface Limiter {
  limitar(clave: string): Promise<ResultadoLimite>;
}

interface Ventana {
  maximo: number;
  ventanaMs: number;
}

export const PRESUPUESTOS = {
  turno: { maximo: 30, ventanaMs: 5 * 60_000 }, // 30 / 5 min por diagnóstico
  sintesis: { maximo: 5, ventanaMs: 60 * 60_000 }, // 5 / hora por diagnóstico
  mensaje: { maximo: 5, ventanaMs: 60 * 60_000 },
  stt_token: { maximo: 20, ventanaMs: 60 * 60_000 }, // 20 / hora por counselor
} as const satisfies Record<string, Ventana>;

export type NombrePresupuesto = keyof typeof PRESUPUESTOS;

// ── Limiter en memoria (fallback) ─────────────────────────────────────────
class LimiterMemoria implements Limiter {
  #hits = new Map<string, number[]>();
  constructor(private readonly v: Ventana) {}

  async limitar(clave: string): Promise<ResultadoLimite> {
    const ahora = Date.now();
    const desde = ahora - this.v.ventanaMs;
    const previos = (this.#hits.get(clave) ?? []).filter((t) => t > desde);

    if (previos.length >= this.v.maximo) {
      return {
        ok: false,
        restantes: 0,
        resetEnMs: previos[0] + this.v.ventanaMs - ahora,
      };
    }
    previos.push(ahora);
    this.#hits.set(clave, previos);
    return { ok: true, restantes: this.v.maximo - previos.length, resetEnMs: this.v.ventanaMs };
  }
}

// ── Limiter Upstash (producción) ──────────────────────────────────────────
class LimiterUpstash implements Limiter {
  #rl: unknown;
  #listo: Promise<void>;

  constructor(private readonly nombre: NombrePresupuesto, private readonly v: Ventana) {
    this.#listo = this.#init();
  }

  async #init(): Promise<void> {
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import("@upstash/ratelimit"),
      import("@upstash/redis"),
    ]);
    this.#rl = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(this.v.maximo, `${this.v.ventanaMs} ms`),
      prefix: `ky:rl:${this.nombre}`,
      analytics: false,
    });
  }

  async limitar(clave: string): Promise<ResultadoLimite> {
    await this.#listo;
    const rl = this.#rl as {
      limit: (k: string) => Promise<{ success: boolean; remaining: number; reset: number }>;
    };
    const r = await rl.limit(clave);
    return { ok: r.success, restantes: r.remaining, resetEnMs: Math.max(0, r.reset - Date.now()) };
  }
}

// ── Factory ───────────────────────────────────────────────────────────────
const cache = new Map<NombrePresupuesto, Limiter>();

export function limiter(nombre: NombrePresupuesto): Limiter {
  const existente = cache.get(nombre);
  if (existente) return existente;

  const v = PRESUPUESTOS[nombre];
  const tieneUpstash =
    !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

  const impl: Limiter = tieneUpstash
    ? new LimiterUpstash(nombre, v)
    : (console.warn(
        `[ratelimit] sin UPSTASH_* — usando limiter en memoria para "${nombre}" (no sirve entre instancias)`,
      ),
      new LimiterMemoria(v));

  cache.set(nombre, impl);
  return impl;
}
