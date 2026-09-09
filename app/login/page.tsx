import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar — KY" };

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 26 }}>
        <header style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span className="serif" style={{ fontSize: 34, letterSpacing: "-0.02em" }}>
            KY
          </span>
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ac)",
            }}
          >
            Diagnóstico Espacio Crítico
          </span>
        </header>

        <Suspense>
          <LoginForm />
        </Suspense>

        <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", lineHeight: 1.6 }}>
          Acceso sólo para counselors habilitados. El alta la hace un admin en Supabase.
        </p>
      </div>
    </main>
  );
}
