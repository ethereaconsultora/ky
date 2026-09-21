import type { Metadata } from "next";
import { EnlaceForm } from "../login/enlace-form";
import { MarcoAcceso } from "../login/marco";

export const metadata: Metadata = { title: "Crear cuenta — KY" };

export default function RegistroPage() {
  return (
    <MarcoAcceso activa="registro">
      <EnlaceForm modo="registro" />
    </MarcoAcceso>
  );
}
