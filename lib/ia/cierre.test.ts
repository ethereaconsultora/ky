import assert from "node:assert/strict";
import { test } from "node:test";

import type { FenomenoDetectado, FenomenoTipo } from "../diagnostico/types.ts";
import { ejecutarCierre, normalizarReversibilidad, type EntradaCierre } from "./cierre.ts";
import type { ClienteModelo } from "./tipos.ts";
import type { SintesisSalida } from "./validar.ts";

const USO = { modelo: "fake", tokens_in: 1, tokens_out: 1, latencia_ms: 1 };

function fen(f: FenomenoTipo, over: Partial<FenomenoDetectado> = {}): FenomenoDetectado {
  return {
    fenomeno: f,
    condiciones: { evidencia: false, recurrencia: false, consecuencia: false, hipotesis: false },
    estado: "en_observacion",
    intensidad: null,
    confianza: null,
    mecanismo_organizacional: null,
    consecuencia_operativa: null,
    indicador_economico: null,
    mecanismos: [],
    perfil_mando: null,
    razonamiento: null,
    preguntas_hechas: 0,
    ...over,
  };
}

function confirmado(f: FenomenoTipo, intensidad: FenomenoDetectado["intensidad"] = "severo"): FenomenoDetectado {
  return fen(f, {
    condiciones: { evidencia: true, recurrencia: true, consecuencia: true, hipotesis: true },
    estado: "confirmado",
    intensidad,
    confianza: "media",
    mecanismo_organizacional: `mecanismo de ${f}`,
    consecuencia_operativa: `consecuencia de ${f}`,
    indicador_economico: "rotacion",
    mecanismos: [{ hilo: "h1", evidencia: "e1" }],
  });
}

const TODOS: FenomenoTipo[] = ["mandos_medios", "clima_vinculos", "desgaste", "transicion", "estructura"];
function estado(...conf: FenomenoDetectado[]): FenomenoDetectado[] {
  return TODOS.map((t) => conf.find((c) => c.fenomeno === t) ?? fen(t));
}

const base = (fenomenos: FenomenoDetectado[], over: Partial<EntradaCierre> = {}): EntradaCierre => ({
  turnos: 12,
  fenomenos,
  datos: { n: 240, s: 850000, r: 0.18 },
  contexto_empresa: { nombre: "Manufacturas del Sur", sector: "manufactura", n: 240 },
  forzar_sin_diagnostico: false,
  ...over,
});

function sintesis(over: Partial<SintesisSalida> = {}): SintesisSalida {
  return {
    relaciones: [],
    caso: 1,
    intervenciones: [
      {
        fenomenos_objetivo: ["mandos_medios"],
        descripcion: "Formar a los mandos medios en conducción de equipos",
        traduccion_humana: "Los jefes dejan de ser el amortiguador y pasan a ser un puente",
        reversibilidad: { grado_temprano: 0.4, grado_tardio: 0.5, plazo_aparicion_efecto: "corto", justificacion: "j" },
        horizonte_proyeccion: "12m",
      },
    ],
    punto_accesibilidad: null,
    aprobada_por_consultor: false,
    ...over,
  };
}

interface Espia {
  sintesisLlamadas: number;
  mensajeLlamadas: number;
}
function cliente(s: SintesisSalida, espia?: Espia, mensajeFalla = false): ClienteModelo {
  return {
    async turno() {
      throw new Error("no usado");
    },
    async sintesis() {
      if (espia) espia.sintesisLlamadas++;
      return { datos: s, uso: USO };
    },
    async mensajeCierre() {
      if (espia) espia.mensajeLlamadas++;
      if (mensajeFalla) throw new Error("boom");
      return { datos: { mensaje_cierre: "Mensaje de cierre." }, uso: USO };
    },
  };
}

// ── DD-11 ─────────────────────────────────────────────────────────────────
test("DD-11: con < 10 turnos el cierre queda BLOQUEADO y no llama a la síntesis", async () => {
  const espia = { sintesisLlamadas: 0, mensajeLlamadas: 0 };
  const r = await ejecutarCierre(base(estado(confirmado("mandos_medios")), { turnos: 4 }), cliente(sintesis(), espia));
  assert.equal(r.tipo, "bloqueado");
  if (r.tipo === "bloqueado") {
    assert.equal(r.evaluacion.faltan, 6);
    assert.equal(r.evaluacion.resultado_forzado, "SIN_EVIDENCIA_SUFICIENTE");
  }
  assert.equal(espia.sintesisLlamadas + espia.mensajeLlamadas, 0);
});

test("DD-11: forzado con < 10 turnos → SIN_EVIDENCIA_SUFICIENTE, sin síntesis ni económico, aunque figure un confirmado", async () => {
  const espia = { sintesisLlamadas: 0, mensajeLlamadas: 0 };
  const r = await ejecutarCierre(
    base(estado(confirmado("mandos_medios")), { turnos: 4, forzar_sin_diagnostico: true }),
    cliente(sintesis(), espia),
  );
  assert.equal(r.tipo, "sin_diagnostico");
  if (r.tipo === "sin_diagnostico") {
    assert.equal(r.resultado_tipo, "SIN_EVIDENCIA_SUFICIENTE");
    assert.equal(r.motivo, "pocos_turnos");
    assert.equal(r.mensaje_cierre, "Mensaje de cierre.");
  }
  assert.equal(espia.sintesisLlamadas, 0);
});

