import type { Metadata } from "next";
import { MarcoAcceso } from "../login/marco";
import { boton } from "../login/estilos";

export const metadata: Metadata = { title: "Cuenta pendiente — KY" };

/** Con sesión iniciada pero sin la marca de cuenta habilitada (ver lib/auth/activo.ts). */
export default function CuentaPendientePage() {
  return (
    <MarcoAcceso>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
        <p style={{ fontSize: 16, lineHeight: 1.6 }}>Tu cuenta todavía no está habilitada.</p>
        <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.6 }}>
          Pedile a un admin de Espacio Crítico que habilite tu email.
        </p>
        <form action="/auth/signout" method="post">
          <button type="submit" style={{ ...boton, width: "100%" }}>Salir</button>
        </form>
      </div>
    </MarcoAcceso>
  );
}
