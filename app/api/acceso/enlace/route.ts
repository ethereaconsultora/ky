/**
 * POST /api/acceso/enlace — «crear cuenta» y «olvidé mi contraseña» (mismo flujo).
 *
 * Sólo pueden tener cuenta los emails cargados por el admin en `public.usuarios_habilitados`. El que se
 * anota pone su email; si está habilitado se le manda a su casilla un link para CREAR (o cambiar) su
 * contraseña. Como la cuenta nace con una contraseña aleatoria que nadie conoce, sólo quien recibe el
 * mail puede fijar la contraseña: no hay forma de «anotarse primero» con un email ajeno.
 *
 * Nunca revela si un email está habilitado: siempre responde lo mismo (200), salvo límites de envío.
 * Una cuenta que ya existe pero SIN confirmar (p. ej. creada por fuera con el registro público de
 * Supabase por alguien que conoce un email habilitado) se borra y se recrea antes de mandar el link.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AccesoBody, decidirAccion, MENSAJE_ENLACE_ENVIADO, type EstadoAcceso } from "@/lib/api/acceso";
import { limiter } from "@/lib/ratelimit";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { crearClienteServicio } from "@/lib/supabase/service";

export const runtime = "nodejs";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
const ok = () => NextResponse.json({ ok: true, mensaje: MENSAJE_ENLACE_ENVIADO });

/** Contraseña aleatoria que NADIE conoce: la cuenta sólo se usa después de que el dueño del mail elige la suya. */
function claveAleatoria(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export async function POST(req: Request) {
  let body: z.infer<typeof AccesoBody>;
  try {
    body = AccesoBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return err("body_invalido", e.issues.map((i) => i.message).join(" · "), 400);
    return err("body_invalido", "JSON inválido", 400);
  }

  // límites: por IP (frena barridos de emails) y por email (frena el spam de mails a una persona)
  const ip = (req.headers.get("x-forwarded-for") ?? "desconocida").split(",")[0].trim();
  if (!(await limiter("registro").limitar(ip)).ok) return err("rate_limit", "Demasiados intentos. Probá de nuevo más tarde.", 429);
  if (!(await limiter("enlace_email").limitar(body.email)).ok) {
    return err("rate_limit", "Ya te enviamos un link hace poco. Revisá tu casilla o esperá un rato para pedir otro.", 429);
  }

  const svc = crearClienteServicio();
  const { data: estado, error: errEstado } = await svc.rpc("ky_acceso_estado", { p_email: body.email });
  if (errEstado || !estado) {
    console.error("[acceso] ky_acceso_estado:", errEstado?.code, errEstado?.message);
    return err("no_configurado", "El acceso todavía no está configurado (falta aplicar la migración 0010).", 503);
  }

  const accion = decidirAccion(estado as EstadoAcceso);
  if (accion === "nada") return ok(); // mismo resultado que si estuviera habilitado

  if (accion === "reemplazar_sin_confirmar") {
    const { error } = await svc.auth.admin.deleteUser((estado as EstadoAcceso).user_id as string);
    if (error) {
      console.error("[acceso] deleteUser:", error.message);
      return err("error_acceso", "No se pudo preparar la cuenta. Probá de nuevo.", 500);
    }
  }
  if (accion === "crear_y_enviar" || accion === "reemplazar_sin_confirmar") {
    const { error } = await svc.auth.admin.createUser({ email: body.email, password: claveAleatoria(), email_confirm: true });
    if (error) {
      console.error("[acceso] createUser:", error.code, error.message);
      return err("error_acceso", "No se pudo crear la cuenta. Probá de nuevo.", 500);
    }
  }

  // el link lo manda Supabase. Cliente plano (flujo implícito): el link funciona abierto desde cualquier dispositivo.
  const anon = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "implicit" },
  });
  const { error: errMail } = await anon.auth.resetPasswordForEmail(body.email, {
    redirectTo: `${new URL(req.url).origin}/reset-password`,
  });
  if (errMail) {
    console.error("[acceso] resetPasswordForEmail:", errMail.code, errMail.status, errMail.message);
    if (errMail.status === 429 || errMail.code === "over_email_send_rate_limit") {
      return err("mail_limite", "Se alcanzó el límite de mails por hora. Probá de nuevo en un rato.", 429);
    }
    return err("mail_error", "No se pudo enviar el mail. Probá de nuevo en unos minutos.", 502);
  }

  return ok();
}
