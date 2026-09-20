"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseNumeroAR } from "@/lib/api/numero";

export interface EmpresaConocida {
  id: string;
  nombre: string;
  sector: string | null;
  tamano_n: number | null;
}

export function NuevoForm({ empresas }: { empresas: EmpresaConocida[] }) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState("");
  const [nombre, setNombre] = useState("");
  const [sector, setSector] = useState("");
  const [n, setN] = useState("");
  const [salario, setSalario] = useState("");
  const [rotacion, setRotacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function elegirEmpresa(id: string) {
    setEmpresaId(id);
    const e = empresas.find((x) => x.id === id);
    if (e) {
      setNombre(e.nombre);
      setSector(e.sector ?? "");
      setN(e.tamano_n ? String(e.tamano_n) : "");
    } else {
      setNombre("");
      setSector("");
      setN("");
    }
  }

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);

    const nEmp = parseNumeroAR(n);
    const sal = parseNumeroAR(salario);
    const rotPct = parseNumeroAR(rotacion);
    if (!nombre.trim()) return setError("Falta el nombre de la empresa.");
    if (nEmp === null || !Number.isInteger(nEmp) || nEmp < 1) return setError("La cantidad de empleados debe ser un número entero mayor a 0.");
    if (sal === null || sal <= 0) return setError("El salario mensual promedio debe ser un número mayor a 0.");
    if (rotPct === null || rotPct < 0 || rotPct > 100) return setError("La rotación anual va de 0 a 100 (%).");

    setEnviando(true);
    try {
      const res = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: { ...(empresaId ? { id: empresaId } : {}), nombre: nombre.trim(), sector: sector.trim() || undefined },
          datos_economicos: { n_empleados: nEmp, s_salario_mensual: sal, r_rotacion_anual: rotPct / 100 },
          modo_captura: "manual",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "No se pudo crear el diagnóstico.");
        setEnviando(false);
        return;
      }
      router.push(`/diagnostico/${json.diagnostico_id}`);
    } catch {
      setError("No hay conexión con el servidor. Probá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="ky-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {empresas.length > 0 && (
        <div>
          <label className="ky-label" htmlFor="empresa">Empresa</label>
          <select id="empresa" className="ky-select" value={empresaId} onChange={(e) => elegirEmpresa(e.target.value)}>
            <option value="">Nueva empresa</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div className="ky-grid-2">
        <div>
          <label className="ky-label" htmlFor="nombre">Nombre de la empresa</label>
          <input id="nombre" className="ky-input" value={nombre} onChange={(e) => setNombre(e.target.value)} readOnly={!!empresaId} required />
        </div>
        <div>
          <label className="ky-label" htmlFor="sector">Sector</label>
          <input id="sector" className="ky-input" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="manufactura, servicios, salud…" />
        </div>
      </div>

      <div className="ky-grid-2">
        <div>
          <label className="ky-label" htmlFor="n">Empleados (N)</label>
          <input id="n" className="ky-input" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value)} placeholder="240" required />
        </div>
        <div>
          <label className="ky-label" htmlFor="s">Salario mensual promedio (S)</label>
          <input id="s" className="ky-input" inputMode="decimal" value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="850.000" required />
        </div>
      </div>

      <div>
        <label className="ky-label" htmlFor="r">Rotación anual (R, en %)</label>
        <input id="r" className="ky-input" inputMode="decimal" value={rotacion} onChange={(e) => setRotacion(e.target.value)} placeholder="18" required style={{ maxWidth: 240 }} />
      </div>

      <div>
        <span className="ky-label">Captura</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span className="ky-pill" style={{ borderColor: "var(--ac)" }}>Notas manuales</span>
          <span className="ky-pill" style={{ opacity: 0.45 }}>Audio transcrito — próximamente</span>
        </div>
        <p className="ky-muted" style={{ marginTop: 8 }}>
          Por ahora las respuestas del entrevistado se cargan escritas. La transcripción en vivo (con su
          consentimiento) llega en una próxima versión.
        </p>
      </div>

      {error && <p style={{ color: "var(--err)", fontSize: 14 }}>{error}</p>}

      <div>
        <button type="submit" className="ky-btn" disabled={enviando}>
          {enviando ? "Creando…" : "Empezar diagnóstico"}
        </button>
      </div>
    </form>
  );
}
