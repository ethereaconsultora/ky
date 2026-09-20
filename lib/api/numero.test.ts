import assert from "node:assert/strict";
import { test } from "node:test";

import { parseNumeroAR } from "./numero.ts";

test("enteros y miles con punto", () => {
  assert.equal(parseNumeroAR("240"), 240);
  assert.equal(parseNumeroAR("850.000"), 850000);
  assert.equal(parseNumeroAR("1.250.000"), 1250000);
});

test("decimales con coma o con punto", () => {
  assert.equal(parseNumeroAR("18,5"), 18.5);
  assert.equal(parseNumeroAR("18.5"), 18.5);
  assert.equal(parseNumeroAR("0,18"), 0.18);
});

test("miles y decimales juntos", () => {
  assert.equal(parseNumeroAR("1.234,56"), 1234.56);
  assert.equal(parseNumeroAR("1,234.56"), 1234.56);
});

test("tolera $, % y espacios", () => {
  assert.equal(parseNumeroAR(" $ 850.000 "), 850000);
  assert.equal(parseNumeroAR("18 %"), 18);
});

test("inválidos → null", () => {
  for (const x of ["", "  ", "abc", "1,2,3", "12a", "--3"]) assert.equal(parseNumeroAR(x), null, x);
});
