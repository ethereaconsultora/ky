/**
 * numero - parseo de numeros escritos a la argentina ("850.000", "18,5", "1.234,56").
 * Devuelve null si no es un numero valido. Puro.
 */
export function parseNumeroAR(entrada: string): number | null {
  let t = entrada.trim().replace(/\s+/g, "").replace(/^\$/, "").replace(/%$/, "");
  if (t === "") return null;

  const tienePunto = t.includes(".");
  const tieneComa = t.includes(",");

  if (tienePunto && tieneComa) {
    // el ultimo separador es el decimal; el otro es de miles
    if (t.lastIndexOf(",") > t.lastIndexOf(".")) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
  } else if (tieneComa) {
    t = t.replace(/,/g, ".");
    if ((t.match(/\./g) ?? []).length > 1) return null;
  } else if (tienePunto && /^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ""); // "850.000" = ochocientos cincuenta mil
  }

  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
