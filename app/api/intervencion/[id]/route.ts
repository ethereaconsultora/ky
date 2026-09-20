/**
 * PATCH /api/intervencion/[id] — el Counselor edita el texto de un frente de la propuesta.
 * Sólo mientras esté en borrador (una vez aprobada, el texto queda fijo). Con la sesión del usuario (RLS).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { EdicionIntervencionBody } from "@/lib/api/entrega";
import { crearClienteServidor } from "@/lib/supabase/server";

export const runtime = "nodejs";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return err("id_invalido", "Id inválido.", 400);

  let body: z.infer<typeof EdicionIntervencionBody>;
  try {
    body = EdicionIntervencionBody.parse(await req.json());
  } catch (e) {
    return err("body_invalido", e instanceof z.ZodError ? e.issues.map((i) => i.message).join(" · ") : "JSON inválido", 400);
  }

  const sb = await crearClienteServidor();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return err("no_autenticado", "Sesión requerida.", 401);

  const { data: actual } = await sb
    .from("intervencion_propuesta")
    .select("id, aprobada_por_consultor")
    .eq("id", id)
    .maybeSingle();
  if (!actual) return err("no_encontrado", "Propuesta inexistente o ajena.", 404);
  if (actual.aprobada_por_consultor) return err("estado_invalido", "La propuesta ya está aprobada: no se puede editar.", 409);

  const cambios = {
    ...(body.descripcion !== undefined ? { descripcion: body.descripcion } : {}),
    ...(body.traduccion_humana !== undefined ? { traduccion_humana: body.traduccion_humana } : {}),
  };
  const { data, error } = await sb
    .from("intervencion_propuesta")
    .update(cambios)
    .eq("id", id)
    .eq("aprobada_por_consultor", false)
    .select("id, descripcion, traduccion_humana")
    .maybeSingle();
  if (error || !data) return err("error_db", "No se pudo guardar el cambio.", 500);

  return NextResponse.json(data);
}
