import assert from "node:assert/strict";
import { test } from "node:test";

import { EdicionIntervencionBody, estadoEntrega, puedeAprobar, puedeEditar, puedeEnviar } from "./entrega.ts";

const borr = { aprobada_por_consultor: false, enviada_at: null };
const apro = { aprobada_por_consultor: true, enviada_at: null };
const envi = { aprobada_por_consultor: true, enviada_at: "2026-09-20T00:00:00Z" };

test("estados: sin propuesta / borrador / aprobada / enviada", () => {
  assert.equal(estadoEntrega([]), "sin_propuesta");
  assert.equal(estadoEntrega([borr]), "borrador");
  assert.equal(estadoEntrega([apro]), "aprobada");
  assert.equal(estadoEntrega([envi]), "enviada");
});

test("con 2 frentes, mientras uno siga en borrador la propuesta es borrador", () => {
  assert.equal(estadoEntrega([apro, borr]), "borrador");
  assert.equal(estadoEntrega([apro, apro]), "aprobada");
  assert.equal(estadoEntrega([envi, apro]), "aprobada");
});

test("solo se edita/aprueba un borrador; solo se envía una aprobada", () => {
  assert.equal(puedeEditar("borrador"), true);
  assert.equal(puedeEditar("aprobada"), false);
  assert.equal(puedeAprobar("borrador"), true);
  assert.equal(puedeAprobar("enviada"), false);
  assert.equal(puedeEnviar("borrador"), false, "no se puede enviar sin aprobar");
  assert.equal(puedeEnviar("aprobada"), true);
  assert.equal(puedeEnviar("enviada"), false);
});

test("edición: valida largo y exige al menos un campo", () => {
  assert.equal(EdicionIntervencionBody.safeParse({}).success, false);
  assert.equal(EdicionIntervencionBody.safeParse({ descripcion: "corto" }).success, false);
  assert.equal(EdicionIntervencionBody.safeParse({ descripcion: "x".repeat(2001) }).success, false);
  assert.equal(EdicionIntervencionBody.safeParse({ descripcion: "  Una descripción válida  " }).success, true);
  assert.equal(EdicionIntervencionBody.parse({ traduccion_humana: "Cambia la experiencia diaria" }).descripcion, undefined);
});
