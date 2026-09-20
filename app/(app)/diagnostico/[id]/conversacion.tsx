"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type EstadoFen = "confirmado" | "en_observacion" | "descartado";

export interface ChipFenomeno {
  fenomeno: string;
  nombre: string;
  estado: EstadoFen;
  intensidad: string | null;
  confianza: string | null;
  condiciones: { evidencia: boolean; recurrencia: boolean; consecuencia: boolean; hipotesis: boolean };
}

export interface Turno {
  pregunta: string;
  respuesta: string | null;
}

interface Progreso {
  turnos: number;
  minimo: number;
  faltan: number;
  puede_concluir: boolean;
}

interface RespuestaTurno {
  fenomenos_actualizados: Array<{
    fenomeno: string;
    estado: EstadoFen;
    intensidad: string | null;
    confianza: string | null;
    condiciones: ChipFenomeno["condiciones"];
  }>;
  sugerencias_pregunta: string[];
  alerta_seguridad: boolean;
  fin_diagnostico: boolean;
  progreso: Progreso;
  avisos: string[];
}

const TIPOS = [
  ["deteccion", "Detección"],
  ["evidencia", "Evidencia"],
  ["consecuencia", "Consecuencia"],
  ["confirmacion", "Confirmación"],
  ["puente", "Puente"],
] as const;

const CONDICIONES: Array<[keyof ChipFenomeno["condiciones"], string]> = [
  ["evidencia", "Evidencia"],
  ["recurrencia", "Recurrencia"],
  ["consecuencia", "Consecuencia"],
  ["hipotesis", "Hipótesis"],
];

const ETIQUETA_ESTADO: Record<EstadoFen, string> = {
  confirmado: "Confirmado",
  en_observacion: "En observación",
  descartado: "Descartado",
};

