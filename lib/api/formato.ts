/**
 * formato - presentacion de cifras para la pantalla de Resultado. Puro.
 * Las proyecciones se muestran SIEMPRE como rango (regla de la matriz).
 */

const NBSP = " ";

export function fmtMoneda(n: number): string {
  return `$${NBSP}${Math.round(n).toLocaleString("es-AR")}`;
}

export function fmtRangoMoneda(min: number, max: number): string {
  return `${fmtMoneda(min)} – ${fmtMoneda(max)}`;
}

/** 0.4 → "40 %" (grados de reversibilidad, factores). */
export function fmtPorcentaje(fraccion: number): string {
  return `${Math.round(fraccion * 100)}${NBSP}%`;
}

export function fmtRangoPorcentaje(minFraccion: number, maxFraccion: number): string {
  const a = Math.round(minFraccion * 100);
  const b = Math.round(maxFraccion * 100);
  return a === b ? `${a}${NBSP}%` : `${a}–${b}${NBSP}%`;
}

/** ROI ya viene en puntos porcentuales (p. ej. 112.5). */
export function fmtRangoRoi(min: number, max: number): string {
  const f = (x: number) => Math.round(x).toLocaleString("es-AR");
  return `${f(min)}${NBSP}% a ${f(max)}${NBSP}%`;
}

export const ETIQUETA_PLAZO: Record<string, string> = {
  inmediato: "efecto inmediato",
  corto: "efecto a corto plazo",
  medio: "efecto a mediano plazo",
  largo: "efecto a largo plazo",
};

export const ETIQUETA_HORIZONTE: Record<string, string> = {
  "6m": "6 meses",
  "12m": "12 meses",
  "24m": "24 meses",
};

export const ETIQUETA_INDICADOR: Record<string, string> = {
  presentismo: "presentismo",
  rotacion: "rotación",
  horas_improductivas: "horas improductivas",
  friccion: "fricción operativa",
};
