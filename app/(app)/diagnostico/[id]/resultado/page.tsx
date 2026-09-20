import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import {
  ETIQUETA_HORIZONTE,
  ETIQUETA_INDICADOR,
  ETIQUETA_PLAZO,
  fmtMoneda,
  fmtPorcentaje,
  fmtRangoMoneda,
  fmtRangoPorcentaje,
  fmtRangoRoi,
} from "@/lib/api/formato";
import { FENOMENOS_DEF, GUARDARRAILES } from "@/lib/diagnostico/matriz.config";
import type { FenomenoTipo } from "@/lib/diagnostico/types";
import { crearClienteServidor } from "@/lib/supabase/server";

export const metadata = { title: "Resultado — KY" };

const nombre = (f: string) => FENOMENOS_DEF[f as FenomenoTipo]?.nombre ?? f;

const TITULO_CASO: Record<number, string> = {
  1: "Un fenómeno domina",
  2: "Dos frentes independientes",
  3: "Posible circuito (hipótesis)",
  4: "Circuito confirmado",
};

const SIMBOLO_RELACION: Record<string, string> = {
  A_B: "→",
  B_A: "←",
  A_HIP_B: "↔",
  A_CONF_B: "⇄",
  A_PERP_B: "⊥",
  A_ABIERTO_B: "?",
};

const ETIQUETA_RESULTADO: Record<string, string> = {
  DOMINANTE_CONFIRMED: "Fenómeno dominante confirmado",
  DOMINANTE_AMBIGUOUS: "Más de una señal relevante",
  DOMINANTE_DEBIL: "Señal presente, todavía floja",
  SIN_EVIDENCIA_SUFICIENTE: "Sin evidencia suficiente",
};

interface Rev {
  id: string;
  grado_temprano: number;
  grado_tardio: number;
  plazo_aparicion_efecto: string;
  justificacion: string;
}

function Nodo({ children, fuerte }: { children: React.ReactNode; fuerte?: boolean }) {
  return (
    <div
      style={{
        border: `1px solid ${fuerte ? "var(--ac)" : "var(--border-strong)"}`,
        background: "var(--g2)",
        borderRadius: "var(--radius-lg)",
        padding: "12px 16px",
        fontSize: 14,
        textAlign: "center",
        minWidth: 130,
      }}
    >
      {children}
    </div>
  );
}

