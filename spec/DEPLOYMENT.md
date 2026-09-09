# DEPLOYMENT — KY

## Servicios

| Servicio | Proyecto | Notas |
|---|---|---|
| Supabase | **nuevo, propio de EC** (distinto del de Newen) | Postgres + Auth + `pgcrypto`. Región cercana a AR. |
| Vercel | **nuevo**, `ky` | Framework Preset = **Next.js** (si queda en "Other" todas las rutas dan 404). |
| GitHub | repo `ky` | ramas `main` (prod) y `dev` (preview). |
| Upstash Redis | free | rate limit. |
| Proveedor STT | a confirmar (Deepgram / AssemblyAI / Azure) | key server-side; token efímero. |
| API de Claude | Anthropic | `ANTHROPIC_API_KEY` server-side. |
| n8n (HuggingFace Space existente) | keep-alive | ping al Supabase de EC cada 24 h (`select 1`). |

## Variables de entorno (Vercel → Settings → Environment Variables)

Ver `.env.local.example`. Mínimo para que corra:

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
EC_PGCRYPTO_KEY
ANTHROPIC_API_KEY, KY_MODELO_TURNO, KY_MODELO_SINTESIS
STT_PROVIDER, STT_API_KEY, STT_TOKEN_TTL_SECONDS
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
KY_PROMPT_VERSION, KY_MAPA_INDAGACION_VERSION
NEXT_PUBLIC_APP_URL
```

## Orden de despliegue

1. Crear proyecto Supabase de EC. Anotar URL + anon key + service role.
2. SQL Editor → revisar a mano y ejecutar `spec/init_schema.sql`. Verificar RLS activa en todas
   las tablas.
3. Crear el rol de solo lectura del FDW (con contraseña real, no en el repo):
   ```sql
   create role newen_reader login password '***';
   grant usage on schema ec_publico to newen_reader;
   grant select on all tables in schema ec_publico to newen_reader;
   alter default privileges in schema ec_publico grant select on tables to newen_reader;
   ```
   **Nunca** dar permisos sobre `public` a `newen_reader`.
4. Cargar al menos un `consentimiento_textos` vigente y un `users` con rol `admin` (el de Ari).
5. Crear proyecto Vercel `ky` vinculado al repo, rama `main`. Framework Preset = Next.js.
6. Cargar env vars en Vercel (Production + Preview).
7. `git push` a `dev` → Preview URL. Probar con Ari.
8. Merge a `main` (con confirmación de Ari) → deploy de producción.
9. POST-DEPLOY CHECK (abajo).
10. Configurar el keep-alive n8n al Supabase de EC.

## Integración FDW en el proyecto Newen (después de la Fase 8)

En el **proyecto Supabase de Newen** (SQL Editor):

```sql
create extension if not exists wrappers with schema extensions;

-- servidor foráneo hacia EC
create server if not exists ec_server
  foreign data wrapper postgres_wrapper
  options (
    host 'db.<proyecto-ec>.supabase.co', port '5432', dbname 'postgres',
    user 'newen_reader', password '***'   -- guardar como Vault secret, no inline
  );

import foreign schema ec_publico
  from server ec_server into ec_publico;   -- crea las tablas foráneas ec_publico.v_*
```

Luego `app/(empresa)/empresa/page.tsx` de Newen gana una sección "Diagnóstico EC" que consulta
`ec_publico.v_diagnostico` / `v_perdida_economica` / `v_intervencion_propuesta` por
`organization_client_id`. **Cuidado**: el FDW consulta con los permisos de `newen_reader`, no
respeta la RLS de EC — por eso el control es rol + vista, y las vistas ya excluyen la evidencia
cruda.

## POST-DEPLOY CHECK (Protocolo Maestro Bloque 8)

```
1. vercel curl "https://<url>/login" --head          → 200
2. vercel project inspect ky                          → Framework Preset: Next.js
3. vercel logs <url>                                  → sin errores 500
4. bundle de producción no contiene ANTHROPIC_API_KEY ni STT_API_KEY
5. desde el proyecto Newen: SELECT sobre ec_publico.v_diagnostico → OK
6. desde newen_reader: SELECT sobre public.respuesta_cruda → error de permisos
Sólo si todo pasa → avisar a Ari.
```

## Rollback

- Vercel: "Promote" un deployment anterior.
- DB: los cambios de esquema van por migraciones numeradas idempotentes; para revertir, escribir
  la migración inversa (no `drop` a mano en producción).
