import type { Metadata } from "next";
import { EnlaceForm } from "../login/enlace-form";
import { MarcoAcceso } from "../login/marco";

export const metadata: Metadata = { title: "Recuperar contraseña — KY" };

export default function RecuperarPage() {
  return (
    <MarcoAcceso>
      <EnlaceForm modo="recuperar" />
    </MarcoAcceso>
  );
}
