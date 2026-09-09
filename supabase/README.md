# supabase/ — Proyecto de ESPACIO CRÍTICO (KY)

Base de datos propia de EC (distinta de la de Newen). Postgres + Auth + RLS + `pgcrypto`.

## Estructura

| Ruta | Qué es |
|---|---|
| `migrations/000N_*.sql` | Migraciones numeradas, idempotentes. RLS en la misma migración que crea cada tabla. |
| `roles/newen_reader.sql` | Rol de solo lectura para el FDW de Newen. **No es migración** — se corre a mano con una contraseña real. |
| `seed.sql` | Datos de desarrollo. El consentimiento es placeholder (pendiente legal #6). |

`spec/init_schema.sql` es la **vista consolidada** de todas las migraciones (referencia humana);
la fuente canónica es `migrations/`.

## Orden de las migraciones

| # | Contenido |
|---|---|
| 0001 | Extensión `pgcrypto`. |
| 0002 | `users`, `consentimiento_textos`, helper `es_admin()` + RLS. |
| 0003 | `empresa`, `diagnostico`, helper `puede_ver_diag()` + RLS. |
| 0004 | Tablas hijas del diagnóstico (`datos_economicos` … `llamada_ia`) + RLS. |
| 0005 | Esquema `ec_publico` con las 3 vistas para el FDW. |

## Aplicar (Fase 0 — requiere el proyecto ya creado)

Con el CLI de Supabase, enlazado al proyecto de EC:

```bash
supabase db push          # aplica migrations/ en orden
supabase db reset          # local: recrea + corre seed.sql
```

O manual (SQL Editor del dashboard): pegar cada archivo de `migrations/` en orden.

Después, **una sola vez**, en el proyecto de EC:

```bash
psql "$EC_DB_URL" -f supabase/roles/newen_reader.sql   # con la password real
```

## Cifrado en reposo

`respuesta_cruda.texto_cifrado` y `.transcripcion_cifrada` son `bytea`. El backend escribe con
`pgp_sym_encrypt(texto, current_setting('app.pgcrypto_key'))` — nunca en claro, nunca desde el
cliente. La clave vive en `EC_PGCRYPTO_KEY` (env del backend), no en la DB.

## RLS

- `users`: cada quien se lee a sí mismo; `admin` lee todo.
- `empresa` / `diagnostico` / todas las hijas: el `counselor` sólo ve las filas de sus propios
  diagnósticos; `admin` ve todo. Helpers `es_admin()` y `puede_ver_diag()` son `security definer`
  con `search_path` fijo.
- `consentimiento_textos`: lectura para autenticados, escritura sólo `admin`.
- `newen_reader` **no** tiene ningún grant sobre `public` — sólo sobre `ec_publico`.

## Integración con Newen (Fase 9)

En el proyecto **Newen** (no acá): `create extension wrappers`, servidor `postgres_fdw` con las
credenciales de `newen_reader`, `import foreign schema ec_publico`. El match con
`organization_clients` es por `empresa.organization_client_id`.
