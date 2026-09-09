/**
 * tipos - contratos de la capa de IA (BFF).
 *
 * `ClienteModelo` se inyecta: el orquestador (`motor-turno.ts`) no conoce el
 * SDK de Claude. La implementacion real vive en `cliente.ts`; los tests pasan
 * un doble.
 */

import type { MensajeCierreSalida, SintesisSalida, TurnoSalida } from "./validar.ts";

/** Metadata de una llamada al modelo -> fila de `llamada_ia`. */
export interface UsoModelo {
  modelo: string;
  tokens_in: number | null;
  tokens_out: number | null;
  latencia_ms: number;
}

export interface RespuestaModelo<T> {
  datos: T;
  uso: UsoModelo;
}

/**
 * Un motor pide: system prompt (cacheable, estable) + user message (volatil) +
 * el nombre del esquema Zod a exigir. Devuelve datos ya validados + uso.
 */
export interface ClienteModelo {
  turno(system: string, user: string): Promise<RespuestaModelo<TurnoSalida>>;
  sintesis(system: string, user: string): Promise<RespuestaModelo<SintesisSalida>>;
  mensajeCierre(
    system: string,
    user: string,
  ): Promise<RespuestaModelo<MensajeCierreSalida>>;
}

export type CodigoErrorIA =
  | "entrada_invalida"
  | "salida_invalida"
  | "modelo_no_disponible"
  | "modelo_rechazo";

/** Error de la capa de IA - lo traduce el Route Handler a `{ error: { code, message } }`. */
export class ErrorIA extends Error {
  readonly code: CodigoErrorIA;
  readonly causa?: unknown;

  constructor(code: CodigoErrorIA, message: string, causa?: unknown) {
    super(message);
    this.name = "ErrorIA";
    this.code = code;
    this.causa = causa;
  }
}
