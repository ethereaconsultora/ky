"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { boton, enlace, errorTexto, input, sub } from "../login/estilos";

/**
 * Llegan desde el link del mail de «crear / recuperar contraseña»: `/reset-password?token_hash=…&type=recovery`
 * (plantilla «Reset Password» de Supabase, ver spec/DEPLOYMENT.md). El código NO se canjea al abrir la página sino
 * cuando la persona toca «Continuar»: así los escáneres de links de los servidores de mail (Zoho, Gmail, antivirus)
 * no gastan el link de un solo uso antes de que llegue al usuario. Canjeado, queda una sesión de recuperación y
 * se puede fijar la contraseña. Funciona igual desde cualquier dispositivo.
 */
export function ResetForm() {
  const [listo, setListo] = useState(false);
  const [vencido, setVencido] = useState(false);
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [canjeando, setCanjeando] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = crearClienteNavegador();
    let activo = true;

    const q = new URLSearchParams(window.location.search);
    const th = q.get("token_hash");
    const conLink = !!th && q.get("type") === "recovery";
    if (conLink) setTokenHash(th);

    const { data } = sb.auth.onAuthStateChange((_evento, sesion) => {
      if (activo && sesion) setListo(true);
    });
    sb.auth.getSession().then(({ data: d }) => {
      if (activo && d.session) setListo(true);
    });
    // sin link en la URL (ni sesión abierta) no hay nada que esperar
    const t = setTimeout(() => {
      if (activo && !conLink) setVencido(true);
    }, 3000);

    return () => {
      activo = false;
      clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, []);

  async function continuar() {
    if (!tokenHash) return;
    setCanjeando(true);
    const { error } = await crearClienteNavegador().auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error) {
      setTokenHash(null);
      setVencido(true);
      setCanjeando(false);
      return;
    }
    window.history.replaceState(null, "", "/reset-password"); // saca el código de la barra de direcciones
    setListo(true);
  }

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
        {tokenHash ? (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>Tocá el botón para elegir tu contraseña.</p>
            <button type="button" onClick={continuar} disabled={canjeando} style={boton}>
              {canjeando ? "Verificando…" : "Continuar"}
            </button>
          </>
        ) : vencido ? (
          <>
            <p style={{ fontSize: 15, lineHeight: 1.6 }}>
              Este link venció o ya se usó. Pedí uno nuevo y abrilo con el botón del mail.
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
