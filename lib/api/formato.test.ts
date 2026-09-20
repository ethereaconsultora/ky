import assert from "node:assert/strict";
import { test } from "node:test";

import { fmtMoneda, fmtPorcentaje, fmtRangoMoneda, fmtRangoPorcentaje, fmtRangoRoi } from "./formato.ts";

const sinNbsp = (s: string) => s.replace(/ /g, " ").replace(/ /g, " ");

test("moneda con separador de miles argentino", () => {
  assert.match(sinNbsp(fmtMoneda(1250000)), /^\$ 1[.,]250[.,]000$/);
});

test("los rangos muestran min y max", () => {
  assert.match(sinNbsp(fmtRangoMoneda(1000, 2000)), /1[.,]000 – \$ 2[.,]000/);
  assert.equal(sinNbsp(fmtRangoPorcentaje(0.4, 0.5)), "40–50 %");
  assert.equal(sinNbsp(fmtRangoPorcentaje(0.3, 0.3)), "30 %");
});

test("porcentaje y ROI", () => {
  assert.equal(sinNbsp(fmtPorcentaje(0.18)), "18 %");
  assert.match(sinNbsp(fmtRangoRoi(112.5, 340.2)), /^11[3.,]?\d* % a 340 %$|^113 % a 340 %$/);
});
