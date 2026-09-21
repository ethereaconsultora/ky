import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { MarcoAcceso } from "./marco";

export const metadata: Metadata = { title: "Ingresar — KY" };

export default function LoginPage() {
  return (
    <MarcoAcceso activa="ingresar">
      <Suspense>
        <LoginForm />
      </Suspense>
    </MarcoAcceso>
  );
}
