/**
 * motor-economico — Función pura, determinística, sin IA (matriz §Motor Económico
 * y §Motor Económico Ajustado).
 *
 * Se ejecuta UNA vez, al cerrar el diagnóstico. Deriva el factor de fricción de
 * los fenómenos confirmados (DD-05) salvo que se hayan cargado los 3 ejes.
 * La "reducción proyectada" y el ROI SIEMPRE salen como rango (regla de la matriz).
 */

import { pesosCoDominancia } from "./clasificador.ts";
import {
  DELTA_FACTOR_FRICCION,
  ECONOMICO,
  FACTOR_CONFIANZA_CIRCUITO,
  FENOMENOS_DEF,
  NORM_INTENSIDAD,
} from "./matriz.config.ts";
import type {
  CasoDiagnostico,
  DatosEconomicos,
  FenomenoDetectado,
  FenomenoTipo,
  HorizonteProyeccion,
  Rango,
  ResultadoEconomico,
} from "./types.ts";

const HORIZONTE_MESES: Record<HorizonteProyeccion, number> = {
  "6m": 6,
  "12m": 12,
  "24m": 24,
};

const clamp = (x: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, x));

/** Interpolación lineal del grado entre la ancla temprana (6m) y la tardía (24m). */
export function gradoEnHorizonte(
  gradoTemprano: number,
  gradoTardio: number,
  horizonte: HorizonteProyeccion,
): number {
  const frac = clamp((HORIZONTE_MESES[horizonte] - 6) / (24 - 6), 0, 1);
  return gradoTemprano + (gradoTardio - gradoTemprano) * frac;
}

/** Factor de fricción: por ejes si se cargaron; si no, derivado de los fenómenos. */
export function calcularFactorFriccion(
  datos: DatosEconomicos,
  fenomenos: FenomenoDetectado[],
): { factor: number; origen: ResultadoEconomico["factor_friccion_origen"] } {
  if (datos.ejes && datos.ejes.length === 3) {
    const prom = (datos.ejes[0] + datos.ejes[1] + datos.ejes[2]) / 3;
    return { factor: ECONOMICO.friccion_por_ejes(prom), origen: "ejes" };
  }

  const confirmados = fenomenos.filter((f) => f.estado === "confirmado");
  if (confirmados.length === 0) {
    return { factor: 0.75, origen: "default" };
  }

  const suma = confirmados.reduce((acc, f) => {
    const intensidadNorm = f.intensidad ? NORM_INTENSIDAD[f.intensidad] : 0;
    return acc + DELTA_FACTOR_FRICCION[f.fenomeno] * intensidadNorm;
  }, 0);

  const factor = clamp(
    ECONOMICO.friccion_min + suma,
    ECONOMICO.friccion_min,
    ECONOMICO.friccion_max,
  );
  return { factor, origen: "derivado" };
}

export interface ParamsMotorEconomico {
  datos: DatosEconomicos;
  fenomenos: FenomenoDetectado[];
  caso: CasoDiagnostico;
  horizonte: HorizonteProyeccion;
  /** Reversibilidad estimada por la síntesis. Si falta, se usa la de la matriz. */
  reversibilidadPorFenomeno?: Partial<
    Record<FenomenoTipo, { grado_temprano: number; grado_tardio: number }>
  >;
  /** Sólo Caso 3/4: reversibilidad del punto de accesibilidad del circuito. */
  circuito?: {
    alcance: number;
    grado_temprano: number;
    grado_tardio: number;
    hipotetico: boolean;
  };
}

export function motorEconomico(p: ParamsMotorEconomico): ResultadoEconomico {
  const { datos, fenomenos, caso, horizonte } = p;
  const { n, s, r } = datos;

  const { factor, origen } = calcularFactorFriccion(datos, fenomenos);

  const presentismo = n * s * 12 * ECONOMICO.presentismo_factor;
  const rotacion =
    n * r * (s * ECONOMICO.rotacion_meses_salario) * factor;
  const perdidaTotal = presentismo + rotacion;
  const reduccionBase = perdidaTotal * ECONOMICO.reduccion_base_flat;
  const costoIntervencion = n * s * ECONOMICO.costo_intervencion_factor;

  const rev = (f: FenomenoTipo) =>
    p.reversibilidadPorFenomeno?.[f] ?? {
      grado_temprano: FENOMENOS_DEF[f].reversibilidad.grado_temprano,
      grado_tardio: FENOMENOS_DEF[f].reversibilidad.grado_tardio,
    };

  const confirmadosOrdenados = [...fenomenos]
    .filter((f) => f.estado === "confirmado")
    .sort(
      (a, b) =>
        (b.intensidad ? NORM_INTENSIDAD[b.intensidad] : 0) -
        (a.intensidad ? NORM_INTENSIDAD[a.intensidad] : 0),
    );

  let reduccionProyectada: Rango;

  if (caso === 1) {
    // Fenómeno dominante: min con grado_temprano, max con grado_tardio.
    const dom = confirmadosOrdenados[0]?.fenomeno;
    const g = dom ? rev(dom) : { grado_temprano: 0, grado_tardio: 0 };
    reduccionProyectada = {
      min: perdidaTotal * g.grado_temprano,
      max: perdidaTotal * g.grado_tardio,
    };
  } else if (caso === 2) {
    // Co-dominante: Σ peso_i · perdida · grado_i(t). Rango con ambas anclas.
    const pesos = pesosCoDominancia(fenomenos);
    let min = 0;
    let max = 0;
    for (const { fenomeno, peso } of pesos) {
      const g = rev(fenomeno);
      min += peso * perdidaTotal * g.grado_temprano;
      max += peso * perdidaTotal * g.grado_tardio;
    }
    reduccionProyectada = { min, max };
  } else {
    // Caso 3/4 — circuito. reduccion = perdida · alcance · grado_reversion(t) · factor_confianza.
    const c = p.circuito ?? {
      alcance: 0.5,
      grado_temprano: 0.35,
      grado_tardio: 0.5,
      hipotetico: caso === 3,
    };
    const fc = c.hipotetico
      ? FACTOR_CONFIANZA_CIRCUITO.hipotetico
      : FACTOR_CONFIANZA_CIRCUITO.confirmado;
    reduccionProyectada = {
      min: perdidaTotal * c.alcance * c.grado_temprano * fc,
      max: perdidaTotal * c.alcance * c.grado_tardio * fc,
    };
  }

  const roi: Rango = {
    min: ((reduccionProyectada.min - costoIntervencion) / costoIntervencion) * 100,
    max: ((reduccionProyectada.max - costoIntervencion) / costoIntervencion) * 100,
  };

  return {
    factor_friccion: round2(factor),
    factor_friccion_origen: origen,
    presentismo: round0(presentismo),
    rotacion: round0(rotacion),
    perdida_total: round0(perdidaTotal),
    reduccion_base: round0(reduccionBase),
    reduccion_proyectada: {
      min: round0(reduccionProyectada.min),
      max: round0(reduccionProyectada.max),
    },
    roi: { min: round1(roi.min), max: round1(roi.max) },
    horizonte,
    caso,
  };
}

const round0 = (x: number) => Math.round(x);
const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;
