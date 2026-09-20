import assert from "node:assert/strict";
import { test } from "node:test";

import { aplicarGuardarrailes } from "./guardarrailes.ts";
import type { FenomenoActualizado, TurnoSalida } from "./validar.ts";

const TODAS = { evidencia: true, recurrencia: true, consecuencia: true, hipotesis: true };

/** Lo que devolvió Gemini en la prueba real: TODO confirmado, severo, alta, tras UN solo turno. */
function confirmadoDeUnSoloTurno(): FenomenoActualizado {
  return {
    fenomeno: "mandos_medios",
    condiciones: { ...TODAS },
    estado: "confirmado",
    intensidad: "severo",
    confianza: "alta",
    mecanismo_organizacional: "amortiguador entre dirección y planta",
    consecuencia_operativa: "saturación y mantenimiento postergado",
    indicador_economico_afectado: "rotacion",
    mecanismos: [{ hilo: "el_sandwich", evidencia: "presión de arriba y de abajo" }],
    razonamiento: "mando nuevo desbordado",
  };
}

function salida(f: FenomenoActualizado, extra: Partial<TurnoSalida> = {}): TurnoSalida {
  return {
    fenomenos_actualizados: [f],
    accion: "cerrar",
    fenomeno_siguiente_prioridad: "desgaste",
    fin_diagnostico: false,
    sugerencias_pregunta: ["p1", "p2"],
    alerta_seguridad: false,
    ...extra,
  };
}

test("CASO REAL: 1 solo turno → NO queda confirmado, sin intensidad/confianza/conclusiones", () => {
  const r = aplicarGuardarrailes(salida(confirmadoDeUnSoloTurno()), {
    turnos: 1,
    turnosPropiosPrevios: {},
  });
  const f = r.salida.fenomenos_actualizados[0];
  assert.equal(f.estado, "en_observacion");
  assert.equal(f.intensidad, null);
  assert.equal(f.confianza, null);
  assert.equal(f.mecanismo_organizacional, null);
  assert.equal(f.consecuencia_operativa, null);
  assert.equal(f.indicador_economico_afectado, null);
  // conserva lo observado (evidencia), recorta el resto de condiciones
  assert.equal(f.mecanismos.length, 1);
  assert.equal(f.condiciones.evidencia, true);
  assert.equal(f.condiciones.hipotesis, false);
  assert.match(f.razonamiento ?? "", /guardarraíl/);
  assert.equal(r.progreso.puede_concluir, false);
  assert.equal(r.progreso.faltan, 9);
  assert.ok(r.avisos.length > 0);
});

test("una confirmación retenida no puede dejar la acción en 'cerrar'", () => {
  const r = aplicarGuardarrailes(salida(confirmadoDeUnSoloTurno()), { turnos: 1, turnosPropiosPrevios: {} });
  assert.equal(r.salida.accion, "profundizar");
  assert.equal(r.salida.fenomeno_siguiente_prioridad, "mandos_medios");
});

test("R1: fin_diagnostico se fuerza a false antes del piso y se define un siguiente fenómeno", () => {
  const f = confirmadoDeUnSoloTurno();
  const r = aplicarGuardarrailes(
    salida(f, { fin_diagnostico: true, fenomeno_siguiente_prioridad: null, accion: "profundizar" }),
    { turnos: 4, turnosPropiosPrevios: { mandos_medios: 3, desgaste: 1 } },
  );
  assert.equal(r.salida.fin_diagnostico, false);
  assert.ok(r.salida.fenomeno_siguiente_prioridad !== null);
  assert.ok(r.correcciones.some((c) => c.regla === "R1" && c.fenomeno === null));
});

test("R1 aunque el fenómeno tenga muchos turnos propios: bajo 10 turnos totales no se confirma", () => {
  const r = aplicarGuardarrailes(salida(confirmadoDeUnSoloTurno()), {
    turnos: 9,
    turnosPropiosPrevios: { mandos_medios: 5 },
  });
  assert.equal(r.salida.fenomenos_actualizados[0].estado, "en_observacion");
  assert.ok(r.correcciones.some((c) => c.regla === "R1"));
});

test("R2: pasado el piso global, un fenómeno con 1 turno propio TAMPOCO se confirma", () => {
  const r = aplicarGuardarrailes(salida(confirmadoDeUnSoloTurno()), {
    turnos: 12,
    turnosPropiosPrevios: { mandos_medios: 0 },
  });
  const f = r.salida.fenomenos_actualizados[0];
  assert.equal(f.estado, "en_observacion");
  assert.equal(f.condiciones.hipotesis, false);
  assert.ok(r.correcciones.some((c) => c.regla === "R2"));
});

test("camino feliz: turno 12, fenómeno con 3 turnos propios previos → confirmado se respeta", () => {
  const r = aplicarGuardarrailes(salida(confirmadoDeUnSoloTurno()), {
    turnos: 12,
    turnosPropiosPrevios: { mandos_medios: 3 },
  });
  const f = r.salida.fenomenos_actualizados[0];
  assert.equal(f.estado, "confirmado");
  assert.equal(f.intensidad, "severo");
  assert.equal(f.confianza, "alta"); // 3 previos + este = 4 turnos propios
  assert.equal(r.correcciones.length, 0);
  assert.equal(r.avisos.length, 0);
  assert.equal(r.progreso.puede_concluir, true);
  assert.equal(r.salida.accion, "cerrar");
});

test("camino feliz mínimo: 2 turnos previos + este = 3 propios → confirma pero la confianza baja a media (R3)", () => {
  const r = aplicarGuardarrailes(salida(confirmadoDeUnSoloTurno()), {
    turnos: 10,
    turnosPropiosPrevios: { mandos_medios: 2 },
  });
  const f = r.salida.fenomenos_actualizados[0];
  assert.equal(f.estado, "confirmado");
  assert.equal(f.confianza, "media");
  assert.deepEqual(
    r.correcciones.map((c) => c.regla),
    ["R3"],
  );
});

test("un fenómeno en observación no se toca y no genera avisos", () => {
  const f: FenomenoActualizado = {
    ...confirmadoDeUnSoloTurno(),
    estado: "en_observacion",
    intensidad: null,
    confianza: null,
    condiciones: { evidencia: true, recurrencia: false, consecuencia: false, hipotesis: false },
  };
  const r = aplicarGuardarrailes(salida(f, { accion: "profundizar" }), { turnos: 2, turnosPropiosPrevios: {} });
  assert.equal(r.correcciones.length, 0);
  assert.equal(r.salida.accion, "profundizar");
});

test("no muta la salida original del modelo", () => {
  const original = salida(confirmadoDeUnSoloTurno());
  const copia = JSON.parse(JSON.stringify(original));
  aplicarGuardarrailes(original, { turnos: 1, turnosPropiosPrevios: {} });
  assert.deepEqual(original, copia);
});
