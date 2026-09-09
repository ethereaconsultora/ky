/**
 * env - lectura validada de las variables de entorno de Supabase.
 * Falla fuerte y claro si falta algo (mejor que un 500 opaco).
 *
 * Las NEXT_PUBLIC_* se leen con acceso estatico `process.env.NEXT_PUBLIC_x`
 * para que Next las inyecte en el bundle del browser (el acceso dinamico
 * `process.env[nombre]` NO se inlinea y quedaria undefined en el cliente).
 */

function exigir(valor: string | undefined, nombre: string): string {
  if (!valor || valor.trim().length === 0) {
    throw new Error(`Falta la variable de entorno ${nombre} (ver .env.local.example).`);
  }
  return valor;
}

export const SUPABASE_URL = (): string =>
  exigir(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");

export const SUPABASE_ANON_KEY = (): string =>
  exigir(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");

export const SUPABASE_SERVICE_ROLE_KEY = (): string =>
  exigir(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
