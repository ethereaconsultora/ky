"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Paso = "email" | "codigo";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get("next") || "/";

  const [paso, setPaso] = useState<Paso>("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sb = crearClienteNavegador();

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    setCargando(false);
    if (error) {
      setError(
        error.status === 422
          ? "Ese email no está habilitado. Pedile a un admin que te dé de alta."
          : error.message,
      );
      return;
    }
    setPaso("codigo");
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await sb.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: codigo.trim(),
      type: "email",
    });
    setCargando(false);
    if (error) {
      setError("Código inválido o vencido.");
      return;
    }
    router.replace(destino);
    router.refresh();
  }

  return (
    <form
      onSubmit={paso === "email" ? pedirCodigo : verificar}
      style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}
    >
      {paso === "email" ? (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={sub}>Email</span>
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@espaciocritico.com"
            style={input}
          />
        </label>
      ) : (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={sub}>Código que te llegó por mail</span>
          <input
            inputMode="numeric"
            required
            autoFocus
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="123456"
            style={{ ...input, letterSpacing: "0.3em", textAlign: "center" }}
          />
        </label>
      )}

      {error && <p style={{ color: "var(--err)", fontSize: 13 }}>{error}</p>}

      <button type="submit" disabled={cargando} style={boton}>
        {cargando ? "..." : paso === "email" ? "Enviar código" : "Entrar"}
      </button>

      {paso === "codigo" && (
        <button
          type="button"
          onClick={() => {
            setPaso("email");
            setCodigo("");
            setError(null);
          }}
          style={{ ...boton, background: "transparent", color: "var(--t2)", border: "none" }}
        >
          Cambiar email
        </button>
      )}
    </form>
  );
}

const sub: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--t2)",
};

const input: React.CSSProperties = {
  background: "var(--g2)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-md)",
  color: "var(--t0)",
  padding: "12px 14px",
  fontSize: 15,
  outline: "none",
};

const boton: React.CSSProperties = {
  background: "var(--ac)",
  color: "var(--g0)",
  border: "1px solid var(--ac)",
  borderRadius: "var(--radius-md)",
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "0.04em",
};
