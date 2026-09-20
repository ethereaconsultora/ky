"use client";

export function BotonImprimir() {
  return (
    <button type="button" className="ky-btn" onClick={() => window.print()}>
      Imprimir / Guardar como PDF
    </button>
  );
}
