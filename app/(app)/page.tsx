import Link from "next/link";
import { crearClienteServidor, perfilActual } from "@/lib/supabase/server";

const ETIQUETA_ESTADO: Record<string, string> = {
  en_curso: "En curso",
  cerrado: "Cerrado",
  pausado: "Pausado",
};

interface FilaDiag {
  id: string;
  estado: string;
  fecha_inicio: string;
  empresa: { nombre: string } | { nombre: string }[] | null;
}

function nombreEmpresa(e: FilaDiag["empresa"]): string {
  const x = Array.isArray(e) ? e[0] : e;
  return x?.nombre ?? "Empresa";
}

export default async function Home() {
  const perfil = await perfilActual();
  const sb = await crearClienteServidor();

  const { data } = await sb
    .from("diagnostico")
    .select("id, estado, fecha_inicio, empresa:empresa_id ( nombre )")
    .order("fecha_inicio", { ascending: false })
    .limit(20);
  const diagnosticos = (data ?? []) as FilaDiag[];

  return (
    <main className="ky-page">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <div className="ky-h" style={{ fontSize: 32 }}>
            Hola{perfil?.nombre ? `, ${perfil.nombre}` : ""}
          </div>
          <p className="ky-muted">Copiloto del Counselor · Versión B</p>
        </div>
        <Link href="/diagnostico/nuevo" className="ky-btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Nuevo diagnóstico
        </Link>
      </div>

      <div className="ky-card">
        <span className="ky-label">Tus diagnósticos</span>
        {diagnosticos.length === 0 ? (
          <p className="ky-muted">Todavía no hay ninguno. Empezá uno con “Nuevo diagnóstico”.</p>
        ) : (
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column" }}>
            {diagnosticos.map((d) => (
              <li key={d.id} style={{ borderTop: "1px solid var(--border)" }}>
                <Link
                  href={`/diagnostico/${d.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "14px 4px",
                    color: "var(--t0)",
                    textDecoration: "none",
                  }}
                >
                  <span>{nombreEmpresa(d.empresa)}</span>
                  <span className="ky-muted">
                    {ETIQUETA_ESTADO[d.estado] ?? d.estado} ·{" "}
                    {new Date(d.fecha_inicio).toLocaleDateString("es-AR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
