/**
 * Capa de IA (BFF) - barrel.
 *
 * `cliente.ts` importa `@anthropic-ai/sdk` (server-only): no importar este
 * barrel desde codigo que corra en el browser ni desde los tests de dominio.
 */
export * from "./tipos.ts";
export * from "./validar.ts";
export * from "./normalizar.ts";
export * from "./motor-turno.ts";
export { clienteAnthropic } from "./cliente.ts";
