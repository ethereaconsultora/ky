# CHANGELOG_DEV — KY

Bitácora cronológica del desarrollo. La entrada se abre **antes** de empezar y se completa al
terminar. Formato en `WORKFLOW.md`.

---

### [2026-09-08] — Planificación + scaffold del proyecto

**Prompt**: analizar los 8 MD del método EC, detectar errores/mejoras, planificar la app de
tablet (Versión B) que se conecta a Newen; luego instanciar los archivos raíz del ecosistema
para esta app (`ky`) desde `ARCH BASE ORIGINALES`.

**Acción esperada**:
1. Análisis de los 8 MD (bloqueantes, inconsistencias, gaps, mejoras) + mejora del motor de
   preguntas adaptativas basada en Jordi Alemany.
2. Plan aprobado → `spec/PLAN_APROBADO.md`.
3. Scaffold: docs raíz, `PROTOCOLOS/`, `logs/`, `spec/` (SDD), `spec/metodo-ec/` (8 MD),
   config del proyecto.

**Archivos previstos**: `PRIMORDIAL.md`, `ARCHITECTURE.md`, `SECURITY.md`,
`SECURITY_SUMMARY.md`, `DESIGN_SYSTEM.md`, `AGENTS.md`, `WORKFLOW.md`, `BACKLOG.md`,
`CHANGELOG.md`, `README.md`, `package.json`, `tsconfig.json`, `next.config.ts`,
`postcss.config.mjs`, `.gitignore`, `.env.local.example`, `.eslintrc.json`,
`PROTOCOLOS/*`, `logs/*`, `spec/*`, `spec/metodo-ec/*`.

**Resultado**: ✅ Plan aprobado por el usuario. Scaffold de documentación + SDD + método
completado. Decisiones tomadas: sólo Versión B · Supabase propio de EC + FDW · STT en tiempo
real en v1 · entidad EMPRESA propia de EC.

