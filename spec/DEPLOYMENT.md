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

## Integración con Newen (Fase 9) — postgres_fdw, sólo lectura

> Corrige una versión anterior de este documento que nombraba `wrappers` / `postgres_wrapper`:
> la extensión correcta es **`postgres_fdw`** (estándar de Postgres, disponible en Supabase).
> El SQL completo y comentado vive en el repo de Newen: `spec/init_v0.53.0_diagnostico_ec.sql`.

**Orden (todo a mano, una sola vez):**

1. **Proyecto EC** — aplicar `supabase/migrations/0009_vistas_solo_aprobadas.sql`. Las vistas `ec_publico.v_*`
   sólo muestran diagnósticos **cerrados y con la propuesta aprobada** (o cerrados sin evidencia). Un borrador
   nunca sale de EC.
2. **Proyecto EC** — crear el rol `newen_reader` con `supabase/roles/newen_reader.sql` (contraseña larga y
   aleatoria; conexión máx. 5, sólo lectura, `statement_timeout` 10 s, sin acceso a `public`).
3. **Proyecto EC** — Dashboard → Connect → **Session pooler**: anotar host `aws-0-<region>.pooler.supabase.com`,
   puerto `5432` y el usuario con sufijo: `newen_reader.<ref-del-proyecto-EC>`.
   (La conexión directa `db.<ref>.supabase.co` es IPv6 y puede no ser alcanzable desde el otro proyecto.)
4. **Proyecto Newen** — SQL Editor: ejecutar `spec/init_v0.53.0_diagnostico_ec.sql` **reemplazando** los 3
   placeholders (`__EC_HOST__`, `__EC_DB_USER__`, `__EC_DB_PASSWORD__`) y borrar la query guardada después.
5. Verificar (queries al final de ese SQL) y desplegar la rama de Newen `feature/diagnostico-ec`.

**Modelo de seguridad (importante):**

- Las tablas foráneas **no soportan RLS**. Por eso viven en un esquema privado (`ec_foraneo`) sin grants para
  `anon` / `authenticated`, y sólo se leen desde 3 funciones `security definer` ejecutables únicamente por
  `service_role`. Las llama una API route de Newen **después** de verificar sesión, organización (`espacio-critico`)
  y pertenencia del cliente.
- El vínculo cliente ↔ diagnóstico lo guarda **Newen** (`organization_client_ec`), porque la FDW es de sólo lectura.
  `empresa.organization_client_id` de EC queda sin uso.
- Newen jamás ve `respuesta_cruda`, transcripciones ni la evidencia por hilo.

## POST-DEPLOY CHECK (Protocolo Maestro Bloque 8)

```
1. vercel curl "https://<url>/login" --head          → 200
2. vercel project inspect ky                          → Framework Preset: Next.js
3. vercel logs <url>                                  → sin errores 500
4. bundle de producción no contiene ANTHROPIC_API_KEY ni STT_API_KEY
5. desde el proyecto Newen: select public.ec_diagnosticos_disponibles() → OK
6. desde newen_reader (set role en el SQL Editor de EC): SELECT sobre public.respuesta_cruda → permission denied
Sólo si todo pasa → avisar a Ari.
```

## Rollback

- Vercel: "Promote" un deployment anterior.
- DB: los cambios de esquema van por migraciones numeradas idempotentes; para revertir, escribir
  la migración inversa (no `drop` a mano en producción).
