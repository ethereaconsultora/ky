/**
 * POST /api/diagnostico/[id]/enviar — el Counselor marca la propuesta como entregada a la empresa.
 * Sólo si ya está aprobada. KY no manda el mail: deja registro (`enviada_at`) y el enlace al informe
 * imprimible (`artefacto_url`); el Counselor lo entrega (PDF desde el navegador) por su canal.
 */

import { NextResponse } from "next/server";
import { esUsuarioActivo } from "@/lib/auth/activo";
import { z } from "zod";
import { estadoEntrega, puedeEnviar } from "@/lib/api/entrega";
import { crearClienteServidor } from "@/lib/supabase/server";

export const runtime = "nodejs";

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return err("id_invalido", "Id inválido.", 400);

  const sb = await crearClienteServidor();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return err("no_autenticado", "Sesión requerida.", 401);
  if (!esUsuarioActivo(auth.user)) return err("cuenta_no_habilitada", "Tu cuenta todavía no está habilitada.", 403);

  const { data: diag } = await sb.from("diagnostico").select("id, estado").eq("id", id).maybeSingle();
  if (!diag) return err("no_encontrado", "Diagnóstico inexistente o ajeno.", 404);
  if (diag.estado !== "cerrado") return err("estado_invalido", "Sólo se entrega un diagnóstico cerrado.", 409);

  const { data: ints } = await sb
    .from("intervencion_propuesta")
    .select("id, aprobada_por_consultor, enviada_at")
    .eq("diagnostico_id", id);
  const estado = estadoEntrega(ints ?? []);
  if (!puedeEnviar(estado)) {
    return err(
      "estado_invalido",
      estado === "borrador" ? "Primero hay que aprobar la propuesta." : estado === "enviada" ? "La propuesta ya fue entregada." : "No hay propuesta.",
      409,
    );
  }

  const { data, error } = await sb
    .from("intervencion_propuesta")
    .update({ enviada_at: new Date().toISOString(), artefacto_url: `/diagnostico/${id}/informe` })
    .eq("diagnostico_id", id)
    .eq("aprobada_por_consultor", true)
    .is("enviada_at", null)
    .select("id");
  if (error || !data?.length) return err("error_db", "No se pudo registrar la entrega.", 500);

  return NextResponse.json({ estado: "enviada", artefacto_url: `/diagnostico/${id}/informe` });
}
