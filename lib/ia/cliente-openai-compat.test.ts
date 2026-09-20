import assert from "node:assert/strict";
import { test } from "node:test";

import { clienteOpenAICompat, extraerJSON } from "./cliente-openai-compat.ts";
import { ErrorIA } from "./tipos.ts";

const TURNO_OK = {
  fenomenos_actualizados: [],
  accion: "profundizar",
  fenomeno_siguiente_prioridad: null,
  fin_diagnostico: false,
  sugerencias_pregunta: ["primera pregunta", "segunda pregunta"],
  alerta_seguridad: false,
};

function respuesta(contenido: string, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      model: "modelo-real",
      choices: [{ message: { content: contenido } }],
      usage: { prompt_tokens: 100, completion_tokens: 20 },
      ...extra,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

interface Llamada {
  url: string;
  headers: Record<string, string>;
  body: { model: string; messages: Array<{ role: string; content: string }>; response_format: unknown };
}

function fetchFalso(respuestas: Array<Response | Error>) {
  const llamadas: Llamada[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    llamadas.push({
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(String(init.body)),
    });
    const r = respuestas.shift();
    if (!r) throw new Error("sin más respuestas");
    if (r instanceof Error) throw r;
    return r;
  }) as unknown as typeof fetch;
  return { impl, llamadas };
}

const esperas: number[] = [];
const cfg = (fetchImpl: typeof fetch) => ({
  baseUrl: "https://api.ejemplo.com/v1/",
  apiKey: "clave-secreta",
  modelo: "modelo-x",
  fetchImpl,
  esperar: async (ms: number) => {
    esperas.push(ms);
  },
});

test("extraerJSON: JSON pelado, con fences y con texto alrededor", () => {
  assert.deepEqual(extraerJSON('{"a":1}'), { a: 1 });
  assert.deepEqual(extraerJSON('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extraerJSON('Claro, acá va:\n{"a":{"b":2}}\nEspero que sirva'), { a: { b: 2 } });
});

test("turno: arma el request (URL, auth, modo JSON, esquema en el prompt) y devuelve datos + uso", async () => {
  const { impl, llamadas } = fetchFalso([respuesta(JSON.stringify(TURNO_OK))]);
  const r = await clienteOpenAICompat(cfg(impl)).turno("SYSTEM", "USER");

  assert.equal(r.datos.sugerencias_pregunta.length, 2);
  assert.equal(r.uso.modelo, "modelo-real");
  assert.equal(r.uso.tokens_in, 100);
  assert.equal(r.uso.tokens_out, 20);

  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].url, "https://api.ejemplo.com/v1/chat/completions");
  assert.equal(llamadas[0].headers.Authorization, "Bearer clave-secreta");
  assert.equal(llamadas[0].body.model, "modelo-x");
  assert.deepEqual(llamadas[0].body.response_format, { type: "json_object" });
  assert.match(llamadas[0].body.messages[0].content, /^SYSTEM/);
  assert.match(llamadas[0].body.messages[0].content, /FORMATO DE SALIDA/);
  assert.match(llamadas[0].body.messages[0].content, /sugerencias_pregunta/);
  assert.equal(llamadas[0].body.messages[1].content, "USER");
});

test("turno: tolera JSON envuelto en fences markdown", async () => {
  const { impl } = fetchFalso([respuesta("```json\n" + JSON.stringify(TURNO_OK) + "\n```")]);
  const r = await clienteOpenAICompat(cfg(impl)).turno("s", "u");
  assert.equal(r.datos.accion, "profundizar");
});

test("turno: reintenta una vez con el error de validación y suma tokens", async () => {
  const invalida = { ...TURNO_OK, sugerencias_pregunta: ["una sola"] };
  const { impl, llamadas } = fetchFalso([
    respuesta(JSON.stringify(invalida)),
    respuesta(JSON.stringify(TURNO_OK)),
  ]);
  const r = await clienteOpenAICompat(cfg(impl)).turno("s", "u");

  assert.equal(llamadas.length, 2);
  const msgs = llamadas[1].body.messages;
  assert.equal(msgs[msgs.length - 2].role, "assistant");
  assert.match(msgs[msgs.length - 1].content, /no cumplió el esquema/);
  assert.equal(r.uso.tokens_in, 200);
  assert.equal(r.uso.tokens_out, 40);
});

