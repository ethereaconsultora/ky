"use client";

import { useState } from "react";
import Link from "next/link";
import { boton, enlace, errorTexto, input, sub } from "./estilos";

/**
 * Pide el link para crear (o cambiar) la contraseña. Lo usan «Crear cuenta» y «Olvidé mi contraseña»:
 * es el mismo flujo, sólo cambian los textos. Nunca se revela si el email está habilitado.
 */
const TEXTOS = {
  registro: {
    intro: "Ingresá tu email corporativo. Si está habilitado, te mandamos un link para crear tu contraseña.",
    boton: "Enviarme el link",
    pie: "Sólo pueden crear cuenta los emails que habilitó un admin de Espacio Crítico.",
  },
  recuperar: {
    intro: "Ingresá tu email y te mandamos un link para elegir una contraseña nueva.",
    boton: "Enviar link",
    pie: "",
  },
} as const;

export function EnlaceForm({ modo }: { modo: keyof typeof TEXTOS }) {
  const t = TEXTOS[modo];
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pedir(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/acceso/enlace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "No se pudo enviar el mail. Probá de nuevo.");
      } else {
        setMensaje(json.mensaje ?? "Revisá tu casilla.");
      }
    } catch {
      setError("No hay conexión con el servidor. Probá de nuevo.");
    }
    setCargando(false);
  }

  if (mensaje) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>{mensaje}</p>
        <p style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>
          El link vence en un rato y sirve desde cualquier dispositivo. Si no llega, pedile a un admin que revise que tu email esté habilitado.
        </p>
        <Link href="/login" style={enlace}>Volver a ingresar</Link>
      </div>
    );
  }

  return (
    <form onSubmit={pedir} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 14, color: "var(--t1)", lineHeight: 1.6 }}>{t.intro}</p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={sub}>Email</span>
        <input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@espaciocritico.com" style={input} />
      </label>
      {error && <p style={errorTexto}>{error}</p>}
      <button type="submit" disabled={cargando} style={boton}>
        {cargando ? "Enviando…" : t.boton}
      </button>
      {t.pie && <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", lineHeight: 1.6 }}>{t.pie}</p>}
      {modo === "recuperar" && (
        <div style={{ textAlign: "center" }}>
          <Link href="/login" style={enlace}>Volver</Link>
        </div>
      )}
    </form>
  );
}
