/**
 * Cliente Supabase con la SERVICE ROLE key: saltea RLS.
 * SOLO en el server, para operaciones controladas:
 *   - alta de fila en `public.users` al crear el counselor,
 *   - persistir `respuesta_cruda` / `fenomeno_detectado` / `llamada_ia` desde
 *     los Route Handlers de IA (el diagnostico ya fue validado como del counselor).
 * Nunca exponer a un Client Component ni pasar su resultado al browser.
 */

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./env.ts";

export function crearClienteServicio() {
  return createClient(SUPABASE_URL(), SUPABASE_SERVICE_ROLE_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
