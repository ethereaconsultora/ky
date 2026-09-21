"use client";

import { useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { boton, errorTexto, input, sub } from "../login/estilos";

export function RegistroForm() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirmar) return setError("Las contraseñas no coinciden.");

    setCargando(true);
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, codigo }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "No se pudo crear la cuenta.");
        setCargando(false);
        return;
      }

      // cuenta creada: se ingresa directo con la misma contraseña
      const { error: errIngreso } = await crearClienteNavegador().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (errIngreso) {
        window.location.href = "/login";
        return;
      }
      window.location.href = "/";
    } catch {
      setError("No hay conexión con el servidor. Probá de nuevo.");
      setCargando(false);
    }
  }

  const campo = (etiqueta: string, valor: string, set: (v: string) => void, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={sub}>{etiqueta}</span>
      <input required value={valor} onChange={(e) => set(e.target.value)} style={input} {...extra} />
    </label>
  );

  return (
    <form onSubmit={crear} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {campo("Nombre profesional", nombre, setNombre, { autoFocus: true, autoComplete: "name", placeholder: "Lic. Nombre Apellido" })}
      {campo("Email", email, setEmail, { type: "email", autoComplete: "email", placeholder: "vos@espaciocritico.com" })}
      {campo("Contraseña", password, setPassword, { type: "password", autoComplete: "new-password", placeholder: "Mínimo 8 caracteres" })}
      {campo("Repetí la contraseña", confirmar, setConfirmar, { type: "password", autoComplete: "new-password" })}
      {campo("Código de invitación", codigo, setCodigo, { autoComplete: "off", placeholder: "Te lo da un admin de Espacio Crítico" })}

      {error && <p style={errorTexto}>{error}</p>}

      <button type="submit" disabled={cargando} style={boton}>
        {cargando ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
