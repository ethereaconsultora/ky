import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";
import { NuevoForm, type EmpresaConocida } from "./nuevo-form";

export const metadata = { title: "Nuevo diagnóstico — KY" };

export default async function NuevoDiagnostico() {
  const sb = await crearClienteServidor();
  // La RLS de `empresa` sólo deja ver las que ya tienen un diagnóstico propio.
  const { data } = await sb
    .from("empresa")
    .select("id, nombre, sector, tamano_n")
    .order("nombre", { ascending: true });

  return (
    <main className="ky-page" style={{ maxWidth: 760 }}>
      <Link href="/" className="ky-muted" style={{ textDecoration: "none" }}>
        ← Volver
      </Link>
      <div className="ky-h" style={{ fontSize: 30, margin: "12px 0 4px" }}>
        Nuevo diagnóstico
      </div>
      <p className="ky-muted" style={{ marginBottom: 20 }}>
        Datos de la empresa. Con esto el motor calcula la pérdida económica al cierre; nada de esto se
        le muestra al entrevistado.
      </p>
      <NuevoForm empresas={(data ?? []) as EmpresaConocida[]} />
    </main>
  );
}
