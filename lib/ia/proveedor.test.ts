import assert from "node:assert/strict";
import { test } from "node:test";

import { crearClienteModelo, proveedorActual } from "./proveedor.ts";
import { ErrorIA } from "./tipos.ts";

function esErrorConfig(patron: RegExp) {
  return (e: unknown) => e instanceof ErrorIA && e.code === "config_ia" && patron.test(e.message);
}

test("por defecto el proveedor es claude", () => {
  assert.equal(proveedorActual({}), "claude");
});

test("proveedor inválido → config_ia", () => {
  assert.throws(() => proveedorActual({ KY_PROVEEDOR_IA: "skynet" }), esErrorConfig(/no es válido/));
});

test("gemini sin KY_IA_API_KEY → config_ia", () => {
  assert.throws(() => crearClienteModelo({ KY_PROVEEDOR_IA: "gemini" }), esErrorConfig(/KY_IA_API_KEY/));
});

test("gemini con key → cliente (preset de URL y modelo)", () => {
  const c = crearClienteModelo({ KY_PROVEEDOR_IA: "gemini", KY_IA_API_KEY: "k" });
  assert.equal(typeof c.turno, "function");
});

test("openrouter exige modelo explícito (no tiene default)", () => {
  assert.throws(
    () => crearClienteModelo({ KY_PROVEEDOR_IA: "openrouter", KY_IA_API_KEY: "k" }),
    esErrorConfig(/KY_IA_MODELO/),
  );
});

test("custom exige base URL", () => {
  assert.throws(
    () => crearClienteModelo({ KY_PROVEEDOR_IA: "custom", KY_IA_API_KEY: "k", KY_IA_MODELO: "m" }),
    esErrorConfig(/KY_IA_BASE_URL/),
  );
});

test("proveedor gratuito BLOQUEADO en producción de Vercel salvo override", () => {
  const base = { KY_PROVEEDOR_IA: "gemini", KY_IA_API_KEY: "k", VERCEL_ENV: "production" };
  assert.throws(() => crearClienteModelo(base), esErrorConfig(/bloqueado en producción/));
  assert.equal(typeof crearClienteModelo({ ...base, KY_PERMITIR_IA_GRATIS: "1" }).turno, "function");
});

test("en preview el proveedor gratuito funciona", () => {
  const c = crearClienteModelo({ KY_PROVEEDOR_IA: "gemini", KY_IA_API_KEY: "k", VERCEL_ENV: "preview" });
  assert.equal(typeof c.turno, "function");
});
