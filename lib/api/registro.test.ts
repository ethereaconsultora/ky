import assert from "node:assert/strict";
import { test } from "node:test";

import { esUsuarioActivo } from "../auth/activo.ts";
import { codigoValido, esEmailDuplicado, RegistroBody } from "./registro.ts";

const valido = { nombre: "  Ana Ferrer ", email: "  ANA@Ejemplo.com ", password: "unaClaveLarga1", codigo: " ky-codigo-largo-123 " };

test("registro: normaliza nombre, email (minúsculas) y código", () => {
  const r = RegistroBody.parse(valido);
  assert.equal(r.nombre, "Ana Ferrer");
  assert.equal(r.email, "ana@ejemplo.com");
  assert.equal(r.codigo, "ky-codigo-largo-123");
});

test("registro: rechaza contraseña corta, larguísima, email inválido y campos extra", () => {
  assert.equal(RegistroBody.safeParse({ ...valido, password: "corta" }).success, false);
  assert.equal(RegistroBody.safeParse({ ...valido, password: "x".repeat(73) }).success, false);
  assert.equal(RegistroBody.safeParse({ ...valido, email: "no-es-un-email" }).success, false);
  assert.equal(RegistroBody.safeParse({ ...valido, nombre: "A" }).success, false);
  assert.equal(RegistroBody.safeParse({ ...valido, codigo: "" }).success, false);
  // no se puede colar app_metadata / rol desde el body
  assert.equal(RegistroBody.safeParse({ ...valido, app_metadata: { ky_activo: true } }).success, false);
  assert.equal(RegistroBody.safeParse({ ...valido, rol: "admin" }).success, false);
});

test("código de invitación: sólo el correcto pasa", () => {
  const esperado = "ky-codigo-largo-123";
  assert.equal(codigoValido("ky-codigo-largo-123", esperado), true);
  assert.equal(codigoValido("ky-codigo-largo-124", esperado), false);
  assert.equal(codigoValido("", esperado), false);
  assert.equal(codigoValido("ky-codigo-largo-123 ", esperado), false);
});

test("código de invitación: si no está configurado o es corto, NADIE entra", () => {
  assert.equal(codigoValido("lo-que-sea", undefined), false);
  assert.equal(codigoValido("", ""), false);
  assert.equal(codigoValido("corto", "corto"), false, "un código de menos de 12 caracteres se considera no configurado");
});

test("email duplicado: reconoce los mensajes de Supabase", () => {
  assert.equal(esEmailDuplicado({ code: "email_exists" }), true);
  assert.equal(esEmailDuplicado({ message: "A user with this email address has already been registered" }), true);
  assert.equal(esEmailDuplicado({ message: "Database error" }), false);
  assert.equal(esEmailDuplicado(null), false);
});

test("cuenta habilitada: sólo con app_metadata.ky_activo === true (no con user_metadata ni strings)", () => {
  assert.equal(esUsuarioActivo({ app_metadata: { ky_activo: true } }), true);
  assert.equal(esUsuarioActivo({ app_metadata: { ky_activo: "true" } }), false);
  assert.equal(esUsuarioActivo({ app_metadata: {} }), false);
  assert.equal(esUsuarioActivo({ app_metadata: null }), false);
  assert.equal(esUsuarioActivo({}), false);
  assert.equal(esUsuarioActivo(null), false);
  assert.equal(esUsuarioActivo(undefined), false);
});
