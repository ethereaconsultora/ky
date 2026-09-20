/**
 * entrega - estado de la propuesta de intervencion (borrador -> aprobada -> enviada). Puro.
 * Regla de la matriz: la ultima palabra es del Counselor. Nada se aprueba ni se envia solo.
 */

import { z } from "zod";

export type EstadoEntrega = "sin_propuesta" | "borrador" | "aprobada" | "enviada";

export interface FilaEntrega {
  aprobada_por_consultor: boolean;
  enviada_at: string | null;
}

export function estadoEntrega(intervenciones: FilaEntrega[]): EstadoEntrega {
  if (intervenciones.length === 0) return "sin_propuesta";
  if (intervenciones.every((i) => i.enviada_at)) return "enviada";
  if (intervenciones.every((i) => i.aprobada_por_consultor)) return "aprobada";
  return "borrador";
}

/** Solo un borrador se edita o se aprueba; solo una propuesta aprobada se marca como enviada. */
export const puedeEditar = (e: EstadoEntrega) => e === "borrador";
export const puedeAprobar = (e: EstadoEntrega) => e === "borrador";
export const puedeEnviar = (e: EstadoEntrega) => e === "aprobada";

export const ETIQUETA_ENTREGA: Record<EstadoEntrega, string> = {
  sin_propuesta: "Sin propuesta",
  borrador: "Borrador — pendiente de tu aprobación",
  aprobada: "Aprobada — lista para entregar a la empresa",
  enviada: "Entregada a la empresa",
};

const texto = z.string().trim().min(10, "Muy corto (mínimo 10 caracteres).").max(2000, "Muy largo (máximo 2000 caracteres).");

export const EdicionIntervencionBody = z
  .object({ descripcion: texto.optional(), traduccion_humana: texto.optional() })
  .refine((b) => b.descripcion !== undefined || b.traduccion_humana !== undefined, {
    message: "Nada para actualizar.",
  });
