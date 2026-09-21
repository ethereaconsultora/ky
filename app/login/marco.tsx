import Link from "next/link";

/** Marco común de las pantallas de acceso: logo + pestañas «Ingresar / Crear cuenta». */
export function MarcoAcceso({
  activa,
  children,
}: {
  activa?: "ingresar" | "registro";
  children: React.ReactNode;
}) {
  const pestana = (activo: boolean): React.CSSProperties => ({
    flex: 1,
    textAlign: "center",
    padding: "10px 0",
    fontSize: 13,
    letterSpacing: "0.08em",
    textDecoration: "none",
    color: activo ? "var(--t0)" : "var(--t2)",
    borderBottom: `2px solid ${activo ? "var(--ac)" : "var(--border)"}`,
  });

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 24 }}>
        <header style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <span className="serif" style={{ fontSize: 34, letterSpacing: "-0.02em" }}>KY</span>
          <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ac)" }}>
            Diagnóstico Espacio Crítico
          </span>
        </header>

        {activa && (
          <nav style={{ display: "flex" }}>
            <Link href="/login" style={pestana(activa === "ingresar")}>Ingresar</Link>
            <Link href="/registro" style={pestana(activa === "registro")}>Crear cuenta</Link>
          </nav>
        )}

        {children}
      </div>
    </main>
  );
}
