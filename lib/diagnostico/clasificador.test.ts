import { test } from "node:test";
import assert from "node:assert/strict";

import {
  clasificarDominante,
  clasificarCaso,
  normalizarScore,
  pesosCoDominancia,
} from "./clasificador.ts";
import type {
  Confianza,
  FenomenoDetectado,
  FenomenoTipo,
  Intensidad,
  RelacionFenomeno,
} from "./types.ts";

function fen(
  fenomeno: FenomenoTipo,
  estado: FenomenoDetectado["estado"],
  intensidad: Intensidad | null = null,
  confianza: Confianza | null = null,
): FenomenoDetectado {
  return {
    fenomeno,
    condiciones: {
      evidencia: estado === "confirmado",
      recurrencia: estado === "confirmado",
      consecuencia: estado === "confirmado",
      hipotesis: estado === "confirmado",
    },
    estado,
    intensidad,
    confianza,
    mecanismo_organizacional: null,
    consecuencia_operativa: null,
    indicador_economico: null,
    mecanismos: [],
    perfil_mando: null,
    razonamiento: null,
    preguntas_hechas: 0,
  };
}

test("normalizarScore: null → 0; crítico×alta → 1", () => {
  assert.equal(normalizarScore(null, "alta"), 0);
  assert.equal(normalizarScore("critico", null), 0);
  assert.equal(normalizarScore("critico", "alta"), 1);
  assert.ok(normalizarScore("moderado", "media") > 0 && normalizarScore("moderado", "media") < 1);
});

test("SIN_EVIDENCIA_SUFICIENTE cuando no hay confirmados", () => {
  const r = clasificarDominante([
    fen("mandos_medios", "en_observacion"),
    fen("desgaste", "descartado"),
  ]);
  assert.equal(r.resultado_tipo, "SIN_EVIDENCIA_SUFICIENTE");
  assert.equal(r.fenomeno_dominante, null);
});

test("DOMINANTE_CONFIRMED: 1 fuerte y separado del segundo", () => {
  const r = clasificarDominante([
    fen("mandos_medios", "confirmado", "critico", "alta"), // score 1.0
    fen("desgaste", "confirmado", "leve", "baja"), // score 0.10
  ]);
  assert.equal(r.resultado_tipo, "DOMINANTE_CONFIRMED");
  assert.equal(r.fenomeno_dominante, "mandos_medios");
});

test("DOMINANTE_CONFIRMED: único confirmado con score alto", () => {
  const r = clasificarDominante([fen("desgaste", "confirmado", "severo", "alta")]); // 0.8
  assert.equal(r.resultado_tipo, "DOMINANTE_CONFIRMED");
  assert.equal(r.fenomeno_dominante, "desgaste");
});

test("DOMINANTE_AMBIGUOUS: dos confirmados parejos sin separación", () => {
  const r = clasificarDominante([
    fen("mandos_medios", "confirmado", "severo", "media"), // 0.56
    fen("desgaste", "confirmado", "severo", "media"), // 0.56
  ]);
  assert.equal(r.resultado_tipo, "DOMINANTE_AMBIGUOUS");
  assert.equal(r.fenomeno_dominante, null);
});

test("DOMINANTE_DEBIL: único confirmado con score bajo (B3 del plan, no cae en las otras 3)", () => {
  const r = clasificarDominante([fen("clima_vinculos", "confirmado", "moderado", "media")]); // 0.385
  assert.equal(r.resultado_tipo, "DOMINANTE_DEBIL");
  assert.equal(r.fenomeno_dominante, "clima_vinculos");
});

test("clasificarDominante nunca devuelve undefined (propiedad)", () => {
  const combos: Array<FenomenoDetectado[]> = [
    [],
    [fen("desgaste", "confirmado", "leve", "baja")],
    [fen("desgaste", "confirmado", "critico", "alta"), fen("estructura", "confirmado", "critico", "alta")],
    [fen("desgaste", "en_observacion")],
  ];
  for (const c of combos) {
    const r = clasificarDominante(c);
    assert.ok(
      ["DOMINANTE_CONFIRMED", "DOMINANTE_AMBIGUOUS", "DOMINANTE_DEBIL", "SIN_EVIDENCIA_SUFICIENTE"].includes(
        r.resultado_tipo,
      ),
    );
  }
});

test("clasificarCaso: prioridad circuito confirmado > hipotético > co-dominante > dominante", () => {
  const rel = (tipo: RelacionFenomeno["tipo"]): RelacionFenomeno => ({
    fenomeno_a: "mandos_medios",
    fenomeno_b: "desgaste",
    tipo,
    evidencia_soporte: "",
  });
  assert.equal(clasificarCaso([]), 1);
  assert.equal(clasificarCaso([rel("A_B")]), 1);
  assert.equal(clasificarCaso([rel("A_PERP_B")]), 2);
  assert.equal(clasificarCaso([rel("A_PERP_B"), rel("A_HIP_B")]), 3);
  assert.equal(clasificarCaso([rel("A_HIP_B"), rel("A_CONF_B")]), 4);
});

test("pesosCoDominancia suma 1", () => {
  const pesos = pesosCoDominancia([
    fen("mandos_medios", "confirmado", "severo", "alta"), // 0.8
    fen("desgaste", "confirmado", "moderado", "media"), // 0.385
  ]);
  const suma = pesos.reduce((a, p) => a + p.peso, 0);
  assert.ok(Math.abs(suma - 1) < 1e-9);
  assert.ok(pesos.find((p) => p.fenomeno === "mandos_medios")!.peso > 0.5);
});
