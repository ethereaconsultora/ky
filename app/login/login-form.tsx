"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { boton, enlace, errorTexto, input, sub } from "./estilos";

export function LoginForm() {
  const params = useSearchParams();
  const destino = params.get("next") || "/";
  // sólo rutas internas (evita redirecciones abiertas a otro sitio)
  const destinoSeguro = destino.startsWith("/") && !destino.startsWith("//") ? destino : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const { error } = await crearClienteNavegador().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setError("Email o contraseña incorrectos.");
        setCargando(false);
        return;
      }
      // recarga completa: el servidor lee la sesión nueva desde las cookies
      window.location.href = destinoSeguro;
    } catch {
      setError("No hay conexión con el servidor. Probá de nuevo.");
      setCargando(false);
    }
  }

  return (
    <form onSubmit={ingresar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={sub}>Email</span>
        <input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@espaciocritico.com" style={input} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={sub}>Contraseña</span>
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={input} />
      </label>

      {error && <p style={errorTexto}>{error}</p>}

      <button type="submit" disabled={cargando} style={boton}>
        {cargando ? "Ingresando…" : "Ingresar"}
      </button>

      <div style={{ textAlign: "center" }}>
        <Link href="/recuperar" style={enlace}>¿Olvidaste tu contraseña?</Link>
      </div>
    </form>
  );
}
