import assert from "node:assert/strict";
import { test } from "node:test";

import { AccesoBody, decidirAccion, MENSAJE_ENLACE_ENVIADO } from "./acceso.ts";
import { esUsuarioActivo } from "../auth/activo.ts";

test("acceso: normaliza el email (minúsculas, sin espacios) y rechaza campos extra o inválidos", () => {
  assert.equal(AccesoBody.parse({ email: "  ANA@Empresa.COM " }).email, "ana@empresa.com");
  assert.equal(AccesoBody.safeParse({ email: "no-es-un-email" }).success, false);
  assert.equal(AccesoBody.safeParse({ email: "a@b.com", password: "x" }).success, false);
  assert.equal(AccesoBody.safeParse({ email: "a@b.com", rol: "admin" }).success, false);
  assert.equal(AccesoBody.safeParse({}).success, false);
});

test("decidirAccion: un email NO habilitado no dispara nada, exista o no la cuenta", () => {
  assert.equal(decidirAccion({ habilitado: false, user_id: null, confirmado: false }), "nada");
  assert.equal(decidirAccion({ habilitado: false, user_id: "u1", confirmado: true }), "nada");
});

test("decidirAccion: habilitado sin cuenta → crear y enviar", () => {
  assert.equal(decidirAccion({ habilitado: true, user_id: null, confirmado: false }), "crear_y_enviar");
});

test("decidirAccion: cuenta SIN confirmar (posible secuestro previo) → se reemplaza", () => {
  assert.equal(decidirAccion({ habilitado: true, user_id: "u1", confirmado: false }), "reemplazar_sin_confirmar");
});

test("decidirAccion: cuenta confirmada → sólo enviar el link", () => {
  assert.equal(decidirAccion({ habilitado: true, user_id: "u1", confirmado: true }), "enviar");
});

test("el mensaje al usuario no menciona 'habilitado' como hecho ni confirma la existencia de la cuenta", () => {
  assert.match(MENSAJE_ENLACE_ENVIADO, /^Si ese email/);
});

test("cuenta habilitada: sólo con app_metadata.ky_activo === true (no con user_metadata ni strings)", () => {
  assert.equal(esUsuarioActivo({ app_metadata: { ky_activo: true } }), true);
  assert.equal(esUsuarioActivo({ app_metadata: { ky_activo: "true" } }), false);
  assert.equal(esUsuarioActivo({ app_metadata: { ky_activo: false } }), false);
  assert.equal(esUsuarioActivo({ app_metadata: {} }), false);
  assert.equal(esUsuarioActivo({ app_metadata: null }), false);
  assert.equal(esUsuarioActivo(null), false);
  assert.equal(esUsuarioActivo(undefined), false);
});
