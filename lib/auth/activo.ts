/**
 * activo - una cuenta puede usar KY sólo si el SERVIDOR la marcó como habilitada.
 *
 * La marca vive en `app_metadata.ky_activo` del usuario de Supabase Auth. `app_metadata` sólo lo puede
 * escribir el service role (a diferencia de `user_metadata`, que el propio usuario puede editar), y lo
 * ponemos únicamente desde `POST /api/registro` (con el código de invitación) o a mano por un admin.
 * Así, aunque alguien se cree una cuenta llamando directo a la API pública de Supabase con la anon key,
 * no puede entrar: no tiene la marca.
 */

export interface UsuarioConMetadata {
  app_metadata?: Record<string, unknown> | null;
}

export function esUsuarioActivo(user: UsuarioConMetadata | null | undefined): boolean {
  return user?.app_metadata?.ky_activo === true;
}
