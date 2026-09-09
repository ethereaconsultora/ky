/**
 * Cliente Supabase para Server Components y Route Handlers.
 * Usa la anon key + las cookies de sesion -> respeta RLS con el usuario logueado.
 * Para operaciones de admin (alta en `users`, saltear RLS) usar `service.ts`.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieAdaptada = { name: string; value: string; options: CookieOptions };
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env.ts";

export async function crearClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieAdaptada[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Llamado desde un Server Component: el middleware ya refresca la sesion.
        }
      },
    },
  });
}

/**
 * Usuario autenticado o null. Siempre `getUser()` (valida contra el server),
 * nunca `getSession()` (confia en la cookie). Patron del Protocolo Maestro.
 */
export async function usuarioActual() {
  const sb = await crearClienteServidor();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export interface PerfilCounselor {
  id: string;
  email: string | null;
  nombre: string | null;
  rol: "counselor" | "admin";
}

/** Usuario + su fila de `public.users`. null si no hay sesion. */
export async function perfilActual(): Promise<PerfilCounselor | null> {
  const sb = await crearClienteServidor();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;

  const { data: fila } = await sb
    .from("users")
    .select("id, email, nombre, rol")
    .eq("id", auth.user.id)
    .maybeSingle();

  return (
    (fila as PerfilCounselor | null) ?? {
      id: auth.user.id,
      email: auth.user.email ?? null,
      nombre: null,
      rol: "counselor",
    }
  );
}
