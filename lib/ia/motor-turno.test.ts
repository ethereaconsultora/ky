import assert from "node:assert/strict";
import { test } from "node:test";

import type { FenomenoDetectado } from "../diagnostico/types.ts";
import { ejecutarTurno, type EntradaMotorTurno } from "./motor-turno.ts";
import { normalizarTranscripcion } from "./normalizar.ts";
import { ErrorIA, type ClienteModelo, type RespuestaModelo } from "./tipos.ts";
import { zTurno, type TurnoSalida } from "./validar.ts";

// ── helpers ───────────────────────────────────────────────────────────────
function fenomenoVacio(f: FenomenoDetectado["fenomeno"]): FenomenoDetectado {
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
  };
}

const SALIDA_OK: TurnoSalida = {
  fenomenos_actualizados: [
    {
      fenomeno: "mandos_medios",
      condiciones: { evidencia: true, recurrencia: false, consecuencia: false, hipotesis: false },
      estado: "en_observacion",
      intensidad: null,
      confianza: null,
      mecanismo_organizacional: null,
      consecuencia_operativa: null,
      indicador_economico_afectado: null,
      mecanismos: [{ hilo: "el_sandwich", evidencia: "describe presion de arriba y de abajo" }],
      razonamiento: null,
    },
  ],
  accion: "profundizar",
  fenomeno_siguiente_prioridad: "mandos_medios",
  fin_diagnostico: false,
  sugerencias_pregunta: [
    "Cuando direccion te baja un objetivo asi, como se lo transmitis al equipo?",
    "La ultima vez que te paso, que hiciste con el pedido que no compartias?",
  ],
  alerta_seguridad: false,
};

function clienteFake(
  salida: TurnoSalida,
  captura?: (system: string, user: string) => void,
): ClienteModelo {
  const noImpl = () => Promise.reject(new Error("no implementado en el fake"));
  return {
    async turno(system, user): Promise<RespuestaModelo<TurnoSalida>> {
      captura?.(system, user);
      return {
        datos: salida,
        uso: { modelo: "fake-haiku", tokens_in: 100, tokens_out: 50, latencia_ms: 3 },
      };
    },
    sintesis: noImpl as ClienteModelo["sintesis"],
    mensajeCierre: noImpl as ClienteModelo["mensajeCierre"],
  };
}

const ENTRADA_BASE: Omit<EntradaMotorTurno, "respuesta_cruda"> = {
  fenomeno_en_curso: "mandos_medios",
  estado_fenomenos: [
    fenomenoVacio("mandos_medios"),
    fenomenoVacio("clima_vinculos"),
    fenomenoVacio("desgaste"),
    fenomenoVacio("transicion"),
    fenomenoVacio("estructura"),
  ],
  preguntas_totales: 3,
  contexto_empresa: { nombre: "Manufacturas del Sur", sector: "manufactura", n: 240 },
};

// ── tests ─────────────────────────────────────────────────────────────────
test("normalizarTranscripcion: colapsa espacios y saca control chars", () => {
  const r = normalizarTranscripcion("  hola    mundo \t\t x  ");
  assert.equal(r.texto, "hola mundo x");
  assert.equal(r.vacia, false);
  assert.equal(r.truncada, false);
});

test("normalizarTranscripcion: saca zero-width / bidi", () => {
  const conBasura = "a​b‮c";
  assert.equal(normalizarTranscripcion(conBasura).texto, "abc");
});

test("normalizarTranscripcion: detecta vacia tras normalizar", () => {
  assert.equal(normalizarTranscripcion("    \t ").vacia, true);
});

test("ejecutarTurno: rechaza transcripcion vacia con ErrorIA(entrada_invalida)", async () => {
  await assert.rejects(
    () => ejecutarTurno({ ...ENTRADA_BASE, respuesta_cruda: "   " }, clienteFake(SALIDA_OK)),
    (e: unknown) => e instanceof ErrorIA && e.code === "entrada_invalida",
  );
});

test("ejecutarTurno: normaliza y pasa el texto + contexto al cliente", async () => {
  let vistoSystem = "";
  let vistoUser = "";
  const cli = clienteFake(SALIDA_OK, (s, u) => {
    vistoSystem = s;
    vistoUser = u;
  });

  const res = await ejecutarTurno(
    { ...ENTRADA_BASE, respuesta_cruda: "Nos    bajan   el numero​  y arreglate." },
    cli,
  );

  assert.match(vistoSystem, /MAPA DE INDAGACIÓN/);
  assert.match(vistoSystem, /mapa de indagación v/);
  assert.match(vistoUser, /Manufacturas del Sur/);
  assert.match(vistoUser, /Nos bajan el numero y arreglate\./);

  assert.equal(res.meta.tipo, "turno");
  assert.equal(res.meta.modelo, "fake-haiku");
  assert.match(res.meta.mapa_indagacion_version, /^v\d/);
  assert.ok(res.meta.prompt_version.length > 0);
  assert.equal(res.meta.tokens_in, 100);
});

