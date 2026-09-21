import type { Metadata } from "next";
import { MarcoAcceso } from "../login/marco";
import { RegistroForm } from "./registro-form";

export const metadata: Metadata = { title: "Crear cuenta — KY" };

export default function RegistroPage() {
  return (
    <MarcoAcceso activa="registro">
      <RegistroForm />
      <p style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", lineHeight: 1.6 }}>
        El registro es sólo con invitación. Si no tenés el código, pedíselo a un admin de Espacio Crítico.
      </p>
    </MarcoAcceso>
  );
}
