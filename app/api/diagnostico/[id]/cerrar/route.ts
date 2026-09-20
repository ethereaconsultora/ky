/**
 * POST /api/diagnostico/[id]/cerrar — cierre del diagnóstico.
 *
 * Auth → diagnóstico propio (RLS) y `en_curso` → rate limit → estado desde la DB →
 * `ejecutarCierre` (DD-11 + síntesis + motor económico + mensaje) → persistencia.
 *
 * DD-11 / AC-D9: con menos del mínimo de turnos responde 409 `evidencia_insuficiente`,
 * salvo `forzar_sin_diagnostico: true`, que cierra como SIN_EVIDENCIA_SUFICIENTE (sin cifras).
 *
 * Concurrencia: `perdida_economica` (PK = diagnostico_id) hace de cerrojo. Un segundo cierre
 * simultáneo falla en ese primer insert (409) sin tocar nada; sólo quien lo tiene deshace lo suyo.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  filaIntervencion,
  filaPerdidaEconomica,
  filaReversibilidad,
  filasRelaciones,
} from "@/lib/api/cierre-filas";
import { MAPA_INDAGACION_VERSION } from "@/lib/diagnostico/mapa-indagacion.config";
import { FENOMENOS, type FenomenoTipo } from "@/lib/diagnostico/types";
import { ejecutarCierre, type LlamadaCierre } from "@/lib/ia/cierre";
import { promptVersionTurno } from "@/lib/ia/motor-turno";
import { estadoFenomenos, type FilaFenomeno } from "@/lib/ia/persistencia-turno";
import { crearClienteModelo } from "@/lib/ia/proveedor";
import { ErrorIA } from "@/lib/ia/tipos";
import { limiter } from "@/lib/ratelimit";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteServicio } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ forzar_sin_diagnostico: z.boolean().default(false) });

function err(code: string, message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return err("id_invalido", "Id inválido.", 400);

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json().catch(() => ({})));
  } catch {
    return err("body_invalido", "Body inválido.", 400);
  }

  // auth + diagnóstico propio (RLS)
  const sb = await crearClienteServidor();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return err("no_autenticado", "Sesión requerida.", 401);

  const { data: diag } = await sb
    .from("diagnostico")
    .select("id, estado, empresa:empresa_id ( nombre, sector, tamano_n )")
    .eq("id", id)
    .maybeSingle();
  if (!diag) return err("no_encontrado", "Diagnóstico inexistente o ajeno.", 404);
  if (diag.estado !== "en_curso") return err("estado_invalido", `El diagnóstico ya está ${diag.estado}.`, 409);
  const empresa = Array.isArray(diag.empresa) ? diag.empresa[0] : diag.empresa;

  const rl = await limiter("sintesis").limitar(id);
  if (!rl.ok) return err("rate_limit", "Ya se pidió el cierre varias veces. Esperá un rato.", 429);

  // estado desde la DB
  const [{ data: filas }, { data: resp }, { data: eco }] = await Promise.all([
    sb.from("fenomeno_detectado").select("*").eq("diagnostico_id", id),
    sb.from("respuesta_cruda").select("fenomeno_asociado").eq("diagnostico_id", id),
    sb.from("datos_economicos").select("*").eq("diagnostico_id", id).maybeSingle(),
  ]);
  if (!eco) return err("sin_datos_economicos", "Faltan los datos económicos del diagnóstico.", 409);

  const turnos = (resp ?? []).length;
  const porFenomeno: Partial<Record<FenomenoTipo, number>> = {};
  for (const r of resp ?? []) {
    const f = r.fenomeno_asociado as FenomenoTipo | null;
    if (f && FENOMENOS.includes(f)) porFenomeno[f] = (porFenomeno[f] ?? 0) + 1;
  }
  const ejes = [eco.eje_1, eco.eje_2, eco.eje_3];

  // cierre (DD-11 + síntesis + económico)
  let resultado;
  try {
    resultado = await ejecutarCierre(
      {
        turnos,
        fenomenos: estadoFenomenos((filas ?? []) as FilaFenomeno[], porFenomeno),
        datos: {
          n: Number(eco.n_empleados),
          s: Number(eco.s_salario_mensual),
          r: Number(eco.r_rotacion_anual),
          ...(ejes.every((e) => e !== null) ? { ejes: ejes.map(Number) as [number, number, number] } : {}),
        },
        contexto_empresa: { nombre: empresa?.nombre ?? "Empresa", sector: empresa?.sector ?? null, n: empresa?.tamano_n ?? null },
        forzar_sin_diagnostico: body.forzar_sin_diagnostico,
      },
      crearClienteModelo(),
    );
  } catch (e) {
    if (e instanceof ErrorIA) {
      return err(e.code, e.message, e.code === "modelo_no_disponible" ? 502 : 500);
    }
    return err("error_interno", "Fallo al cerrar el diagnóstico.", 500);
  }

  // DD-11: bloqueado
  if (resultado.tipo === "bloqueado") {
    const ev = resultado.evaluacion;
    return err(
      "evidencia_insuficiente",
      `Faltan ${ev.faltan} pregunta(s) para poder emitir un diagnóstico (van ${ev.turnos} de un mínimo de ${ev.minimo}). ` +
        "Podés cerrar igual, pero quedará como «sin evidencia suficiente» y sin cifras.",
      409,
      { turnos: ev.turnos, minimo: ev.minimo, faltan: ev.faltan },
    );
  }

  const svc = crearClienteServicio();
  const versiones = { prompt_version: promptVersionTurno(), mapa_indagacion_version: MAPA_INDAGACION_VERSION };
  const auditar = async (llamadas: LlamadaCierre[]) => {
    if (llamadas.length === 0) return;
    await svc.from("llamada_ia").insert(
      llamadas.map((l) => ({
        diagnostico_id: id,
        tipo: l.tipo,
        modelo: l.uso.modelo,
        ...versiones,
        tokens_in: l.uso.tokens_in,
        tokens_out: l.uso.tokens_out,
        latencia_ms: l.uso.latencia_ms,
      })),
    );
  };
  const cerrarDiagnostico = (campos: Record<string, unknown>) =>
    svc
      .from("diagnostico")
      .update({ estado: "cerrado", fecha_cierre: new Date().toISOString(), ...campos })
      .eq("id", id)
      .eq("estado", "en_curso")
      .select("id");

  // sin diagnóstico: se cierra la sesión, sin síntesis ni cifras
  if (resultado.tipo === "sin_diagnostico") {
    const { data, error } = await cerrarDiagnostico({
      resultado_tipo: resultado.resultado_tipo,
      caso: null,
      mensaje_cierre: resultado.mensaje_cierre,
    });
    if (error || !data?.length) return err("error_db", "No se pudo cerrar el diagnóstico.", 500);
    await auditar(resultado.llamadas);
    return NextResponse.json({ resultado: "sin_diagnostico", resultado_tipo: resultado.resultado_tipo, motivo: resultado.motivo });
  }

  // completo: el insert de perdida_economica es el cerrojo
  const { error: errLock } = await svc.from("perdida_economica").insert(filaPerdidaEconomica(id, resultado.economico));
  if (errLock) {
    if (errLock.code === "23505") return err("cierre_en_curso", "El diagnóstico ya se está cerrando.", 409);
    return err("error_db", "No se pudo guardar la pérdida económica.", 500);
  }

  const deshacer = async () => {
    await svc.from("intervencion_propuesta").delete().eq("diagnostico_id", id);
    await svc.from("relacion_fenomeno").delete().eq("diagnostico_id", id);
    await svc.from("perdida_economica").delete().eq("diagnostico_id", id);
    await svc.from("reversibilidad").delete().eq("diagnostico_id", id);
  };

  try {
    if (resultado.relaciones.length > 0) {
      const { error } = await svc
        .from("relacion_fenomeno")
        .insert(filasRelaciones(id, resultado.relaciones, resultado.punto_accesibilidad));
      if (error) throw error;
    }

    let primeraReversibilidad: string | null = null;
    for (const i of resultado.intervenciones) {
      const { data: rev, error: eRev } = await svc
        .from("reversibilidad")
        .insert(filaReversibilidad(id, i, resultado.caso))
        .select("id")
        .single();
      if (eRev || !rev) throw eRev ?? new Error("reversibilidad");
      primeraReversibilidad ??= rev.id;
      const { error: eInt } = await svc
        .from("intervencion_propuesta")
        .insert(filaIntervencion(id, resultado.caso, i, rev.id));
      if (eInt) throw eInt;
    }

    if (primeraReversibilidad) {
      await svc.from("perdida_economica").update({ reversibilidad_id: primeraReversibilidad }).eq("diagnostico_id", id);
    }
    await svc.from("datos_economicos").update({ factor_friccion_derivado: resultado.economico.factor_friccion }).eq("diagnostico_id", id);

    const { data, error } = await cerrarDiagnostico({
      resultado_tipo: resultado.clasificacion.resultado_tipo,
      caso: resultado.caso,
      mensaje_cierre: resultado.mensaje_cierre,
    });
    if (error || !data?.length) throw error ?? new Error("cierre");
  } catch {
    await deshacer();
    return err("error_db", "No se pudo guardar el diagnóstico. No se cerró; podés reintentar.", 500);
  }

  await auditar(resultado.llamadas);
  return NextResponse.json({
    resultado: "completo",
    resultado_tipo: resultado.clasificacion.resultado_tipo,
    caso: resultado.caso,
    ajustes: resultado.ajustes,
  });
}