test("ejecutarTurno: sanea sugerencias y falla si quedan menos de 2", async () => {
  const salidaSucia: TurnoSalida = {
    ...SALIDA_OK,
    sugerencias_pregunta: ["   ", "una   sola    pregunta    valida  "],
  };
  await assert.rejects(
    () => ejecutarTurno({ ...ENTRADA_BASE, respuesta_cruda: "algo dijo" }, clienteFake(salidaSucia)),
    (e: unknown) => e instanceof ErrorIA && e.code === "salida_invalida",
  );
});

test("ejecutarTurno: normaliza el espaciado de las sugerencias que sobreviven", async () => {
  const res = await ejecutarTurno(
    { ...ENTRADA_BASE, respuesta_cruda: "hablo del sandwich" },
    clienteFake({
      ...SALIDA_OK,
      sugerencias_pregunta: ["  a   b  c ", "d\te\tf", "g h"],
    }),
  );
  assert.deepEqual(res.salida.sugerencias_pregunta, ["a b c", "d e f", "g h"]);
});

test("zTurno acepta el fixture SALIDA_OK (cruce con SCHEMA_MOTOR_TURNO)", () => {
  assert.equal(zTurno.safeParse(SALIDA_OK).success, true);
});

test("zTurno rechaza < 2 sugerencias", () => {
  assert.equal(zTurno.safeParse({ ...SALIDA_OK, sugerencias_pregunta: ["una"] }).success, false);
});

test("ejecutarTurno: aunque el modelo confirme todo en el turno 3, la salida NO trae conclusiones (DD-11)", async () => {
  const confirmaTodo: TurnoSalida = {
    ...SALIDA_OK,
    fenomenos_actualizados: [
      {
        fenomeno: "mandos_medios",
        condiciones: { evidencia: true, recurrencia: true, consecuencia: true, hipotesis: true },
        estado: "confirmado",
        intensidad: "critico",
        confianza: "alta",
        mecanismo_organizacional: "conclusión apresurada",
        consecuencia_operativa: "otra conclusión apresurada",
        indicador_economico_afectado: "rotacion",
        mecanismos: [{ hilo: "el_sandwich", evidencia: "e" }],
        razonamiento: null,
      },
    ],
    accion: "cerrar",
    fin_diagnostico: true,
  };
  const res = await ejecutarTurno(
    { ...ENTRADA_BASE, preguntas_totales: 2, respuesta_cruda: "un monólogo largo y rico" },
    clienteFake(confirmaTodo),
  );
  assert.equal(res.salida.fin_diagnostico, false);
  const f = res.salida.fenomenos_actualizados[0];
  assert.equal(f.estado, "en_observacion");
  assert.equal(f.intensidad, null);
  assert.equal(f.mecanismo_organizacional, null);
  assert.equal(res.progreso.turnos, 3);
  assert.equal(res.progreso.faltan, 7);
  assert.equal(res.progreso.puede_concluir, false);
  assert.ok(res.meta.correcciones_guardarrailes > 0);
  assert.ok(res.avisos.length > 0);
});

test("ejecutarTurno: el user message informa el turno actual y el mínimo", async () => {
  let visto = "";
  await ejecutarTurno(
    { ...ENTRADA_BASE, preguntas_totales: 4, respuesta_cruda: "algo" },
    clienteFake(SALIDA_OK, (_s, u) => {
      visto = u;
    }),
  );
  assert.match(visto, /TURNO ACTUAL: 5 \(mínimo para concluir: 10; faltan 5/);
  assert.match(visto, /NO marques ningún fenómeno como confirmado/);
});

test("el system prompt declara las reglas de suficiencia", async () => {
  let visto = "";
  await ejecutarTurno(
    { ...ENTRADA_BASE, respuesta_cruda: "algo" },
    clienteFake(SALIDA_OK, (s) => {
      visto = s;
    }),
  );
  assert.match(visto, /REGLAS DE SUFICIENCIA/);
  assert.match(visto, /Antes de la pregunta 10 no hay conclusiones/);
  assert.match(visto, /al menos\s+3 turnos propios/);
});
