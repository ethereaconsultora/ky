/**
 * registro - validacion del alta de un counselor con codigo de invitacion. Puro (sin Supabase ni Next).
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** Largo minimo del codigo de invitacion configurado: uno corto se puede adivinar. */
export const LARGO_MINIMO_CODIGO = 12;

export const RegistroBody = z
  .object({
    nombre: z.string().trim().min(2, "Falta el nombre").max(100),
    email: z.string().trim().toLowerCase().email("Email inválido").max(200),
    // bcrypt (Supabase) ignora lo que pasa de 72 bytes: se limita para no aceptar una clave "más larga" que la real.
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(72, "La contraseña es demasiado larga (máximo 72)"),
    codigo: z.string().trim().min(1, "Falta el código de invitación").max(200),
  })
  .strict();

export type RegistroInput = z.infer<typeof RegistroBody>;

/** Comparacion en tiempo constante (no filtra cuantos caracteres coinciden). */
export function codigoValido(recibido: string, esperado: string | undefined): boolean {
  if (!esperado || esperado.length < LARGO_MINIMO_CODIGO) return false;
  const a = createHash("sha256").update(recibido).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}

/** ¿El error de Supabase indica que el email ya tiene cuenta? */
export function esEmailDuplicado(error: { message?: string; status?: number; code?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    /already (been )?registered|already exists|email_exists/i.test(error.message ?? "")
  );
}
