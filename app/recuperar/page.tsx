import type { Metadata } from "next";
import { MarcoAcceso } from "../login/marco";
import { RecuperarForm } from "./recuperar-form";

export const metadata: Metadata = { title: "Recuperar contraseña — KY" };

export default function RecuperarPage() {
  return (
    <MarcoAcceso>
      <RecuperarForm />
    </MarcoAcceso>
  );
}