test("turno: falla con salida_invalida tras 2 intentos", async () => {
  const { impl, llamadas } = fetchFalso([respuesta("esto no es json"), respuesta("tampoco")]);
  await assert.rejects(
    () => clienteOpenAICompat(cfg(impl)).turno("s", "u"),
    (e: unknown) => e instanceof ErrorIA && e.code === "salida_invalida",
  );
  assert.equal(llamadas.length, 2);
});

test("HTTP 429 → modelo_no_disponible con aviso de límite (sin reintentar)", async () => {
  const { impl, llamadas } = fetchFalso([new Response("quota", { status: 429 })]);
  await assert.rejects(
    () => clienteOpenAICompat(cfg(impl)).turno("s", "u"),
    (e: unknown) =>
      e instanceof ErrorIA && e.code === "modelo_no_disponible" && /límite de uso/.test(e.message),
  );
  assert.equal(llamadas.length, 1);
});

test("error de red → modelo_no_disponible, y la API key no aparece en el mensaje", async () => {
  const { impl } = fetchFalso([new Error("ECONNRESET")]);
  await assert.rejects(
    () => clienteOpenAICompat(cfg(impl)).turno("s", "u"),
    (e: unknown) =>
      e instanceof ErrorIA && e.code === "modelo_no_disponible" && !e.message.includes("clave-secreta"),
  );
});

test("mensajeCierre valida contra su propio esquema", async () => {
  const { impl } = fetchFalso([respuesta(JSON.stringify({ mensaje_cierre: "Gracias por tu tiempo." }))]);
  const r = await clienteOpenAICompat(cfg(impl)).mensajeCierre("s", "u");
  assert.equal(r.datos.mensaje_cierre, "Gracias por tu tiempo.");
});

test("503 transitorio: reintenta con espera y se recupera", async () => {
  esperas.length = 0;
  const { impl, llamadas } = fetchFalso([
    new Response("high demand", { status: 503 }),
    new Response("high demand", { status: 503 }),
    respuesta(JSON.stringify(TURNO_OK)),
  ]);
  const r = await clienteOpenAICompat(cfg(impl)).turno("s", "u");
  assert.equal(r.datos.accion, "profundizar");
  assert.equal(llamadas.length, 3);
  assert.deepEqual(esperas, [1500, 3500]);
});

test("503 persistente: tras los reintentos falla con modelo_no_disponible", async () => {
  esperas.length = 0;
  const { impl, llamadas } = fetchFalso([
    new Response("x", { status: 503 }),
    new Response("x", { status: 503 }),
    new Response("x", { status: 503 }),
  ]);
  await assert.rejects(
    () => clienteOpenAICompat(cfg(impl)).turno("s", "u"),
    (e: unknown) => e instanceof ErrorIA && e.code === "modelo_no_disponible" && /503/.test(e.message),
  );
  assert.equal(llamadas.length, 3);
});

test("429 NO se reintenta (es cuota, no un pico)", async () => {
  esperas.length = 0;
  const { impl, llamadas } = fetchFalso([new Response("quota", { status: 429 })]);
  await assert.rejects(() => clienteOpenAICompat(cfg(impl)).turno("s", "u"));
  assert.equal(llamadas.length, 1);
  assert.deepEqual(esperas, []);
});

test("reasoning_effort: se envía sólo si está configurado", async () => {
  const con = fetchFalso([respuesta(JSON.stringify(TURNO_OK))]);
  await clienteOpenAICompat({ ...cfg(con.impl), razonamiento: "low" }).turno("s", "u");
  assert.equal((con.llamadas[0].body as Record<string, unknown>).reasoning_effort, "low");

  const sin = fetchFalso([respuesta(JSON.stringify(TURNO_OK))]);
  await clienteOpenAICompat(cfg(sin.impl)).turno("s", "u");
  assert.equal("reasoning_effort" in sin.llamadas[0].body, false);
});
