import type { Metadata } from "next";
import { MarcoAcceso } from "../login/marco";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nueva contraseña — KY" };

export default function ResetPasswordPage() {
  return (
    <MarcoAcceso>
      <ResetForm />
    </MarcoAcceso>
  );
}
