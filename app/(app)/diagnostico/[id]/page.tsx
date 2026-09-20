import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { FENOMENOS_DEF, GUARDARRAILES } from "@/lib/diagnostico/matriz.config";
import { FENOMENOS, type FenomenoTipo } from "@/lib/diagnostico/types";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteServicio } from "@/lib/supabase/service";
import { Conversacion, type ChipFenomeno, type Turno } from "./conversacion";

export const metadata = { title: "Diagnóstico — KY" };

interface FilaFen {
  fenomeno_tipo: FenomenoTipo;
  estado: ChipFenomeno["estado"];
  intensidad: ChipFenomeno["intensidad"];
  confianza: ChipFenomeno["confianza"];
  cond_evidencia: boolean;
  cond_recurrencia: boolean;
  cond_consecuencia: boolean;
  cond_hipotesis: boolean;
}

export default async function DiagnosticoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const sb = await crearClienteServidor();

  // RLS: sólo devuelve el diagnóstico si es del counselor (o admin).
  const { data: diag } = await sb
    .from("diagnostico")
    .select("id, estado, empresa:empresa_id ( nombre, sector )")
    .eq("id", id)
    .maybeSingle();
  if (!diag) notFound();
  const empresa = Array.isArray(diag.empresa) ? diag.empresa[0] : diag.empresa;

  const { data: filas } = await sb.from("fenomeno_detectado").select("*").eq("diagnostico_id", id);
  const porTipo = new Map((filas as FilaFen[] | null)?.map((f) => [f.fenomeno_tipo, f]));

  const chips: ChipFenomeno[] = FENOMENOS.map((f) => {
    const r = porTipo.get(f);
    return {
      fenomeno: f,
      nombre: FENOMENOS_DEF[f].nombre,
      estado: r?.estado ?? "en_observacion",
      intensidad: r?.intensidad ?? null,
      confianza: r?.confianza ?? null,
      condiciones: {
        evidencia: r?.cond_evidencia ?? false,
        recurrencia: r?.cond_recurrencia ?? false,
        consecuencia: r?.cond_consecuencia ?? false,
        hipotesis: r?.cond_hipotesis ?? false,
      },
    };
  });

  // Historial descifrado (server-side; el diagnóstico ya se validó como del counselor por RLS).
  let historial: Turno[] = [];
  const pgKey = process.env.EC_PGCRYPTO_KEY;
  if (pgKey) {
    const { data } = await crearClienteServicio().rpc("leer_respuestas_crudas", {
      p_diagnostico_id: id,
      p_key: pgKey,
    });
    historial = ((data ?? []) as Array<{ pregunta_texto: string; contenido: string | null; alerta_seguridad: boolean }>).map(
      (r) => ({
        pregunta: r.pregunta_texto,
        respuesta: r.alerta_seguridad ? null : r.contenido,
      }),
    );
  }

  return (
    <main className="ky-page">
      <Link href="/" className="ky-muted" style={{ textDecoration: "none" }}>
        ← Mis diagnósticos
      </Link>
      <div style={{ margin: "10px 0 20px" }}>
        <div className="ky-h" style={{ fontSize: 28 }}>{empresa?.nombre ?? "Diagnóstico"}</div>
        <p className="ky-muted">{empresa?.sector ?? "Sin sector"} · modo notas manuales</p>
      </div>

      {diag.estado !== "en_curso" && (
        <p className="ky-card ky-muted" style={{ marginBottom: 16 }}>
          Este diagnóstico está {diag.estado}: sólo lectura.{" "}
          {diag.estado === "cerrado" && (
            <Link href={`/diagnostico/${id}/resultado`} style={{ color: "var(--ac)" }}>
              Ver el resultado →
            </Link>
          )}
        </p>
      )}

      <Conversacion
        diagnosticoId={id}
        soloLectura={diag.estado !== "en_curso"}
        minimo={GUARDARRAILES.min_turnos_diagnostico}
        historialInicial={historial}
        chipsIniciales={chips}
      />
    </main>
  );
}
