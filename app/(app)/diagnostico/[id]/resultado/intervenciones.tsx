"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ETIQUETA_ENTREGA, puedeAprobar, puedeEditar, puedeEnviar, type EstadoEntrega } from "@/lib/api/entrega";

export interface IntervencionVM {
  id: string;
  objetivo: string;
  descripcion: string;
  traduccion_humana: string;
  reversibilidad: string | null;
}

export function Intervenciones(props: { diagnosticoId: string; estado: EstadoEntrega; items: IntervencionVM[] }) {
  const router = useRouter();
  const [items, setItems] = useState(props.items);
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState({ descripcion: "", traduccion_humana: "" });
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = puedeEditar(props.estado);

  async function llamar(url: string, init?: RequestInit) {
    setOcupado(true);
    setError(null);
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "No se pudo completar la acción.");
        return null;
      }
      return json;
    } catch {
      setError("No hay conexión con el servidor. Probá de nuevo.");
      return null;
    } finally {
      setOcupado(false);
    }
  }

  function empezarEdicion(i: IntervencionVM) {
    setEditando(i.id);
    setBorrador({ descripcion: i.descripcion, traduccion_humana: i.traduccion_humana });
  }

  async function guardar(id: string) {
    const r = await llamar(`/api/intervencion/${id}`, { method: "PATCH", body: JSON.stringify(borrador) });
    if (!r) return;
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, descripcion: r.descripcion, traduccion_humana: r.traduccion_humana } : x)));
    setEditando(null);
  }

  async function aprobar() {
    const r = await llamar(`/api/diagnostico/${props.diagnosticoId}/aprobar`, { method: "POST" });
    if (r) router.refresh();
  }

  async function marcarEntregada() {
    const r = await llamar(`/api/diagnostico/${props.diagnosticoId}/enviar`, { method: "POST" });
    if (r) router.refresh();
  }

  return (
    <div className="ky-card" style={{ marginTop: 16 }}>
      <span className="ky-label">
        Intervención propuesta · {items.length > 1 ? `${items.length} frentes` : "1 frente"}
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((i) => (
          <div key={i.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div className="ky-muted">{i.objetivo}</div>

            {editando === i.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                <div>
                  <label className="ky-label" htmlFor={`d-${i.id}`}>Descripción</label>
                  <textarea id={`d-${i.id}`} className="ky-textarea" style={{ minHeight: 90 }} value={borrador.descripcion} onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })} />
                </div>
                <div>
                  <label className="ky-label" htmlFor={`t-${i.id}`}>Qué cambia para las personas</label>
                  <textarea id={`t-${i.id}`} className="ky-textarea" style={{ minHeight: 90 }} value={borrador.traduccion_humana} onChange={(e) => setBorrador({ ...borrador, traduccion_humana: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="ky-btn" disabled={ocupado} onClick={() => guardar(i.id)}>Guardar cambios</button>
                  <button type="button" className="ky-btn-ghost" disabled={ocupado} onClick={() => setEditando(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 16, lineHeight: 1.55, margin: "4px 0 8px" }}>{i.descripcion}</p>
                <p style={{ fontSize: 14, lineHeight: 1.55 }}>
                  <strong style={{ fontWeight: 500 }}>Qué cambia para las personas:</strong> {i.traduccion_humana}
                </p>
                {i.reversibilidad && <p className="ky-muted" style={{ marginTop: 8 }}>{i.reversibilidad}</p>}
                {editable && (
                  <button type="button" className="ky-btn-ghost" style={{ marginTop: 10 }} onClick={() => empezarEdicion(i)}>
                    Editar propuesta
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <p className="ky-muted">Estado: {ETIQUETA_ENTREGA[props.estado]}</p>
        {error && <p style={{ color: "var(--err)", fontSize: 14 }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {puedeAprobar(props.estado) && (
            <button type="button" className="ky-btn" disabled={ocupado || editando !== null} onClick={aprobar}>
              Aprobar propuesta
            </button>
          )}
          {puedeEnviar(props.estado) && (
            <button type="button" className="ky-btn" disabled={ocupado} onClick={marcarEntregada}>
              Marcar como entregada a la empresa
            </button>
          )}
          {props.estado !== "sin_propuesta" && (
            <Link href={`/diagnostico/${props.diagnosticoId}/informe`} className="ky-btn-ghost" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              {props.estado === "borrador" ? "Vista previa del informe" : "Ver informe (PDF)"}
            </Link>
          )}
        </div>
        {props.estado === "borrador" && (
          <p className="ky-muted">
            Revisá que el texto no incluya nombres ni datos que identifiquen a una persona: una vez aprobado,
            queda fijo.
          </p>
        )}
      </div>
    </div>
  );
}