test("con suficientes turnos pero ningún fenómeno confirmado → sin diagnóstico (no inventa)", async () => {
  const espia = { sintesisLlamadas: 0, mensajeLlamadas: 0 };
  const r = await ejecutarCierre(base(estado()), cliente(sintesis(), espia));
  assert.equal(r.tipo, "sin_diagnostico");
  if (r.tipo === "sin_diagnostico") assert.equal(r.motivo, "sin_fenomenos_confirmados");
  assert.equal(espia.sintesisLlamadas, 0);
});

test("si el mensaje de cierre falla, el cierre igual se completa (mensaje null)", async () => {
  const r = await ejecutarCierre(base(estado()), cliente(sintesis(), undefined, true));
  assert.equal(r.tipo, "sin_diagnostico");
  if (r.tipo === "sin_diagnostico") assert.equal(r.mensaje_cierre, null);
});

// ── caso 1 ────────────────────────────────────────────────────────────────
test("Caso 1: un confirmado → intervención del modelo + económico con rango", async () => {
  const r = await ejecutarCierre(base(estado(confirmado("mandos_medios"))), cliente(sintesis()));
  assert.equal(r.tipo, "completo");
  if (r.tipo !== "completo") return;
  assert.equal(r.caso, 1);
  assert.equal(r.clasificacion.resultado_tipo, "DOMINANTE_DEBIL"); // 1 confirmado, score < umbral (severo × media)
  assert.equal(r.intervenciones.length, 1);
  assert.equal(r.intervenciones[0].origen, "modelo");
  assert.equal(r.intervenciones[0].reversibilidad.aplica_a, "fenomeno:mandos_medios");
  assert.ok(r.economico.perdida_total > 0);
  assert.ok(r.economico.reduccion_proyectada.min <= r.economico.reduccion_proyectada.max);
  assert.equal(r.economico.reduccion_proyectada.min < r.economico.reduccion_proyectada.max, true);
  assert.equal(r.mensaje_cierre, "Mensaje de cierre.");
  assert.equal(r.llamadas.length, 2);
});

test("el caso lo decide el CÓDIGO: el modelo dice caso 4 pero sin relaciones → Caso 1", async () => {
  const r = await ejecutarCierre(base(estado(confirmado("mandos_medios"))), cliente(sintesis({ caso: 4 })));
  assert.equal(r.tipo, "completo");
  if (r.tipo !== "completo") return;
  assert.equal(r.caso, 1);
  assert.ok(r.ajustes.some((a) => /propuso el caso 4/.test(a)));
});

// ── caso 2 ────────────────────────────────────────────────────────────────
test("Caso 2 (A ⊥ B): hasta 2 frentes, cada uno con su reversibilidad en el económico", async () => {
  const interv = (f: FenomenoTipo, t: number, d: number) => ({
    fenomenos_objetivo: [f],
    descripcion: `intervención ${f}`,
    traduccion_humana: `humano ${f}`,
    reversibilidad: { grado_temprano: t, grado_tardio: d, plazo_aparicion_efecto: "medio" as const, justificacion: "j" },
    horizonte_proyeccion: "12m" as const,
  });
  const s = sintesis({
    caso: 2,
    relaciones: [{ fenomeno_a: "mandos_medios", fenomeno_b: "desgaste", tipo: "A_PERP_B", evidencia_soporte: "independientes" }],
    intervenciones: [interv("mandos_medios", 0.4, 0.5), interv("desgaste", 0.3, 0.4), interv("mandos_medios", 0.2, 0.3)],
  });
  const r = await ejecutarCierre(base(estado(confirmado("mandos_medios"), confirmado("desgaste"))), cliente(s));
  assert.equal(r.tipo, "completo");
  if (r.tipo !== "completo") return;
  assert.equal(r.caso, 2);
  assert.equal(r.intervenciones.length, 2); // el 3.º se descarta
  assert.ok(r.ajustes.some((a) => /2 frente/.test(a)));
});

