/**
 * alta-diagnostico - validacion del body de POST /api/diagnostico y armado de
 * las filas a insertar. Puro: sin Supabase ni Next.
 */

import { z } from "zod";

export const AltaDiagnosticoBody = z
  .object({
    empresa: z.object({
      /** Si viene, se reutiliza una empresa ya conocida por el counselor (se verifica por RLS). */
      id: z.string().uuid().optional(),
      nombre: z.string().trim().min(1, "Falta el nombre de la empresa").max(200),
      sector: z.string().trim().max(120).optional(),
    }),
    datos_economicos: z.object({
      n_empleados: z.number().int().min(1).max(1_000_000),
      s_salario_mensual: z.number().positive().max(1_000_000_000),
      /** Fraccion 0-1 (la UI convierte desde %). */
      r_rotacion_anual: z.number().min(0).max(1),
      /** Los 3 ejes de friccion son OPCIONALES (DD-05). Escala 1-5. */
      ejes: z.tuple([z.number().min(1).max(5), z.number().min(1).max(5), z.number().min(1).max(5)]).optional(),
    }),
    modo_captura: z.enum(["manual", "audio_transcrito"]),
    consentimiento: z
      .object({
        texto_id: z.string().uuid(),
        aceptado_por: z.string().trim().min(2, "Falta quién acepta").max(200),
      })
      .optional(),
  })
  .superRefine((b, ctx) => {
    if (b.modo_captura === "audio_transcrito" && !b.consentimiento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consentimiento"],
        message: "El modo audio requiere el consentimiento del entrevistado.",
      });
    }
  });

export type AltaDiagnostico = z.infer<typeof AltaDiagnosticoBody>;

export interface VersionesAuditoria {
  prompt_version: string;
  mapa_indagacion_version: string;
}

export function filaEmpresa(b: AltaDiagnostico) {
  return {
    nombre: b.empresa.nombre,
    sector: b.empresa.sector || null,
    tamano_n: b.datos_economicos.n_empleados,
  };
}

export function filaDiagnostico(
  b: AltaDiagnostico,
  empresaId: string,
  counselorId: string,
  v: VersionesAuditoria,
) {
  return {
    empresa_id: empresaId,
    version: "B" as const,
    counselor_id: counselorId,
    modo_captura: b.modo_captura,
    estado: "en_curso" as const,
    prompt_version: v.prompt_version,
    mapa_indagacion_version: v.mapa_indagacion_version,
  };
}

export function filaDatosEconomicos(b: AltaDiagnostico, diagnosticoId: string) {
  const e = b.datos_economicos.ejes;
  return {
    diagnostico_id: diagnosticoId,
    n_empleados: b.datos_economicos.n_empleados,
    s_salario_mensual: b.datos_economicos.s_salario_mensual,
    r_rotacion_anual: b.datos_economicos.r_rotacion_anual,
    eje_1: e?.[0] ?? null,
    eje_2: e?.[1] ?? null,
    eje_3: e?.[2] ?? null,
  };
}

export function filaConsentimiento(b: AltaDiagnostico, diagnosticoId: string) {
  if (!b.consentimiento) return null;
  return {
    diagnostico_id: diagnosticoId,
    texto_id: b.consentimiento.texto_id,
    aceptado_por: b.consentimiento.aceptado_por,
  };
}
