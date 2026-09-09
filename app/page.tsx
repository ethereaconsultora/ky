/**
 * Placeholder de la raíz. En la Fase 3 esto redirige a /login o /diagnostico
 * según la sesión (server layout con getUser()).
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div
        className="serif"
        style={{ fontSize: 40, letterSpacing: "-0.02em", color: "var(--t0)" }}
      >
        KY
      </div>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ac)" }} />
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ac)",
        }}
      >
        Diagnóstico Espacio Crítico
      </div>
      <p style={{ marginTop: 16, fontSize: 13, color: "var(--t2)", maxWidth: 360 }}>
        Copiloto del Counselor · Versión B. En construcción — ver{" "}
        <code>spec/PLAN_APROBADO.md</code>.
      </p>
    </main>
  );
}
