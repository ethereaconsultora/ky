/**
 * POST /api/registro — alta de un counselor con CÓDIGO DE INVITACIÓN.
 *
 * KY no tiene registro abierto: el código (KY_CODIGO_INVITACION) lo entrega un admin. El usuario se crea
 * con el service role y se le pone `app_metadata.ky_activo = true` (lo único que habilita la cuenta; ver
 * lib/auth/activo.ts). El email se confirma solo: no depende del envío de mails.
 *
 * Orden pensado para no filtrar información: primero el límite de intentos y el código; recién con el
 * código correcto se dice si el email ya existe (no se puede usar para averiguar quién tiene cuenta).
 *
 * IMPORTANTE (Supabase): desactivar «Allow new users to sign up» en Authentication → Sign In / Providers,
 * así nadie puede crearse una cuenta por fuera de esta ruta. Aunque quedara activo, esas cuentas no
 * pasan el control de `ky_activo` en middleware ni en las API.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { codigoValido, esEmailDuplicado, RegistroBody } from "@/lib/api/registro";
import { limiter } from "@/lib/ratelimit";
import { crearClienteServicio } from "@/lib/supabase/service";

export const runtime = "nodejs";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: Request) {
  const esperado = process.env.KY_CODIGO_INVITACION;
  if (!esperado || esperado.length < 12) {
    return err("registro_deshabilitado", "El registro no está habilitado. Pedile el acceso a un admin.", 503);
  }

  // límite de intentos por IP (frena la fuerza bruta sobre el código)
  const ip = (req.headers.get("x-forwarded-for") ?? "desconocida").split(",")[0].trim();
  const rl = await limiter("registro").limitar(ip);
  if (!rl.ok) return err("rate_limit", "Demasiados intentos. Probá de nuevo más tarde.", 429);

  let body: z.infer<typeof RegistroBody>;
  try {
    body = RegistroBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return err("body_invalido", e.issues.map((i) => i.message).join(" · "), 400);
    return err("body_invalido", "JSON inválido", 400);
  }

  if (!codigoValido(body.codigo, esperado)) {
    return err("codigo_invalido", "El código de invitación no es correcto.", 403);
  }

  const { error } = await crearClienteServicio().auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { nombre: body.nombre },
    app_metadata: { ky_activo: true },
  });
  if (error) {
    if (esEmailDuplicado(error)) return err("email_existente", "Ya existe una cuenta con ese email. Ingresá con tu contraseña.", 409);
    console.error("[registro]", error.code, error.message);
    return err("error_registro", "No se pudo crear la cuenta.", 500);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
