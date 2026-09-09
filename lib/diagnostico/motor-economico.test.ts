import { test } from "node:test";
import assert from "node:assert/strict";

import {
  calcularFactorFriccion,
  gradoEnHorizonte,
  motorEconomico,
} from "./motor-economico.ts";
import { FENOMENOS_DEF } from "./matriz.config.ts";
import type { FenomenoDetectado } from "./types.ts";

function conf(
  fenomeno: FenomenoDetectado["fenomeno"],
  intensidad: FenomenoDetectado["intensidad"],
  confianza: FenomenoDetectado["confianza"],
): FenomenoDetectado {
  return {
    fenomeno,
    condiciones: { evidencia: true, recurrencia: true, consecuencia: true, hipotesis: true },
    estado: "confirmado",
    intensidad,
    confianza,
    mecanismo_organizacional: "x",
    consecuencia_operativa: "y",
    indicador_economico: "presentismo",
    mecanismos: [],
    perfil_mando: null,
    razonamiento: null,
    preguntas_hechas: 2,
  };
}

const DATOS = { n: 100, s: 850_000, r: 0.15 };

test("presentismo y rotación coinciden con la fórmula de la matriz", () => {
  // factor forzado vía ejes (promedio 2.5 → 0.75)
  const res = motorEconomico({
    datos: { ...DATOS, ejes: [2.5, 2.5, 2.5] },
    fenomenos: [conf("mandos_medios", "severo", "alta")],
    caso: 1,
    horizonte: "12m",
  });
  const presentismoEsperado = 100 * 850_000 * 12 * 0.048;
  const rotacionEsperada = 100 * 0.15 * (850_000 * 3) * 0.75;
  assert.equal(res.presentismo, Math.round(presentismoEsperado));
  assert.equal(res.rotacion, Math.round(rotacionEsperada));
  assert.equal(res.perdida_total, Math.round(presentismoEsperado + rotacionEsperada));
  assert.equal(res.factor_friccion, 0.75);
  assert.equal(res.factor_friccion_origen, "ejes");
});

test("factor de fricción derivado de fenómenos confirmados (DD-05)", () => {
  const { factor, origen } = calcularFactorFriccion(DATOS, [
    conf("desgaste", "severo", "alta"), // delta 0.5 × 0.8 = 0.40
  ]);
  assert.equal(origen, "derivado");
  // 0.5 (min) + 0.40 = 0.90
  assert.ok(Math.abs(factor - 0.9) < 1e-9);
});

test("factor de fricción: clamp a friccion_max", () => {
  const { factor } = calcularFactorFriccion(DATOS, [
    conf("desgaste", "critico", "alta"),
    conf("estructura", "critico", "alta"),
    conf("clima_vinculos", "critico", "alta"),
  ]);
  assert.equal(factor, 1.2);
});

test("factor de fricción: default cuando no hay ejes ni confirmados", () => {
  const { factor, origen } = calcularFactorFriccion(DATOS, []);
  assert.equal(factor, 0.75);
  assert.equal(origen, "default");
});

test("la reducción proyectada SIEMPRE es un rango (min <= max), nunca escalar", () => {
  for (const caso of [1, 2, 3, 4] as const) {
    const res = motorEconomico({
      datos: DATOS,
      fenomenos: [
        conf("mandos_medios", "severo", "alta"),
        conf("desgaste", "moderado", "media"),
      ],
      caso,
      horizonte: "12m",
      circuito: { alcance: 0.4, grado_temprano: 0.35, grado_tardio: 0.5, hipotetico: caso === 3 },
    });
    assert.ok(typeof res.reduccion_proyectada.min === "number");
    assert.ok(typeof res.reduccion_proyectada.max === "number");
    assert.ok(res.reduccion_proyectada.min <= res.reduccion_proyectada.max);
    assert.ok(res.roi.min <= res.roi.max);
  }
});

test("Caso 3 (circuito hipotético) aplica el descuento 0.5 respecto del Caso 4", () => {
  const base = {
    datos: DATOS,
    fenomenos: [conf("mandos_medios", "severo", "alta"), conf("desgaste", "severo", "alta")],
    horizonte: "12m" as const,
    circuito: { alcance: 0.4, grado_temprano: 0.35, grado_tardio: 0.5, hipotetico: true },
  };
  const c3 = motorEconomico({ ...base, caso: 3 });
  const c4 = motorEconomico({
    ...base,
    caso: 4,
    circuito: { ...base.circuito, hipotetico: false },
  });
  assert.ok(Math.abs(c3.reduccion_proyectada.max - c4.reduccion_proyectada.max * 0.5) < 1);
});

test("gradoEnHorizonte interpola linealmente entre 6m y 24m", () => {
  assert.equal(gradoEnHorizonte(0.2, 0.5, "6m"), 0.2);
  assert.equal(gradoEnHorizonte(0.2, 0.5, "24m"), 0.5);
  assert.ok(Math.abs(gradoEnHorizonte(0.2, 0.5, "12m") - (0.2 + (0.5 - 0.2) * (6 / 18))) < 1e-9);
});

test("Caso 1 usa la reversibilidad del fenómeno dominante (matriz por defecto)", () => {
  const res = motorEconomico({
    datos: { ...DATOS, ejes: [3, 3, 3] },
    fenomenos: [conf("transicion", "severo", "alta")],
    caso: 1,
    horizonte: "6m",
  });
  const g = FENOMENOS_DEF.transicion.reversibilidad;
  assert.equal(res.reduccion_proyectada.min, Math.round(res.perdida_total * g.grado_temprano));
  assert.equal(res.reduccion_proyectada.max, Math.round(res.perdida_total * g.grado_tardio));
});
