import { redirect } from "next/navigation";
import { perfilActual } from "@/lib/supabase/server";

/**
 * Layout de las rutas con sesion. El middleware ya redirige a /login, pero
 * revalidamos server-side (getUser) por si acaso y para tener el perfil.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await perfilActual();
  if (!perfil) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span className="serif" style={{ fontSize: 20, letterSpacing: "-0.01em" }}>
          KY
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 12, color: "var(--t2)" }}>
            {perfil.nombre ?? perfil.email}
            {perfil.rol === "admin" && " · admin"}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              style={{
                background: "transparent",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                color: "var(--t1)",
                fontSize: 12,
                padding: "5px 10px",
              }}
            >
              Salir
            </button>
          </form>
        </div>
      </header>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
