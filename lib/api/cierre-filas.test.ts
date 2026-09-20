import assert from "node:assert/strict";
import { test } from "node:test";

import type { IntervencionCierre } from "../ia/cierre.ts";
import { filaIntervencion, filaPerdidaEconomica, filaReversibilidad, filasRelaciones } from "./cierre-filas.ts";

const interv: IntervencionCierre = {
  fenomenos_objetivo: ["mandos_medios"],
  descripcion: "d",
  traduccion_humana: "t",
  reversibilidad: { aplica_a: "fenomeno:mandos_medios", grado_temprano: 0.4, grado_tardio: 0.5, plazo_aparicion_efecto: "corto", justificacion: "j" },
  horizonte_proyeccion: "12m",
  origen: "modelo",
};

test("pérdida económica: reducción y ROI van como rango", () => {
  const f = filaPerdidaEconomica("d1", {
    factor_friccion: 0.9,
    factor_friccion_origen: "derivado",
    presentismo: 100,
    rotacion: 200,
    perdida_total: 300,
    reduccion_base: 120,
    reduccion_proyectada: { min: 100, max: 150 },
    roi: { min: 10.5, max: 80 },
    horizonte: "12m",
    caso: 1,
  });
  assert.equal(f.reduccion_ajustada_min, 100);
  assert.equal(f.reduccion_ajustada_max, 150);
  assert.equal(f.roi_min, 10.5);
  assert.equal(f.roi_max, 80);
  assert.equal(f.horizonte_proyeccion, "12m");
});

test("reversibilidad: circuito hipotético 0.5, confirmado 1.0, no circuito null", () => {
  assert.equal(filaReversibilidad("d", interv, 1).factor_confianza_circuito, null);
  assert.equal(filaReversibilidad("d", interv, 1).alcance, null);
  assert.equal(filaReversibilidad("d", interv, 3).factor_confianza_circuito, 0.5);
  assert.equal(filaReversibilidad("d", interv, 4).factor_confianza_circuito, 1);
  assert.equal(filaReversibilidad("d", interv, 4).alcance, 0.5);
});

test("la intervención NUNCA nace aprobada", () => {
  const f = filaIntervencion("d", 2, interv, "rev-1");
  assert.equal(f.aprobada_por_consultor, false);
  assert.equal(f.reversibilidad_id, "rev-1");
  assert.deepEqual(f.fenomenos_objetivo, ["mandos_medios"]);
});

test("relaciones: se replica el punto de accesibilidad", () => {
  const r = filasRelaciones("d", [{ fenomeno_a: "mandos_medios", fenomeno_b: "clima_vinculos", tipo: "A_HIP_B", evidencia_soporte: "e" }], "reunión semanal");
  assert.equal(r.length, 1);
  assert.equal(r[0].tipo_relacion, "A_HIP_B");
  assert.equal(r[0].punto_accesibilidad_sugerido, "reunión semanal");
});
