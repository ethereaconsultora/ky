/**
 * normalizar - higiene de la transcripcion antes de mandarla al modelo (PSAI B1).
 *
 * NO intenta anonimizar (los nombres propios son parte de la evidencia y se
 * cifran en reposo, no aca). Solo neutraliza lo que puede romper el prompt o
 * inflar tokens: control chars, marcas bidi / zero-width, espaciado, largo.
 */

const LARGO_MAXIMO = 8000; // ~2k tokens por turno; una respuesta hablada real no llega

// Control C0/C1 salvo TAB (U+0009), LF (U+000A) y CR (U+000D, normalizado a LF antes).
const CONTROL = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F]",
  "g",
);
// Bidi overrides + zero-width + BOM: vector de inyeccion de prompt en una transcripcion.
const INVISIBLES = new RegExp(
  "[\\u200B-\\u200F\\u202A-\\u202E\\u2060\\uFEFF]",
  "g",
);

export interface TranscripcionNormalizada {
  texto: string;
  truncada: boolean;
  vacia: boolean;
}

export function normalizarTranscripcion(entrada: string): TranscripcionNormalizada {
  let t = (entrada ?? "").normalize("NFC").replace(/\r\n?/g, "\n");

  t = t.replace(CONTROL, " ").replace(INVISIBLES, "");

  // Espaciado: colapsar dentro de cada linea, recortar, y max. 1 linea en blanco seguida.
  t = t
    .split("\n")
    .map((l) => l.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const truncada = t.length > LARGO_MAXIMO;
  if (truncada) t = t.slice(0, LARGO_MAXIMO).trimEnd() + " [...]";

  return { texto: t, truncada, vacia: t.length === 0 };
}

/**
 * sanearSugerencias - PSAI B4: ultima pasada sobre lo que se devuelve al cliente.
 * Normaliza espaciado y recorta strings desbocados.
 */
export function sanearSugerencias(sugerencias: string[]): string[] {
  return sugerencias
    .map((s) => s.normalize("NFC").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.length > 400 ? s.slice(0, 400).trimEnd() + "…" : s));
}