// ── caso 3 / 4 ────────────────────────────────────────────────────────────
test("Caso 3 (circuito hipotético): 1 intervención sobre el punto de accesibilidad, aplica_a=circuito, descuento 0.5", async () => {
  const rel = (tipo: "A_HIP_B" | "A_CONF_B") => [
    { fenomeno_a: "mandos_medios" as const, fenomeno_b: "clima_vinculos" as const, tipo, evidencia_soporte: "e" },
  ];
  const interv = {
    fenomenos_objetivo: ["mandos_medios" as const, "clima_vinculos" as const],
    descripcion: "punto de accesibilidad",
    traduccion_humana: "humano",
    reversibilidad: { grado_temprano: 0.4, grado_tardio: 0.5, plazo_aparicion_efecto: "medio" as const, justificacion: "j" },
    horizonte_proyeccion: "12m" as const,
  };
  const fenomenos = estado(confirmado("mandos_medios"), confirmado("clima_vinculos"));
  const r3 = await ejecutarCierre(
    base(fenomenos),
    cliente(sintesis({ caso: 3, relaciones: rel("A_HIP_B"), intervenciones: [interv, interv], punto_accesibilidad: "reunión semanal de mandos" })),
  );
  const r4 = await ejecutarCierre(
    base(fenomenos),
    cliente(sintesis({ caso: 4, relaciones: rel("A_CONF_B"), intervenciones: [interv], punto_accesibilidad: "reunión semanal de mandos" })),
  );
  assert.equal(r3.tipo, "completo");
  assert.equal(r4.tipo, "completo");
  if (r3.tipo !== "completo" || r4.tipo !== "completo") return;
  assert.equal(r3.caso, 3);
  assert.equal(r4.caso, 4);
  assert.equal(r3.intervenciones.length, 1);
  assert.equal(r3.intervenciones[0].reversibilidad.aplica_a, "circuito");
  assert.equal(r3.punto_accesibilidad, "reunión semanal de mandos");
  // circuito hipotético proyecta la MITAD que el confirmado
  assert.equal(r3.economico.reduccion_proyectada.max, Math.round(r4.economico.reduccion_proyectada.max / 2));
});

test("punto_accesibilidad se ignora fuera de Caso 3/4", async () => {
  const r = await ejecutarCierre(
    base(estado(confirmado("mandos_medios"))),
    cliente(sintesis({ punto_accesibilidad: "algo" })),
  );
  assert.equal(r.tipo === "completo" && r.punto_accesibilidad, null);
});

// ── guardarrailes sobre la salida del modelo ──────────────────────────────
test("la reversibilidad inflada se RECORTA a 0.20–0.55 y se ordena", () => {
  assert.deepEqual(normalizarReversibilidad(0.9, 0.95), { grado_temprano: 0.55, grado_tardio: 0.55 });
  assert.deepEqual(normalizarReversibilidad(0.05, 0.3), { grado_temprano: 0.2, grado_tardio: 0.3 });
  assert.deepEqual(normalizarReversibilidad(0.5, 0.3), { grado_temprano: 0.3, grado_tardio: 0.5 });
});

test("el modelo promete 0.95 de reversibilidad → el económico usa el valor recortado", async () => {
  const s = sintesis();
  s.intervenciones[0].reversibilidad = { grado_temprano: 0.9, grado_tardio: 0.95, plazo_aparicion_efecto: "corto", justificacion: "j" };
  const r = await ejecutarCierre(base(estado(confirmado("mandos_medios"))), cliente(s));
  assert.equal(r.tipo, "completo");
  if (r.tipo !== "completo") return;
  assert.equal(r.intervenciones[0].reversibilidad.grado_tardio, 0.55);
  assert.ok(r.economico.reduccion_proyectada.max <= Math.round(r.economico.perdida_total * 0.55));
  assert.ok(r.ajustes.some((a) => /recortada/.test(a)));
});

test("relaciones e intervenciones sobre fenómenos NO confirmados se descartan", async () => {
  const s = sintesis({
    relaciones: [{ fenomeno_a: "mandos_medios", fenomeno_b: "estructura", tipo: "A_B", evidencia_soporte: "x" }],
    intervenciones: [
      { ...sintesis().intervenciones[0], fenomenos_objetivo: ["estructura"] },
    ],
  });
  const r = await ejecutarCierre(base(estado(confirmado("mandos_medios"))), cliente(s));
  assert.equal(r.tipo, "completo");
  if (r.tipo !== "completo") return;
  assert.equal(r.relaciones.length, 0);
  // la única intervención era sobre un fenómeno no confirmado → respaldo de la matriz para el dominante
  assert.equal(r.intervenciones.length, 1);
  assert.equal(r.intervenciones[0].origen, "matriz");
  assert.deepEqual(r.intervenciones[0].fenomenos_objetivo, ["mandos_medios"]);
});

test("sin intervención del modelo → respaldo de la matriz (reversibilidad de la matriz, rango válido)", async () => {
  const r = await ejecutarCierre(base(estado(confirmado("desgaste"))), cliente(sintesis({ intervenciones: [] })));
  assert.equal(r.tipo, "completo");
  if (r.tipo !== "completo") return;
  assert.equal(r.intervenciones[0].origen, "matriz");
  assert.ok(r.economico.reduccion_proyectada.min <= r.economico.reduccion_proyectada.max);
});

test("nunca hay una cifra escalar: reducción y ROI siempre son rangos min ≤ max", async () => {
  const r = await ejecutarCierre(base(estado(confirmado("mandos_medios"))), cliente(sintesis()));
  assert.equal(r.tipo, "completo");
  if (r.tipo !== "completo") return;
  assert.ok(r.economico.roi.min <= r.economico.roi.max);
  assert.ok(r.economico.reduccion_proyectada.min <= r.economico.reduccion_proyectada.max);
});
