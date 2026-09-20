import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AltaDiagnosticoBody,
  filaConsentimiento,
  filaDatosEconomicos,
  filaDiagnostico,
  filaEmpresa,
} from "./alta-diagnostico.ts";

const UUID = "5f0b1c2e-8a4d-4c1a-9b7e-3d2f6a1b0c9d";

const valido = {
  empresa: { nombre: "  Manufacturas del Sur ", sector: "manufactura" },
  datos_economicos: { n_empleados: 240, s_salario_mensual: 850000, r_rotacion_anual: 0.18 },
  modo_captura: "manual",
};

test("acepta un alta mínima válida y recorta espacios", () => {
  const r = AltaDiagnosticoBody.parse(valido);
  assert.equal(r.empresa.nombre, "Manufacturas del Sur");
});

test("rechaza rotación fuera de 0–1 (la UI manda fracción, no porcentaje)", () => {
  const r = AltaDiagnosticoBody.safeParse({
    ...valido,
    datos_economicos: { ...valido.datos_economicos, r_rotacion_anual: 18 },
  });
  assert.equal(r.success, false);
});

test("rechaza empleados no enteros, cero o salario no positivo", () => {
  for (const d of [
    { n_empleados: 0, s_salario_mensual: 1, r_rotacion_anual: 0.1 },
    { n_empleados: 10.5, s_salario_mensual: 1, r_rotacion_anual: 0.1 },
    { n_empleados: 10, s_salario_mensual: 0, r_rotacion_anual: 0.1 },
  ]) {
    assert.equal(AltaDiagnosticoBody.safeParse({ ...valido, datos_economicos: d }).success, false);
  }
});

test("el modo audio EXIGE consentimiento; con consentimiento pasa", () => {
  const sin = AltaDiagnosticoBody.safeParse({ ...valido, modo_captura: "audio_transcrito" });
  assert.equal(sin.success, false);
  const con = AltaDiagnosticoBody.safeParse({
    ...valido,
    modo_captura: "audio_transcrito",
    consentimiento: { texto_id: UUID, aceptado_por: "María Pérez, Gerenta de RRHH" },
  });
  assert.equal(con.success, true);
});

test("los 3 ejes son opcionales y van de 1 a 5", () => {
  const ok = AltaDiagnosticoBody.parse({
    ...valido,
    datos_economicos: { ...valido.datos_economicos, ejes: [2, 3, 4] },
  });
  assert.deepEqual(ok.datos_economicos.ejes, [2, 3, 4]);
  const mal = AltaDiagnosticoBody.safeParse({
    ...valido,
    datos_economicos: { ...valido.datos_economicos, ejes: [2, 3, 6] },
  });
  assert.equal(mal.success, false);
});

test("arma las filas: versión B, en_curso, counselor y auditoría de versiones", () => {
  const b = AltaDiagnosticoBody.parse({
    ...valido,
    datos_economicos: { ...valido.datos_economicos, ejes: [1, 2, 3] },
  });
  assert.deepEqual(filaEmpresa(b), { nombre: "Manufacturas del Sur", sector: "manufactura", tamano_n: 240 });
  assert.deepEqual(filaDiagnostico(b, "emp-1", "user-1", { prompt_version: "p1", mapa_indagacion_version: "m1" }), {
    empresa_id: "emp-1",
    version: "B",
    counselor_id: "user-1",
    modo_captura: "manual",
    estado: "en_curso",
    prompt_version: "p1",
    mapa_indagacion_version: "m1",
  });
  assert.deepEqual(filaDatosEconomicos(b, "diag-1"), {
    diagnostico_id: "diag-1",
    n_empleados: 240,
    s_salario_mensual: 850000,
    r_rotacion_anual: 0.18,
    eje_1: 1,
    eje_2: 2,
    eje_3: 3,
  });
  assert.equal(filaConsentimiento(b, "diag-1"), null);
});

test("sin ejes → eje_1..3 quedan null (el factor se deriva al cierre)", () => {
  const b = AltaDiagnosticoBody.parse(valido);
  const f = filaDatosEconomicos(b, "d");
  assert.deepEqual([f.eje_1, f.eje_2, f.eje_3], [null, null, null]);
});
