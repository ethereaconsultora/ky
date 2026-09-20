import assert from "node:assert/strict";
import { test } from "node:test";

import { clasificarDominante } from "./clasificador.ts";
import { GUARDARRAILES, PRESUPUESTO } from "./matriz.config.ts";
import {
  confianzaMaxima,
  evaluarCierre,
  maxCondiciones,
  puedeConcluir,
  recortarCondiciones,
  turnosFaltantes,
  turnosMinimosParaConfirmar,
} from "./suficiencia.ts";
import type { FenomenoDetectado } from "./types.ts";

test("R1: el piso global es 10 y el presupuesto blando lo respeta", () => {
  assert.equal(GUARDARRAILES.min_turnos_diagnostico, 10);
  assert.equal(PRESUPUESTO.blando_min, 10);
});

test("R1: con 1..9 turnos NO se puede concluir; con 10 sí", () => {
  for (let t = 1; t <= 9; t++) assert.equal(puedeConcluir(t), false, `turno ${t}`);
  assert.equal(puedeConcluir(10), true);
  assert.equal(turnosFaltantes(3), 7);
  assert.equal(turnosFaltantes(10), 0);
  assert.equal(turnosFaltantes(25), 0);
});

test("R1: evaluarCierre fuerza SIN_EVIDENCIA_SUFICIENTE bajo el piso", () => {
  const corto = evaluarCierre(3);
  assert.equal(corto.diagnostico_permitido, false);
  assert.equal(corto.faltan, 7);
  assert.equal(corto.resultado_forzado, "SIN_EVIDENCIA_SUFICIENTE");
  const ok = evaluarCierre(10);
  assert.equal(ok.diagnostico_permitido, true);
  assert.equal(ok.resultado_forzado, null);
});

test("R2: condiciones permitidas por turnos propios (2, 3, 4) y confirmar exige 3 turnos", () => {
  assert.equal(maxCondiciones(0), 0);
  assert.equal(maxCondiciones(1), 2);
  assert.equal(maxCondiciones(2), 3);
  assert.equal(maxCondiciones(3), 4);
  assert.equal(maxCondiciones(9), 4);
  assert.equal(turnosMinimosParaConfirmar(), 3);
});

test("R2: con 1 turno propio se recortan las 4 condiciones a 2 (cae primero la hipótesis)", () => {
  const todas = { evidencia: true, recurrencia: true, consecuencia: true, hipotesis: true };
  const r = recortarCondiciones(todas, 1);
  assert.deepEqual(r.condiciones, {
    evidencia: true,
    recurrencia: true,
    consecuencia: false,
    hipotesis: false,
  });
  assert.equal(r.recortadas, 2);
  assert.equal(recortarCondiciones(todas, 3).recortadas, 0);
});

test("R2: no inventa condiciones que el modelo no marcó", () => {
  const r = recortarCondiciones(
    { evidencia: true, recurrencia: false, consecuencia: false, hipotesis: false },
    1,
  );
  assert.equal(r.recortadas, 0);
  assert.equal(r.condiciones.recurrencia, false);
});

test("R3: confianza alta sólo con 4+ turnos propios", () => {
  assert.equal(confianzaMaxima(1), "media");
  assert.equal(confianzaMaxima(3), "media");
  assert.equal(confianzaMaxima(4), "alta");
});

test("clasificarDominante: con pocos turnos NUNCA hay dominante, aunque figure un confirmado", () => {
  const confirmado: FenomenoDetectado = {
    fenomeno: "mandos_medios",
    condiciones: { evidencia: true, recurrencia: true, consecuencia: true, hipotesis: true },
    estado: "confirmado",
    intensidad: "critico",
    confianza: "alta",
    mecanismo_organizacional: "x",
    consecuencia_operativa: "y",
    indicador_economico: "rotacion",
    mecanismos: [],
    perfil_mando: null,
    razonamiento: null,
    preguntas_hechas: 4,
  };
  assert.equal(clasificarDominante([confirmado], { turnos: 3 }).resultado_tipo, "SIN_EVIDENCIA_SUFICIENTE");
  assert.equal(clasificarDominante([confirmado], { turnos: 3 }).fenomeno_dominante, null);
  // sin `turnos` (o con >= 10) sigue clasificando como antes
  assert.equal(clasificarDominante([confirmado]).resultado_tipo, "DOMINANTE_CONFIRMED");
  assert.equal(clasificarDominante([confirmado], { turnos: 10 }).resultado_tipo, "DOMINANTE_CONFIRMED");
});