export default async function ResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sb = await crearClienteServidor();

  const { data: diag } = await sb
    .from("diagnostico")
    .select("id, estado, resultado_tipo, caso, mensaje_cierre, fecha_cierre, empresa:empresa_id ( nombre, sector )")
    .eq("id", id)
    .maybeSingle();
  if (!diag) notFound();
  if (diag.estado === "en_curso") redirect(`/diagnostico/${id}`);
  const empresa = Array.isArray(diag.empresa) ? diag.empresa[0] : diag.empresa;

  const [{ data: eco }, { data: perdida }, { data: fens }, { data: rels }, { data: ints }, { data: revs }, { count: turnos }] =
    await Promise.all([
      sb.from("datos_economicos").select("*").eq("diagnostico_id", id).maybeSingle(),
      sb.from("perdida_economica").select("*").eq("diagnostico_id", id).maybeSingle(),
      sb.from("fenomeno_detectado").select("*").eq("diagnostico_id", id).eq("estado", "confirmado"),
      sb.from("relacion_fenomeno").select("*").eq("diagnostico_id", id),
      sb.from("intervencion_propuesta").select("*").eq("diagnostico_id", id),
      sb.from("reversibilidad").select("*").eq("diagnostico_id", id),
      sb.from("respuesta_cruda").select("*", { count: "exact", head: true }).eq("diagnostico_id", id),
    ]);

  const revPorId = new Map(((revs ?? []) as Rev[]).map((r) => [r.id, r]));
  const caso = diag.caso as number | null;
  const sinEvidencia = diag.resultado_tipo === "SIN_EVIDENCIA_SUFICIENTE" || !perdida;
  const relacion = rels?.[0];
  const puntoAccesibilidad = relacion?.punto_accesibilidad_sugerido as string | null | undefined;

  return (
    <main className="ky-page" style={{ maxWidth: 900 }}>
      <Link href="/" className="ky-muted" style={{ textDecoration: "none" }}>
        ← Mis diagnósticos
      </Link>
      <div style={{ margin: "10px 0 6px" }}>
        <div className="ky-h" style={{ fontSize: 30 }}>{empresa?.nombre ?? "Diagnóstico"}</div>
        <p className="ky-muted">
          {empresa?.sector ?? "Sin sector"} · cerrado con {turnos ?? 0} preguntas ·{" "}
          {ETIQUETA_RESULTADO[diag.resultado_tipo ?? ""] ?? diag.resultado_tipo}
        </p>
      </div>

      {/* ── mensaje de cierre ── */}
      {diag.mensaje_cierre && (
        <div className="ky-card" style={{ margin: "16px 0", borderColor: "var(--border-strong)" }}>
          <span className="ky-label">Mensaje de cierre (para la empresa)</span>
          <p className="ky-h" style={{ fontSize: 22, fontStyle: "italic", lineHeight: 1.45 }}>
            {diag.mensaje_cierre}
          </p>
        </div>
      )}

      {/* ── modo SIN EVIDENCIA: honesto, sin cifras ── */}
      {sinEvidencia && (
        <div className="ky-card" style={{ marginTop: 16 }}>
          <span className="ky-label">Sin evidencia suficiente</span>
          <p style={{ fontSize: 15, lineHeight: 1.6 }}>
            Con esta conversación no alcanza para afirmar qué está pasando, así que la app no emite
            conclusiones ni cifras. {(turnos ?? 0) < GUARDARRAILES.min_turnos_diagnostico
              ? `Se cerró con ${turnos ?? 0} preguntas; el mínimo para diagnosticar es ${GUARDARRAILES.min_turnos_diagnostico}.`
              : "No hubo fenómenos con evidencia suficiente."}
          </p>
          <p className="ky-muted" style={{ marginTop: 8 }}>
            Es un resultado válido: es preferible no diagnosticar a diagnosticar sin fundamento.
          </p>
        </div>
      )}

      {!sinEvidencia && perdida && (
        <>
          {/* ── relación entre fenómenos ── */}
          <div className="ky-card" style={{ marginTop: 16 }}>
            <span className="ky-label">Cómo se relacionan · {caso ? TITULO_CASO[caso] : ""}</span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap", padding: "10px 0" }}>
              {caso === 1 || !relacion ? (
                (fens ?? []).slice(0, 1).map((f) => <Nodo key={f.id} fuerte>{nombre(f.fenomeno_tipo)}</Nodo>)
              ) : (
                <>
                  <Nodo fuerte>{nombre(relacion.fenomeno_a)}</Nodo>
                  <span className="ky-h" style={{ fontSize: 30, color: "var(--ac)" }}>
                    {SIMBOLO_RELACION[relacion.tipo_relacion] ?? "?"}
                  </span>
                  <Nodo fuerte>{nombre(relacion.fenomeno_b)}</Nodo>
                </>
              )}
            </div>
            {relacion?.evidencia_soporte && <p className="ky-muted">{relacion.evidencia_soporte}</p>}
            {caso !== null && caso >= 3 && puntoAccesibilidad && (
              <p style={{ marginTop: 10, fontSize: 14 }}>
                <span className="ky-label" style={{ display: "inline", marginRight: 8 }}>Punto de accesibilidad</span>
                {puntoAccesibilidad}
              </p>
            )}
            {caso === 3 && (
              <p className="ky-muted" style={{ marginTop: 8 }}>
                Es una hipótesis: si el efecto esperado no aparece en el plazo, el circuito no era tal.
              </p>
            )}
          </div>

          {/* ── capa 1: lo que SABEMOS ── */}
          <div className="ky-card" style={{ marginTop: 16 }}>
            <span className="ky-label">Lo que sabemos</span>
            <p className="ky-muted" style={{ marginBottom: 12 }}>
              Afirmaciones respaldadas por lo que se dijo en la entrevista, y los datos que cargaste.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(fens ?? []).map((f) => (
                <div key={f.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <div style={{ fontSize: 16 }}>{nombre(f.fenomeno_tipo)}</div>
                  <div className="ky-muted">
                    intensidad {f.intensidad ?? "—"} · confianza {f.confianza ?? "—"}
                    {f.indicador_economico ? ` · afecta ${ETIQUETA_INDICADOR[f.indicador_economico] ?? f.indicador_economico}` : ""}
                  </div>
                  {f.mecanismo_organizacional && (
                    <p style={{ fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>
                      <strong style={{ fontWeight: 500 }}>Mecanismo:</strong> {f.mecanismo_organizacional}
                    </p>
                  )}
                  {f.consecuencia_operativa && (
                    <p style={{ fontSize: 14, marginTop: 4, lineHeight: 1.55 }}>
                      <strong style={{ fontWeight: 500 }}>Consecuencia:</strong> {f.consecuencia_operativa}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {eco && (
              <p className="ky-muted" style={{ marginTop: 14 }}>
                Empresa: {Number(eco.n_empleados).toLocaleString("es-AR")} personas · salario promedio{" "}
                {fmtMoneda(Number(eco.s_salario_mensual))} · rotación anual {fmtPorcentaje(Number(eco.r_rotacion_anual))}
              </p>
            )}
          </div>

          {/* ── capa 2: lo que ESTIMAMOS ── */}
          <div className="ky-card" style={{ marginTop: 16 }}>
            <span className="ky-label">Lo que estimamos · pérdida anual</span>
            <div className="ky-grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              <div><div className="ky-muted">Presentismo</div><div className="ky-h" style={{ fontSize: 24 }}>{fmtMoneda(Number(perdida.presentismo))}</div></div>
              <div><div className="ky-muted">Rotación</div><div className="ky-h" style={{ fontSize: 24 }}>{fmtMoneda(Number(perdida.rotacion))}</div></div>
              <div><div className="ky-muted">Total estimado</div><div className="ky-h" style={{ fontSize: 24, color: "var(--ac)" }}>{fmtMoneda(Number(perdida.perdida_total))}</div></div>
            </div>
            <p className="ky-muted" style={{ marginTop: 10 }}>
              Cálculo a partir de N, S y R y del factor de fricción
              {eco?.factor_friccion_derivado ? ` (${Number(eco.factor_friccion_derivado).toFixed(2)}, derivado de los fenómenos confirmados)` : ""}.
            </p>
          </div>

          {/* ── capa 3: lo que PROYECTAMOS (rango, sin validar) ── */}
          <div className="ky-card" style={{ marginTop: 16, borderStyle: "dashed", borderColor: "var(--border-strong)" }}>
            <span className="ky-label">Lo que proyectamos · sin validar</span>
            <div className="ky-grid-2">
              <div>
                <div className="ky-muted">Reducción posible de la pérdida</div>
                <div className="ky-h" style={{ fontSize: 24 }}>
                  {perdida.reduccion_ajustada_min != null && perdida.reduccion_ajustada_max != null
                    ? fmtRangoMoneda(Number(perdida.reduccion_ajustada_min), Number(perdida.reduccion_ajustada_max))
                    : "—"}
                </div>
              </div>
              <div>
                <div className="ky-muted">Retorno sobre la intervención</div>
                <div className="ky-h" style={{ fontSize: 24 }}>
                  {perdida.roi_min != null && perdida.roi_max != null
                    ? fmtRangoRoi(Number(perdida.roi_min), Number(perdida.roi_max))
                    : "—"}
                </div>
              </div>
            </div>
            <p className="ky-muted" style={{ marginTop: 10 }}>
              Es una proyección con rango, no una promesa: depende de que la intervención se implemente
              y se sostenga. Horizonte: {ETIQUETA_HORIZONTE[perdida.horizonte_proyeccion ?? "12m"] ?? perdida.horizonte_proyeccion}.
            </p>
          </div>

          {/* ── intervención propuesta ── */}
          <div className="ky-card" style={{ marginTop: 16 }}>
            <span className="ky-label">
              Intervención propuesta · {ints && ints.length > 1 ? `${ints.length} frentes` : caso !== null && caso >= 3 ? "punto de accesibilidad" : "1 frente"}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(ints ?? []).map((i) => {
                const rev = i.reversibilidad_id ? revPorId.get(i.reversibilidad_id) : undefined;
                return (
                  <div key={i.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    <div className="ky-muted">{(i.fenomenos_objetivo as string[]).map(nombre).join(" + ")}</div>
                    <p style={{ fontSize: 16, lineHeight: 1.55, margin: "4px 0 8px" }}>{i.descripcion}</p>
                    <p style={{ fontSize: 14, lineHeight: 1.55 }}>
                      <strong style={{ fontWeight: 500 }}>Qué cambia para las personas:</strong> {i.traduccion_humana}
                    </p>
                    {rev && (
                      <p className="ky-muted" style={{ marginTop: 8 }}>
                        Reversibilidad estimada: {fmtRangoPorcentaje(Number(rev.grado_temprano), Number(rev.grado_tardio))} (a 6 y a 24 meses) ·{" "}
                        {ETIQUETA_PLAZO[rev.plazo_aparicion_efecto] ?? rev.plazo_aparicion_efecto}. {rev.justificacion}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="ky-muted" style={{ marginTop: 14 }}>
              Estado: borrador — pendiente de la revisión y aprobación del Counselor.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
