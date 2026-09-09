import { perfilActual } from "@/lib/supabase/server";

/**
 * Home autenticada. En Fase 3 gana el boton "Nuevo diagnostico" -> pantalla
 * Inicio (datos de empresa + consentimiento).
 */
export default async function Home() {
  const perfil = await perfilActual();

  return (
    <main
      style={{
        minHeight: "calc(100vh - 49px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div className="serif" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
        Hola{perfil?.nombre ? `, ${perfil.nombre}` : ""}
      </div>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ac)" }} />
      <p style={{ fontSize: 13, color: "var(--t2)", maxWidth: 380, lineHeight: 1.6 }}>
        Copiloto del Counselor · Versión B. La pantalla de inicio de diagnóstico
        (datos de empresa + consentimiento) llega en la Fase 3.
      </p>
    </main>
  );
}