export function Conversacion(props: {
  diagnosticoId: string;
  soloLectura: boolean;
  minimo: number;
  historialInicial: Turno[];
  chipsIniciales: ChipFenomeno[];
}) {
  const [historial, setHistorial] = useState<Turno[]>(props.historialInicial);
  const [chips, setChips] = useState<ChipFenomeno[]>(props.chipsIniciales);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [alerta, setAlerta] = useState(false);
  const [finSugerido, setFinSugerido] = useState(false);
  const [turnos, setTurnos] = useState(props.historialInicial.length);

  const [pregunta, setPregunta] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number][0]>("evidencia");
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // cierre del diagnóstico
  const [cierre, setCierre] = useState<"idle" | "confirmando" | "procesando">("idle");
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  const pct = Math.min(100, Math.round((turnos / props.minimo) * 100));
  const puedeConcluir = turnos >= props.minimo;

  async function analizar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!respuesta.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnostico_id: props.diagnosticoId,
          respuesta_texto: respuesta,
          tipo_pregunta: tipo,
          pregunta_texto: pregunta,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 429
            ? "Procesando el turno anterior — esperá unos segundos y probá de nuevo."
            : json?.error?.message ?? "No se pudo analizar la respuesta.",
        );
        return;
      }
      const r = json as RespuestaTurno;
      setHistorial((h) => [...h, { pregunta, respuesta: r.alerta_seguridad ? null : respuesta }]);
      setChips((prev) =>
        prev.map((c) => {
          const u = r.fenomenos_actualizados.find((x) => x.fenomeno === c.fenomeno);
          return u
            ? { ...c, estado: u.estado, intensidad: u.intensidad, confianza: u.confianza, condiciones: u.condiciones }
            : c;
        }),
      );
      setSugerencias(r.sugerencias_pregunta);
      setAvisos(r.avisos);
      setAlerta(r.alerta_seguridad);
      setFinSugerido(r.fin_diagnostico);
      setTurnos(r.progreso.turnos);
      setRespuesta("");
      setPregunta("");
    } catch {
      setError("No hay conexión con el servidor. Tu respuesta sigue en el cuadro; probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function cerrar() {
    setCierre("procesando");
    setErrorCierre(null);
    try {
      const res = await fetch(`/api/diagnostico/${props.diagnosticoId}/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Bajo el mínimo de preguntas sólo se puede cerrar SIN diagnóstico (DD-11).
        body: JSON.stringify({ forzar_sin_diagnostico: !puedeConcluir }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorCierre(json?.error?.message ?? "No se pudo cerrar el diagnóstico.");
        setCierre("confirmando");
        return;
      }
      router.push(`/diagnostico/${props.diagnosticoId}/resultado`);
    } catch {
      setErrorCierre("No hay conexión con el servidor. Probá de nuevo.");
      setCierre("confirmando");
    }
  }

  return (
    <div className="ky-grid-conv">
      {/* ── Columna izquierda: conversación ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        {alerta && (
          <div className="ky-card" style={{ borderColor: "var(--warn)", color: "var(--warn)", fontSize: 14 }}>
            El entrevistado mencionó algo que puede requerir atención. Revisá antes de seguir.
          </div>
        )}

        {historial.length > 0 && (
          <div className="ky-card" style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: 340, overflowY: "auto" }}>
            <span className="ky-label" style={{ marginBottom: 0 }}>Hasta ahora</span>
            {historial.map((t, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {t.pregunta && <div className="ky-muted">— {t.pregunta}</div>}
                <div style={{ fontSize: 14, lineHeight: 1.55 }}>
                  {t.respuesta ?? <em className="ky-muted">(fragmento sensible no guardado en claro)</em>}
                </div>
              </div>
            ))}
          </div>
        )}

        {!props.soloLectura && (
          <form onSubmit={analizar} className="ky-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="ky-grid-2">
              <div>
                <label className="ky-label" htmlFor="pregunta">Qué le preguntaste</label>
                <input id="pregunta" className="ky-input" value={pregunta} onChange={(e) => setPregunta(e.target.value)} placeholder="(opcional) tocá una sugerencia para completarla" />
              </div>
              <div>
                <label className="ky-label" htmlFor="tipo">Tipo de pregunta</label>
                <select id="tipo" className="ky-select" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                  {TIPOS.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="ky-label" htmlFor="respuesta">Respuesta del entrevistado</label>
              <textarea
                id="respuesta"
                ref={areaRef}
                className="ky-textarea"
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                placeholder="Escribí o pegá lo que dijo, lo más textual posible."
              />
            </div>
            {error && <p style={{ color: "var(--err)", fontSize: 14 }}>{error}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" className="ky-btn" disabled={enviando || !respuesta.trim()}>
                {enviando ? "Registrando esto…" : "Respuesta lista → analizar"}
              </button>
              <span className="ky-muted">Pregunta {turnos + 1}</span>
            </div>
          </form>
        )}

        {sugerencias.length > 0 && (
          <div className="ky-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="ky-label" style={{ marginBottom: 0 }}>Para seguir</span>
            {sugerencias.map((s, i) => (
              <button
                key={i}
                type="button"
                className="ky-pill"
                onClick={() => {
                  setPregunta(s);
                  areaRef.current?.focus();
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Columna derecha: Mapa EC en construcción ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="ky-card">
          <span className="ky-label">Avance</span>
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            {puedeConcluir
              ? `${turnos} preguntas — ya se puede concluir`
              : `${turnos} de un mínimo de ${props.minimo} preguntas para poder concluir`}
          </div>
          <div style={{ height: 6, background: "var(--g3)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: puedeConcluir ? "var(--ok)" : "var(--ac)", transition: "width .3s" }} />
          </div>
          {finSugerido && puedeConcluir && (
            <p className="ky-muted" style={{ marginTop: 10, color: "var(--ac)" }}>
              El motor no encuentra más señales por indagar. ¿Cerramos? (el cierre llega en la próxima versión)
            </p>
          )}
          {avisos.map((a, i) => (
            <p key={i} className="ky-muted" style={{ marginTop: 8, color: "var(--warn)" }}>{a}</p>
          ))}
        </div>

        <div className="ky-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="ky-label" style={{ marginBottom: 0 }}>Mapa EC en construcción</span>
          {chips.map((c) => (
            <div key={c.fenomeno} style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontSize: 14 }}>{c.nombre}</span>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: c.estado === "confirmado" ? "var(--ok)" : "var(--t2)",
                  }}
                >
                  {ETIQUETA_ESTADO[c.estado]}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {CONDICIONES.map(([k, l]) => (
                  <span
                    key={k}
                    title={l}
                    style={{
                      fontSize: 10,
                      padding: "2px 7px",
                      borderRadius: 10,
                      border: `1px solid ${c.condiciones[k] ? "var(--ac)" : "var(--border)"}`,
                      color: c.condiciones[k] ? "var(--ac)" : "var(--t2)",
                    }}
                  >
                    {l}
                  </span>
                ))}
              </div>
              {c.estado === "confirmado" && (
                <div className="ky-muted" style={{ marginTop: 6 }}>
                  intensidad {c.intensidad ?? "—"} · confianza {c.confianza ?? "—"}
                </div>
              )}
            </div>
          ))}
        </div>

        {!props.soloLectura && (
          <div className="ky-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cierre === "idle" && (
              <button type="button" className="ky-btn-ghost" onClick={() => setCierre("confirmando")}>
                Cerrar diagnóstico
              </button>
            )}
            {cierre !== "idle" && (
              <>
                <p style={{ fontSize: 14, lineHeight: 1.55 }}>
                  {puedeConcluir
                    ? "Se va a generar el diagnóstico: relaciones entre fenómenos, pérdida estimada e intervención propuesta. Tarda unos segundos."
                    : `Van ${turnos} de un mínimo de ${props.minimo} preguntas: todavía no se puede emitir un diagnóstico. Podés cerrar igual, pero quedará como «sin evidencia suficiente», sin conclusiones ni cifras.`}
                </p>
                {errorCierre && <p style={{ color: "var(--err)", fontSize: 13 }}>{errorCierre}</p>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="ky-btn" disabled={cierre === "procesando"} onClick={cerrar}>
                    {cierre === "procesando"
                      ? "Generando el diagnóstico…"
                      : puedeConcluir
                        ? "Sí, cerrar y diagnosticar"
                        : "Cerrar sin diagnóstico"}
                  </button>
                  <button type="button" className="ky-btn-ghost" disabled={cierre === "procesando"} onClick={() => { setCierre("idle"); setErrorCierre(null); }}>
                    Seguir entrevistando
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