**Archivos tocados** (52):
- Raíz: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`,
  `.env.local.example`, `.eslintrc.json`, `README.md`, `AGENTS.md`, `WORKFLOW.md`,
  `PRIMORDIAL.md`, `ARCHITECTURE.md`, `SECURITY.md`, `SECURITY_SUMMARY.md`, `DESIGN_SYSTEM.md`,
  `CHANGELOG.md`, `BACKLOG.md`.
- `PROTOCOLOS/`: `PSAI_v1.3.md` (copia), `PROTOCOLO_MAESTRO.md` (nuevo, aplicado a KY),
  `ARQUITECTURA_COMERCIAL_NEWEN.md` (copia), `ESPACIO_EMPRESA_STANDARD.md` (copia).
- `logs/`: `README.md`, `CHANGELOG_DEV.md`, `BUGS.md`.
- `spec/`: `README.md`, `SPEC_MATRIX.md`, `PROJECT_PLAN.md`, `PLAN_APROBADO.md` (copia del plan
  aprobado), `DATA_MODEL.md`, `init_schema.sql`, `API_CONTRACTS.md`, `openapi.yaml`,
  `USER_STORIES.md`, `USE_CASES.md`, `ACCEPTANCE_CRITERIA.md`, `DESIGN_DECISIONS.md`,
  `DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md`, `TEST_PLAN.md`, `UX_FLOW.md`, `DATA_PRIVACY.md`.
- `spec/metodo-ec/`: los 8 documentos del método + `README.md` (índice).
- `app/`: `layout.tsx`, `page.tsx`, `globals.css`. `lib/diagnostico/README.md`.

**Commit**: (pendiente — sin repo Git todavía. `docs: v0.1.0 scaffold KY (ref: logs/2026-09-08)`)

**Próximo paso**: Fase 0 — crear proyecto Supabase de EC + repo Git (`dev`/`main`) + proyecto
Vercel `ky` + keep-alive n8n. Después Fase 1 — `lib/diagnostico/` (matriz.config,
mapa-indagacion.config, clasificador, motor-economico, prompts, schemas) + tests de dominio.

---

### [2026-09-08] — Fase 1 + 1b: núcleo de dominio

**Prompt**: "sigamos" — construir el núcleo de dominio.

**Acción esperada**: `git init` local + `lib/diagnostico/` completo (código puro, sin IO):
tipos, `matriz.config` (fenómenos, 4 condiciones, tabla de normalización, umbrales, Δfactor),
`mapa-indagacion.config` (hilos por fenómeno, base Alemany — v0.1.0 borrador para calibrar con
Ari), `contexto-comun`, `clasificador` (DOMINANTE + caso 1–4), `motor-economico`, `schemas`
(JSON schema para `output_config.format`), `prompts/` (turno, síntesis, mensaje). Tests con
`node --test`.

**Archivos previstos**: `lib/diagnostico/{types,matriz.config,mapa-indagacion.config,contexto-comun,clasificador,motor-economico,schemas}.ts`,
`lib/diagnostico/prompts/{motor-turno,motor-sintesis,mensaje-cierre}.ts`,
`lib/diagnostico/{clasificador,motor-economico}.test.ts`.

**Resultado**: ✅ Núcleo de dominio completo. `npx tsc --noEmit` limpio · `npm run lint`
sin warnings · `npm run test:dominio` 17/17 verde · `npm run build` OK.

**Archivos tocados**:
- `lib/diagnostico/`: `types.ts`, `matriz.config.ts`, `mapa-indagacion.config.ts` (12 hilos
  para mandos_medios + 5–6 por cada uno de los otros 4, base Alemany), `contexto-comun.ts`,
  `clasificador.ts` (DOMINANTE + caso + pesos co-dominancia), `motor-economico.ts` (factor
  derivado + reducción como rango + circuito), `schemas.ts` (JSON schema para
  `output_config.format`), `index.ts` (barrel), `prompts/{motor-turno,motor-sintesis,mensaje-cierre}.ts`,
  `clasificador.test.ts` + `motor-economico.test.ts` (17 tests).
- `tsconfig.json`: `allowImportingTsExtensions: true` (compatibilidad Next + `node --test`).
- `app/layout.tsx`: `next/font/google` (Cormorant + DM Sans) en vez de `<link>`.
- `app/globals.css`: tokens de fuente via CSS variables de `next/font`.
- `next.config.ts`: `outputFileTracingRoot` (evita ambigüedad de lockfiles).
- `git init` local (rama `main`, user `espaciocounselingjunin@gmail.com`).

**Decisiones de implementación**:
- Imports con extensión `.ts` en todo `lib/diagnostico/` → funciona con Next Y con
  `node --test` nativo (Node 24 type stripping), sin build intermedio para los tests.
- `mapa-indagacion.config.ts` es **v0.1.0 borrador** — falta la sesión con Ari para redactar
  y calibrar los hilos (BACKLOG Fase 1b / pendiente 8).
- Tabla de normalización y umbrales 0.60/0.15: punto de partida en `matriz.config`, marcados
  RECALIBRAR.

**Commit**: `docs+feat: v0.1.0 — scaffold KY + núcleo de dominio`

**Próximo paso**: Fase 0 externa (proyecto Supabase EC + Vercel + push del repo a remoto).
Después Fase 4 — endpoint `/api/turno` (BFF → Claude) usando `lib/diagnostico/`, probado en
modo texto contra transcripciones ficticias tipo Alemany (eval con Ari).

---

### [2026-09-09] — Fase 2: migraciones DB

**Prompt**: "seguimos" — continuar con el plan.

**Acción esperada**: convertir `spec/init_schema.sql` (borrador consolidado) en migraciones
numeradas e idempotentes bajo `supabase/migrations/`, con RLS en la misma migración que crea
cada tabla; script aparte para el rol `newen_reader`; README del directorio.

**Archivos previstos**: `supabase/migrations/0001..0005_*.sql`, `supabase/roles/newen_reader.sql`,
`supabase/seed.sql`, `supabase/README.md`.

**Resultado**: ✅ Migraciones escritas. Sin proyecto Supabase todavía → no aplicadas (Fase 0).
`spec/init_schema.sql` pasa a ser "vista consolidada"; la fuente canónica es `supabase/migrations/`.

**Archivos tocados**:
- `supabase/migrations/0001_extensions.sql` — `pgcrypto`.
- `supabase/migrations/0002_auth_y_catalogo.sql` — `users`, `consentimiento_textos`,
  helper `es_admin()`, RLS + políticas.
- `supabase/migrations/0003_empresa_y_diagnostico.sql` — `empresa`, `diagnostico`,
  helper `puede_ver_diag()`, RLS + políticas, índices.
- `supabase/migrations/0004_diagnostico_hijas.sql` — `datos_economicos`, `consentimiento`,
  `respuesta_cruda` (cifrado `bytea`), `fenomeno_detectado`, `relacion_fenomeno`,
  `reversibilidad`, `perdida_economica`, `intervencion_propuesta`, `llamada_ia`; RLS por bucle
  con `puede_ver_diag(diagnostico_id)`.
- `supabase/migrations/0005_ec_publico_vistas.sql` — esquema `ec_publico` + 3 vistas del FDW.
- `supabase/roles/newen_reader.sql`, `supabase/seed.sql`, `supabase/README.md`.
- `spec/init_schema.sql`: header actualizado (vista consolidada, no fuente canónica).
- `BACKLOG.md`, `CHANGELOG.md`: Fase 2 marcada ✅.

**Decisiones de implementación**:
- Split en 5 migraciones por dependencia de helpers: `es_admin()` necesita `public.users`;
  `puede_ver_diag()` necesita `public.diagnostico`. Cada helper se crea justo después de su tabla.
- RLS de las 9 hijas por bucle `do $$ … format(%I) … $$` — una sola política `*_all` por tabla,
  `using` + `with check` = `puede_ver_diag(diagnostico_id)`.
- `newen_reader` fuera de las migraciones (necesita password real; se corre 1 vez en Fase 0).
- Alta de `public.users`: pendiente Fase 3 (trigger sobre `auth.users` o servicio con service_role;
  la política `users_self` es sólo `select`).

**Commit**: `feat(db): migraciones 0001–0005 (esquema EC + RLS + vistas ec_publico)`

**Próximo paso**: Fase 0 externa. Después Fase 4 — `/api/turno` (BFF → Claude `claude-haiku-4-5`
con `output_config.format` = `SCHEMA_MOTOR_TURNO`), testeable con SDK de Claude mockeado.
