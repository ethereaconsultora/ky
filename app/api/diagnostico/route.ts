/**
 * POST /api/diagnostico — alta de un diagnóstico (Versión B).
 *
 * Auth (getUser) → valida el body → crea/reusa la empresa → crea el diagnóstico `en_curso`
 * + datos_economicos (+ consentimiento si hay audio). Las escrituras las hace el service role
 * porque la RLS de `empresa` no deja leer la fila recién creada hasta que exista un
 * diagnóstico propio; el dueño (`counselor_id`) sale SIEMPRE de la sesión, nunca del body.
 * Si algo falla a mitad de camino se deshace lo creado (no quedan diagnósticos a medias).
 */

import { NextResponse } from "next/server";
import { esUsuarioActivo } from "@/lib/auth/activo";
import { z } from "zod";
import {
  AltaDiagnosticoBody,
  filaConsentimiento,
  filaDatosEconomicos,
  filaDiagnostico,
  filaEmpresa,
} from "@/lib/api/alta-diagnostico";
import { MAPA_INDAGACION_VERSION } from "@/lib/diagnostico/mapa-indagacion.config";
import { promptVersionTurno } from "@/lib/ia/motor-turno";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteServicio } from "@/lib/supabase/service";

export const runtime = "nodejs";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: Request) {
  // 1. body
  let body: z.infer<typeof AltaDiagnosticoBody>;
  try {
    body = AltaDiagnosticoBody.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return err("body_invalido", e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join(" · "), 400);
    }
    return err("body_invalido", "JSON inválido", 400);
  }

  // 2. auth
  const sb = await crearClienteServidor();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return err("no_autenticado", "Sesión requerida.", 401);
  if (!esUsuarioActivo(auth.user)) return err("cuenta_no_habilitada", "Tu cuenta todavía no está habilitada.", 403);
  const counselorId = auth.user.id;

  const svc = crearClienteServicio();

  // 3. el counselor debe tener perfil (FK diagnostico.counselor_id → users)
  const { data: perfil } = await svc.from("users").select("id").eq("id", counselorId).maybeSingle();
  if (!perfil) {
    return err("sin_perfil", "Tu usuario todavía no tiene perfil en la app. Pedile a un admin que lo revise.", 409);
  }

  // 4. empresa: reusar (sólo si es del counselor, vía RLS) o crear
  let empresaId: string;
  let empresaCreada = false;
  if (body.empresa.id) {
    const { data: existente } = await sb.from("empresa").select("id").eq("id", body.empresa.id).maybeSingle();
    if (!existente) return err("empresa_no_encontrada", "Empresa inexistente o ajena.", 404);
    empresaId = existente.id;
  } else {
    const { data: nueva, error } = await svc.from("empresa").insert(filaEmpresa(body)).select("id").single();
    if (error || !nueva) return err("error_db", "No se pudo crear la empresa.", 500);
    empresaId = nueva.id;
    empresaCreada = true;
  }

  const deshacer = async (diagnosticoId?: string) => {
    if (diagnosticoId) await svc.from("diagnostico").delete().eq("id", diagnosticoId); // cascada
    if (empresaCreada) await svc.from("empresa").delete().eq("id", empresaId);
  };

  // 5. consentimiento: el texto debe existir y estar vigente
  if (body.consentimiento) {
    const { data: texto } = await svc
      .from("consentimiento_textos")
      .select("id, vigente_hasta")
      .eq("id", body.consentimiento.texto_id)
      .maybeSingle();
    const vigente = texto && (!texto.vigente_hasta || new Date(texto.vigente_hasta) > new Date());
    if (!vigente) {
      await deshacer();
      return err("consentimiento_invalido", "El texto de consentimiento no existe o ya no está vigente.", 400);
    }
  }

  // 6. diagnóstico
  const { data: diag, error: errDiag } = await svc
    .from("diagnostico")
    .insert(
      filaDiagnostico(body, empresaId, counselorId, {
        prompt_version: promptVersionTurno(),
        mapa_indagacion_version: MAPA_INDAGACION_VERSION,
      }),
    )
    .select("id")
    .single();
  if (errDiag || !diag) {
    await deshacer();
    return err("error_db", "No se pudo crear el diagnóstico.", 500);
  }

  // 7. datos económicos + consentimiento
  const { error: errEco } = await svc.from("datos_economicos").insert(filaDatosEconomicos(body, diag.id));
  const filaCons = filaConsentimiento(body, diag.id);
  const { error: errCons } = filaCons ? await svc.from("consentimiento").insert(filaCons) : { error: null };
  if (errEco || errCons) {
    await deshacer(diag.id);
    return err("error_db", "No se pudieron guardar los datos del diagnóstico.", 500);
  }

  return NextResponse.json({ diagnostico_id: diag.id, empresa_id: empresaId }, { status: 201 });
}
