/**
 * Núcleo de dominio EC — barrel. Código puro, sin IO.
 * Ver lib/diagnostico/README.md y spec/metodo-ec/.
 */
export * from "./types.ts";
export * from "./matriz.config.ts";
export * from "./mapa-indagacion.config.ts";
export * from "./contexto-comun.ts";
export * from "./clasificador.ts";
export * from "./motor-economico.ts";
export * from "./schemas.ts";
export { construirSystemPromptTurno, construirUserMessageTurno } from "./prompts/motor-turno.ts";
export type { EntradaTurno } from "./prompts/motor-turno.ts";
export {
  construirSystemPromptSintesis,
  construirUserMessageSintesis,
} from "./prompts/motor-sintesis.ts";
export type { EntradaSintesis } from "./prompts/motor-sintesis.ts";
export {
  construirSystemPromptMensajeCierre,
  construirUserMessageMensajeCierre,
} from "./prompts/mensaje-cierre.ts";
