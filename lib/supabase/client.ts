/**
 * Cliente Supabase para el navegador (Client Components).
 * Solo anon key. Nunca importar `service.ts` ni la service role key aca.
 */

"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env.ts";

export function crearClienteNavegador() {
  return createBrowserClient(SUPABASE_URL(), SUPABASE_ANON_KEY());
}
