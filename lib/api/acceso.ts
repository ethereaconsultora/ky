/**
 * acceso - validacion del pedido de "link para crear/cambiar contrasena". Puro (sin Supabase ni Next).
 */

import { z } from "zod";

export const AccesoBody = z
  .object({
    email: z.string().trim().toLowerCase().email("Email inválido").max(200),
  })
  .strict();

export type AccesoInput = z.infer<typeof AccesoBody>;

/**
 * Respuesta ÚNICA para el que pide el link: no revela si el email está habilitado o no
 * (así no se puede usar el formulario para averiguar quién tiene acceso a KY).
 */
export const MENSAJE_ENLACE_ENVIADO =
  "Si ese email está habilitado en KY, te enviamos un link para crear tu contraseña. Revisá tu casilla (y el spam).";

/** Estado de un email según `ky_acceso_estado` (RPC de la migración 0010). */
export interface EstadoAcceso {
  habilitado: boolean;
  user_id: string | null;
  confirmado: boolean;
}

export type AccionAcceso = "nada" | "crear_y_enviar" | "reemplazar_sin_confirmar" | "enviar";

/**
 * Qué hay que hacer con ese email:
 *  - no habilitado                    → nada (respuesta genérica igual)
 *  - habilitado, sin cuenta           → crear la cuenta (contraseña aleatoria que nadie conoce) y enviar el link
 *  - habilitado, cuenta SIN confirmar → la cuenta la creó otro por fuera (posible secuestro previo con SU contraseña):
 *                                       se borra y se recrea antes de enviar el link
 *  - habilitado, cuenta confirmada    → sólo enviar el link (crear o cambiar contraseña)
 */
export function decidirAccion(e: EstadoAcceso): AccionAcceso {
  if (!e.habilitado) return "nada";
  if (!e.user_id) return "crear_y_enviar";
  if (!e.confirmado) return "reemplazar_sin_confirmar";
  return "enviar";
}
