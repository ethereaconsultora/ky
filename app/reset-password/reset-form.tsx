"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { boton, enlace, errorTexto, input, sub } from "../login/estilos";

/**
 * Llegan desde el link del mail de «recuperar contraseña». El cliente de Supabase canjea el código de la URL
 * y deja una sesión de recuperación: con esa sesión se puede fijar la contraseña nueva. Si en unos segundos
 * no hay sesión, el link venció o se abrió en otro dispositivo.
 */
export function ResetForm() {
  const [listo, setListo] = useState(false);
  const [vencido, setVencido] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = crearClienteNavegador();
    let activo = true;

    const { data } = sb.auth.onAuthStateChange((_evento, sesion) => {
      if (activo && sesion) setListo(true);
    });
    sb.auth.getSession().then(({ data: d }) => {
      if (activo && d.session) setListo(true);
    });
    const t = setTimeout(() => {
      if (activo) setVencido(true);
    }, 5000);

    return () => {
      activo = false;
      clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (password.length > 72) return setError("La contraseña es demasiado larga (máximo 72).");
    if (password !== confirmar) return setError("Las contraseñas no coinciden.");

    setCargando(true);
    const { error } = await crearClienteNavegador().auth.updateUser({ password });
    if (error) {
      setError("No se pudo cambiar la contraseña. Pedí un link nuevo e intentá de nuevo.");
      setCargando(false);
      return;
    }
    window.location.href = "/";
  }

  if (!listo) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
        {vencido ? (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>
              Este link venció o se abrió en otro dispositivo. Pedí uno nuevo desde el mismo dispositivo en el que vas a abrirlo.
            </p>
            <Link href="/recuperar" style={enlace}>Pedir un link nuevo</Link>
          </>
        ) : (
          <p style={{ fontSize: 14, color: "var(--t2)" }}>Verificando el link…</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 14, color: "var(--t1)", lineHeight: 1.6 }}>Elegí tu contraseña nueva.</p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={sub}>Contraseña nueva</span>
        <input type="password" required autoFocus autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" style={input} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={sub}>Repetila</span>
        <input type="password" required autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} style={input} />
      </label>
      {error && <p style={errorTexto}>{error}</p>}
      <button type="submit" disabled={cargando} style={boton}>
        {cargando ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
