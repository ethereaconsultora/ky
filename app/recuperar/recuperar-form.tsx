"use client";

import { useState } from "react";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { boton, enlace, errorTexto, input, sub } from "../login/estilos";

export function RecuperarForm() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pedir(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const { error } = await crearClienteNavegador().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error && error.status !== 400 && error.status !== 422) {
        setError("No se pudo enviar el mail. Probá de nuevo en unos minutos.");
        setCargando(false);
        return;
      }
      // siempre el mismo mensaje: no se revela si el email tiene cuenta
      setEnviado(true);
    } catch {
      setError("No hay conexión con el servidor. Probá de nuevo.");
    }
    setCargando(false);
  }

  if (enviado) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          Si ese email tiene una cuenta, te mandamos un link para elegir una contraseña nueva.
        </p>
        <p style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>
          Abrilo en este mismo dispositivo. Si no llega, revisá la carpeta de spam o pedile a un admin que te la restablezca.
        </p>
        <Link href="/login" style={enlace}>Volver a ingresar</Link>
      </div>
    );
  }

  return (
    <form onSubmit={pedir} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 14, color: "var(--t1)", lineHeight: 1.6 }}>
        Ingresá tu email y te mandamos un link para elegir una contraseña nueva.
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={sub}>Email</span>
        <input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} style={input} />
      </label>
      {error && <p style={errorTexto}>{error}</p>}
      <button type="submit" disabled={cargando} style={boton}>
        {cargando ? "Enviando…" : "Enviar link"}
      </button>
      <div style={{ textAlign: "center" }}>
        <Link href="/login" style={enlace}>Volver</Link>
      </div>
    </form>
  );
}
