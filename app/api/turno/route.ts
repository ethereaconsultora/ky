/**
 * POST /api/turno — Motor de Turno (BFF).
 *
 * Auth (getUser) → carga el diagnóstico (RLS: sólo el counselor dueño) →
 * rate limit por diagnóstico → arma el estado de los 5 fenómenos desde la DB →
 * llama a Claude (`lib/ia`) → persiste respuesta_cruda (cifrada), fenomeno_detectado
 * y llamada_ia con el service role → devuelve la salida saneada.
 *
 * Ver spec/API_CONTRACTS.md.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { clienteAnthropic } from "@/lib/ia/cliente";
import { ejecutarTurno } from "@/lib/ia/motor-turno";
import {
  estadoFenomenos,
  upsertsFenomenos,
  type FilaFenomeno,
} from "@/lib/ia/persistencia-turno";
import { ErrorIA } from "@/lib/ia/tipos";
import { limiter } from "@/lib/ratelimit";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteServicio } from "@/lib/supabase/service";
import { FENOMENOS, type FenomenoTipo } from "@/lib/diagnostico/types";

export const runtime = "nodejs";

const Body = z.object({
  diagnostico_id: z.string().uuid(),
  respuesta_texto: z.string().trim().min(1).max(20_000),
  tipo_pregunta: z
    .enum(["deteccion", "evidencia", "consecuencia", "confirmacion", "puente"])
    .default("evidencia"),
  pregunta_texto: z.string().trim().max(1_000).default(""),
});

function err(code: string, message: string, status: number, extra?: Record<string, string>) {
  return NextResponse.json({ error: { code, message } }, { status, headers: extra });
}

export async function POST(req: Request) {
  // 1. body
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return err("body_invalido", e instanceof z.ZodError ? e.message : "JSON inválido", 400);
  }

  // 2. auth
  const sb = await crearClienteServidor();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return err("no_autenticado", "Sesión requerida.", 401);

  // 3. diagnóstico (RLS deja ver sólo los del counselor)
  const { data: diag } = await sb
    .from("diagnostico")
    .select("id, estado, empresa:empresa_id ( nombre, sector, tamano_n )")
    .eq("id", body.diagnostico_id)
    .maybeSingle();
  if (!diag) return err("no_encontrado", "Diagnóstico inexistente o ajeno.", 404);
  if (diag.estado !== "en_curso")
    return err("estado_invalido", `El diagnóstico está ${diag.estado}.`, 409);

  // 4. rate limit
  const rl = await limiter("turno").limitar(body.diagnostico_id);
  if (!rl.ok)
    return err("rate_limit", "Demasiados turnos seguidos.", 429, {
      "Retry-After": String(Math.ceil(rl.resetEnMs / 1000)),
    });

  // 5. estado actual
  const [{ data: filas }, { count: preguntasTotales }, { data: respFen }] = await Promise.all([
    sb.from("fenomeno_detectado").select("*").eq("diagnostico_id", body.diagnostico_id),
    sb
      .from("respuesta_cruda")
      .select("*", { count: "exact", head: true })
      .eq("diagnostico_id", body.diagnostico_id),
    sb
      .from("respuesta_cruda")
      .select("fenomeno_asociado")
      .eq("diagnostico_id", body.diagnostico_id)
      .not("fenomeno_asociado", "is", null),
  ]);

  const preguntasPorFenomeno: Partial<Record<FenomenoTipo, number>> = {};
  for (const r of respFen ?? []) {
    const f = r.fenomeno_asociado as FenomenoTipo | null;
    if (f && FENOMENOS.includes(f)) preguntasPorFenomeno[f] = (preguntasPorFenomeno[f] ?? 0) + 1;
  }

  const empresa = Array.isArray(diag.empresa) ? diag.empresa[0] : diag.empresa;

  // 6. Claude
  let resultado;
  try {
    resultado = await ejecutarTurno(
      {
        respuesta_cruda: body.respuesta_texto,
        fenomeno_en_curso: null,
        estado_fenomenos: estadoFenomenos((filas ?? []) as FilaFenomeno[], preguntasPorFenomeno),
        preguntas_totales: preguntasTotales ?? 0,
        contexto_empresa: {
          nombre: empresa?.nombre ?? "Empresa",
          sector: empresa?.sector ?? null,
          n: empresa?.tamano_n ?? null,
        },
      },
      clienteAnthropic(),
    );
  } catch (e) {
    if (e instanceof ErrorIA) {
      const status = e.code === "modelo_no_disponible" ? 502 : e.code === "entrada_invalida" ? 400 : 500;
      return err(e.code, e.message, status);
    }
    return err("error_interno", "Fallo al procesar el turno.", 500);
  }

  const { salida, meta } = resultado;

  // 7. persistencia (service role — el diagnóstico ya fue validado como del counselor)
  const svc = crearClienteServicio();
  const ahora = new Date().toISOString();
  const pgKey = process.env.EC_PGCRYPTO_KEY;
  if (!pgKey) return err("config", "Falta EC_PGCRYPTO_KEY.", 500);

  const primerFenomenoTocado =
    salida.fenomenos_actualizados.find((f) => f.mecanismos.length > 0)?.fenomeno ??
    salida.fenomenos_actualizados[0]?.fenomeno ??
    null;

  await svc.rpc("guardar_respuesta_cruda", {
    p_diagnostico_id: body.diagnostico_id,
    p_tipo_pregunta: body.tipo_pregunta,
    p_pregunta_texto: body.pregunta_texto,
    p_modalidad: "texto",
    p_contenido: body.respuesta_texto,
    p_key: pgKey,
    p_fenomeno_asociado: primerFenomenoTocado,
    p_mecanismo_asociado:
      salida.fenomenos_actualizados.flatMap((f) => f.mecanismos)[0]?.hilo ?? null,
    p_alerta_seguridad: salida.alerta_seguridad,
  });

  if (salida.fenomenos_actualizados.length > 0) {
    await svc
      .from("fenomeno_detectado")
      .upsert(upsertsFenomenos(body.diagnostico_id, salida, ahora), {
        onConflict: "diagnostico_id,fenomeno_tipo",
      });
  }

  await svc.from("llamada_ia").insert({
    diagnostico_id: body.diagnostico_id,
    tipo: "turno",
    modelo: meta.modelo,
    prompt_version: meta.prompt_version,
    mapa_indagacion_version: meta.mapa_indagacion_version,
    tokens_in: meta.tokens_in,
    tokens_out: meta.tokens_out,
    latencia_ms: meta.latencia_ms,
  });

  // 8. respuesta
  return NextResponse.json({
    fenomenos_actualizados: salida.fenomenos_actualizados,
    accion: salida.accion,
    fenomeno_siguiente_prioridad: salida.fenomeno_siguiente_prioridad,
    fin_diagnostico: salida.fin_diagnostico,
    sugerencias_pregunta: salida.sugerencias_pregunta,
    alerta_seguridad: salida.alerta_seguridad,
  });
}
