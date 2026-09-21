import type { CSSProperties } from "react";

/** Estilos compartidos de las pantallas de acceso (ingresar / crear cuenta / recuperar). */
export const sub: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--t2)",
};

export const input: CSSProperties = {
  width: "100%",
  background: "var(--g2)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-md)",
  color: "var(--t0)",
  padding: "12px 14px",
  fontSize: 15,
  outline: "none",
};

export const boton: CSSProperties = {
  background: "var(--ac)",
  color: "var(--g0)",
  border: "1px solid var(--ac)",
  borderRadius: "var(--radius-md)",
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: "0.04em",
  minHeight: 46,
};

export const enlace: CSSProperties = { color: "var(--ac)", fontSize: 13, textDecoration: "none" };

export const errorTexto: CSSProperties = { color: "var(--err)", fontSize: 13, lineHeight: 1.5 };
