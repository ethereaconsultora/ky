import assert from "node:assert/strict";
import { test } from "node:test";

import { FENOMENOS } from "../diagnostico/types.ts";
import {
  estadoFenomenos,
  upsertsFenomenos,
  type FilaFenomeno,
} from "./persistencia-turno.ts";
import type { TurnoSalida } from "./validar.ts";

test("estadoFenomenos: rellena los 5 fenómenos aunque falten filas", () => {
  const r = estadoFenomenos([], {});
  assert.equal(r.length, 5);
  assert.deepEqual(
    r.map((f) => f.fenomeno),
    [...FENOMENOS],
  );
  assert.ok(r.every((f) => f.estado === "en_observacion" && f.preguntas_hechas === 0));
});

test("estadoFenomenos: mergea la fila existente y pega preguntas_hechas", () => {
  const fila: FilaFenomeno = {
    fenomeno_tipo: "mandos_medios",
    cond_evidencia: true,
    cond_recurrencia: true,
    cond_consecuencia: false,
    cond_hipotesis: false,
    estado: "en_observacion",
    intensidad: null,
    confianza: null,
    mecanismo_organizacional: "responsabilidad sin autoridad",
    consecuencia_operativa: null,
    indicador_economico: null,
    mecanismos: [{ hilo: "el_sandwich", evidencia: "presion arriba/abajo" }],
    perfil_mando: null,
    razonamiento: null,
  };
  const r = estadoFenomenos([fila], { mandos_medios: 3 });
  const mm = r.find((f) => f.fenomeno === "mandos_medios")!;
  assert.equal(mm.condiciones.evidencia, true);
  assert.equal(mm.condiciones.recurrencia, true);
  assert.equal(mm.preguntas_hechas, 3);
  assert.equal(mm.mecanismos[0].hilo, "el_sandwich");
  // el resto sigue vacío
  assert.equal(r.find((f) => f.fenomeno === "desgaste")!.preguntas_hechas, 0);
});

test("estadoFenomenos: mecanismos null de la DB → array vacío", () => {
  const fila = {
    fenomeno_tipo: "desgaste",
    cond_evidencia: false,
    cond_recurrencia: false,
    cond_consecuencia: false,
    cond_hipotesis: false,
    estado: "en_observacion",
    intensidad: null,
    confianza: null,
    mecanismo_organizacional: null,
    consecuencia_operativa: null,
    indicador_economico: null,
    mecanismos: null,
    perfil_mando: null,
    razonamiento: null,
  } as FilaFenomeno;
  const r = estadoFenomenos([fila], {});
  assert.deepEqual(r.find((f) => f.fenomeno === "desgaste")!.mecanismos, []);
});

test("upsertsFenomenos: mapea la salida del modelo a filas de la DB", () => {
  const salida: TurnoSalida = {
    fenomenos_actualizados: [
      {
        fenomeno: "mandos_medios",
        condiciones: { evidencia: true, recurrencia: true, consecuencia: true, hipotesis: false },
        estado: "confirmado",
        intensidad: "severo",
        confianza: "media",
        mecanismo_organizacional: "el mando absorbe la disfunción",
        consecuencia_operativa: "retrabajo y demoras",
        indicador_economico_afectado: "friccion",
        mecanismos: [{ hilo: "amortiguador_disfuncion", evidencia: "da la cara por el equipo" }],
        razonamiento: "mando nuevo desbordado",
      },
    ],
    accion: "profundizar",
    fenomeno_siguiente_prioridad: "mandos_medios",
    fin_diagnostico: false,
    sugerencias_pregunta: ["p1", "p2"],
    alerta_seguridad: false,
  };
  const filas = upsertsFenomenos("diag-1", salida, "2026-09-09T00:00:00.000Z");
  assert.equal(filas.length, 1);
  assert.deepEqual(filas[0], {
    diagnostico_id: "diag-1",
    fenomeno_tipo: "mandos_medios",
    cond_evidencia: true,
    cond_recurrencia: true,
    cond_consecuencia: true,
    cond_hipotesis: false,
    estado: "confirmado",
    intensidad: "severo",
    confianza: "media",
    mecanismo_organizacional: "el mando absorbe la disfunción",
    consecuencia_operativa: "retrabajo y demoras",
    indicador_economico: "friccion",
    mecanismos: [{ hilo: "amortiguador_disfuncion", evidencia: "da la cara por el equipo" }],
    razonamiento: "mando nuevo desbordado",
    updated_at: "2026-09-09T00:00:00.000Z",
  });
});
