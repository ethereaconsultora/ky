import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { estadoEntrega } from "@/lib/api/entrega";
import {
  ETIQUETA_HORIZONTE,
  ETIQUETA_INDICADOR,
  ETIQUETA_PLAZO,
  fmtMoneda,
  fmtRangoMoneda,
  fmtRangoPorcentaje,
  fmtRangoRoi,
} from "@/lib/api/formato";
import { FENOMENOS_DEF } from "@/lib/diagnostico/matriz.config";
import type { FenomenoTipo } from "@/lib/diagnostico/types";
import { crearClienteServidor } from "@/lib/supabase/server";
import { BotonImprimir } from "./boton-imprimir";

export const metadata = { title: "Informe — KY" };

const nombre = (f: string) => FENOMENOS_DEF[f as FenomenoTipo]?.nombre ?? f;

interface Rev {
  id: string;
  grado_temprano: number;
  grado_tardio: number;
  plazo_aparicion_efecto: string;
}

/**
 * Informe para la empresa. Papel claro, imprimible (PDF desde el navegador).
 * NO incluye la evidencia cruda ni los hilos con resúmenes de lo que dijo el entrevistado:
 * sólo afirmaciones generales, cifras estimadas y la propuesta que el Counselor aprobó.
 */
export default async function InformePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sb = await crearClienteServidor();

  const { data: diag } = await sb
    .from("diagnostico")
    .select("id, estado, resultado_tipo, mensaje_cierre, fecha_cierre, empresa:empresa_id ( nombre, sector )")
    .eq("id", id)
    .maybeSingle();
  if (!diag) notFound();
  if (diag.estado === "en_curso") redirect(`/diagnostico/${id}`);
  const empresa = Array.isArray(diag.empresa) ? diag.empresa[0] : diag.empresa;

  const [{ data: eco }, { data: perdida }, { data: fens }, { data: ints }, { data: revs }] = await Promise.all([
    sb.from("datos_economicos").select("*").eq("diagnostico_id", id).maybeSingle(),
    sb.from("perdida_economica").select("*").eq("diagnostico_id", id).maybeSingle(),
    sb.from("fenomeno_detectado").select("*").eq("diagnostico_id", id).eq("estado", "confirmado"),
    sb.from("intervencion_propuesta").select("*").eq("diagnostico_id", id),
    sb.from("reversibilidad").select("*").eq("diagnostico_id", id),
  ]);

  const estado = estadoEntrega(ints ?? []);
  const aprobado = estado === "aprobada" || estado === "enviada";
  const sinEvidencia = diag.resultado_tipo === "SIN_EVIDENCIA_SUFICIENTE" || !perdida;
  const revPorId = new Map(((revs ?? []) as Rev[]).map((r) => [r.id, r]));
  const fecha = new Date(diag.fecha_cierre ?? Date.now()).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="ky-page" style={{ maxWidth: 900 }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Link href={`/diagnostico/${id}/resultado`} className="ky-muted" style={{ textDecoration: "none" }}>
          ← Volver al resultado
        </Link>
        <BotonImprimir />
      </div>

      <article className="ky-informe">
        {!aprobado && !sinEvidencia && (
          <div className="borrador">
            <strong>BORRADOR.</strong> La propuesta todavía no fue aprobada por el Counselor. No entregar a la empresa.
          </div>
        )}

        <div className="sub">Espacio Crítico · Diagnóstico organizacional</div>
        <h1>{empresa?.nombre ?? "Informe"}</h1>
        <div className="sub">
          {empresa?.sector ? `${empresa.sector} · ` : ""}
          {fecha}
        </div>

        {diag.mensaje_cierre && (
          <p style={{ fontFamily: "var(--font-display)", fontSize: 21, fontStyle: "italic", margin: "26px 0 4px", lineHeight: 1.5 }}>
            {diag.mensaje_cierre}
          </p>
        )}

        {sinEvidencia ? (
          <>
            <h2>Alcance de esta conversación</h2>
            <p>
              Con la conversación mantenida no hubo evidencia suficiente para afirmar qué está ocurriendo, por eso
              este informe no incluye conclusiones ni cifras. Es preferible no diagnosticar a hacerlo sin fundamento;
              el paso siguiente es profundizar con más conversaciones.
            </p>
          </>
        ) : (
          <>
            <h2>Qué encontramos</h2>
            {(fens ?? []).map((f) => (
              <div key={f.id} className="caja">
                <strong>{nombre(f.fenomeno_tipo)}</strong>
                {f.mecanismo_organizacional && <p style={{ marginTop: 4 }}>{f.mecanismo_organizacional}</p>}
                {f.consecuencia_operativa && (
                  <p style={{ marginTop: 4 }}>
                    <em>Consecuencia:</em> {f.consecuencia_operativa}
                    {f.indicador_economico ? ` (impacta en ${ETIQUETA_INDICADOR[f.indicador_economico] ?? f.indicador_economico}).` : ""}
                  </p>
                )}
              </div>
            ))}

            {perdida && (
              <>
                <h2>Qué nos está costando (estimación anual)</h2>
                <div className="caja">
                  <div>
                    Presentismo: <span className="cifra">{fmtMoneda(Number(perdida.presentismo))}</span>
                  </div>
                  <div>
                    Rotación: <span className="cifra">{fmtMoneda(Number(perdida.rotacion))}</span>
                  </div>
                  <div>
                    Total estimado:{" "}
                    <span className="cifra">
                      <strong>{fmtMoneda(Number(perdida.perdida_total))}</strong>
                    </span>
                  </div>
                  <div className="nota">
                    Estimación calculada con los datos informados por la empresa
                    {eco
                      ? ` (${Number(eco.n_empleados).toLocaleString("es-AR")} personas, salario promedio ${fmtMoneda(Number(eco.s_salario_mensual))})`
                      : ""}
                    .
                  </div>
                </div>

                <h2>Qué podría mejorar (proyección, sin validar)</h2>
                <div className="caja proy">
                  {perdida.reduccion_ajustada_min != null && perdida.reduccion_ajustada_max != null && (
                    <div>
                      Reducción posible de esa pérdida:{" "}
                      <span className="cifra">
                        {fmtRangoMoneda(Number(perdida.reduccion_ajustada_min), Number(perdida.reduccion_ajustada_max))}
                      </span>
                    </div>
                  )}
                  {perdida.roi_min != null && perdida.roi_max != null && (
                    <div>
                      Retorno sobre la intervención:{" "}
                      <span className="cifra">{fmtRangoRoi(Number(perdida.roi_min), Number(perdida.roi_max))}</span>
                    </div>
                  )}
                  <div className="nota">
                    Es una proyección con rango, no una promesa: depende de que la intervención se implemente y se
                    sostenga. Horizonte: {ETIQUETA_HORIZONTE[perdida.horizonte_proyeccion ?? "12m"] ?? perdida.horizonte_proyeccion}.
                  </div>
                </div>
              </>
            )}

            <h2>Qué proponemos</h2>
            {(ints ?? []).map((i) => {
              const rev = i.reversibilidad_id ? revPorId.get(i.reversibilidad_id) : undefined;
              return (
                <div key={i.id} className="caja">
                  <strong>{(i.fenomenos_objetivo as string[]).map(nombre).join(" + ")}</strong>
                  <p style={{ marginTop: 4 }}>{i.descripcion}</p>
                  <p style={{ marginTop: 4 }}>
                    <em>Qué cambia para las personas:</em> {i.traduccion_humana}
                  </p>
                  {rev && (
                    <div className="nota">
                      Reversibilidad estimada: {fmtRangoPorcentaje(Number(rev.grado_temprano), Number(rev.grado_tardio))} ·{" "}
                      {ETIQUETA_PLAZO[rev.plazo_aparicion_efecto] ?? rev.plazo_aparicion_efecto}.
                    </div>
                  )}
                </div>
              );
            })}

            <h2>Cómo leer este informe</h2>
            <p className="nota" style={{ fontSize: 13 }}>
              Los hallazgos surgen de una conversación con una persona de la organización y describen patrones, no
              juicios sobre personas. Las cifras son estimaciones a partir de datos informados por la empresa; las
              proyecciones son rangos sin validar. Este informe es un punto de partida para decidir, no un veredicto.
            </p>
          </>
        )}
      </article>
    </main>
  );
}
