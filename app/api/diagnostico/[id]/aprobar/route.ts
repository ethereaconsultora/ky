/**
 * POST /api/diagnostico/[id]/aprobar — el Counselor aprueba la propuesta de intervención.
 * Sólo un diagnóstico cerrado con propuesta en borrador. Corre con la sesión del usuario (RLS):
 * si el diagnóstico no es suyo, no ve nada y responde 404.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { estadoEntrega, puedeAprobar } from "@/lib/api/entrega";
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

  const { data: diag } = await sb.from("diagnostico").select("id, estado").eq("id", id).maybeSingle();
  if (!diag) return err("no_encontrado", "Diagnóstico inexistente o ajeno.", 404);
  if (diag.estado !== "cerrado") return err("estado_invalido", "Sólo se aprueba un diagnóstico cerrado.", 409);

  const { data: ints } = await sb
    .from("intervencion_propuesta")
    .select("id, aprobada_por_consultor, enviada_at")
    .eq("diagnostico_id", id);
  const estado = estadoEntrega(ints ?? []);
  if (!puedeAprobar(estado)) {
    return err("estado_invalido", estado === "sin_propuesta" ? "No hay propuesta para aprobar." : "La propuesta ya fue aprobada.", 409);
  }

  const { data, error } = await sb
    .from("intervencion_propuesta")
    .update({ aprobada_por_consultor: true, aprobada_at: new Date().toISOString() })
    .eq("diagnostico_id", id)
    .eq("aprobada_por_consultor", false)
    .select("id");
  if (error || !data?.length) return err("error_db", "No se pudo aprobar la propuesta.", 500);

  return NextResponse.json({ estado: "aprobada", aprobadas: data.length });
}
