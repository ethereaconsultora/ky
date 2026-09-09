# CHANGELOG — KY

Registro de versiones publicadas (una entrada por release). El detalle día a día vive en
`logs/CHANGELOG_DEV.md`.

Formato: [Keep a Changelog](https://keepachangelog.com/es/1.0.0/) · SemVer.

---

## [0.1.0] — 2026-09-08 — Scaffold + documentación

### Added
- Estructura estándar del ecosistema instanciada para KY: `PRIMORDIAL.md`, `ARCHITECTURE.md`,
  `SECURITY.md`, `SECURITY_SUMMARY.md`, `DESIGN_SYSTEM.md`, `AGENTS.md`, `WORKFLOW.md`,
  `BACKLOG.md`, `README.md`.
- `PROTOCOLOS/`: copia de `PSAI_v1.3.md` + `PROTOCOLO_MAESTRO.md` (aplicado a KY) +
  `ARQUITECTURA_COMERCIAL_NEWEN.md` + `ESPACIO_EMPRESA_STANDARD.md`.
- `spec/`: SDD completo (`SPEC_MATRIX`, `PROJECT_PLAN`, `DATA_MODEL`, `init_schema.sql`,
  `API_CONTRACTS`, `openapi.yaml`, `USER_STORIES`, `USE_CASES`, `ACCEPTANCE_CRITERIA`,
  `DESIGN_DECISIONS`, `DEPLOYMENT`, `DEPLOYMENT_CHECKLIST`, `TEST_PLAN`, `UX_FLOW`,
  `DATA_PRIVACY`).
- `spec/PLAN_APROBADO.md`: plan de construcción + análisis de los 8 MD del método +
  Parte 1.E (motor de preguntas adaptativas, base Jordi Alemany).
- `spec/metodo-ec/`: los 8 documentos fuente del método EC.
- `logs/`: `README.md`, `CHANGELOG_DEV.md`, `BUGS.md`.
- Config del proyecto: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`,
  `.gitignore`, `.env.local.example`, `.eslintrc.json`.

### Added — núcleo de dominio (`lib/diagnostico/`)
- `types.ts`, `matriz.config.ts` (5 fenómenos, 4 condiciones, tabla de normalización
  `intensidad/confianza → 0–1`, umbrales `0.60/0.15`, `Δfactor_fricción` por fenómeno).
- `mapa-indagacion.config.ts` — **v0.1.0 borrador** (Parte 1.E): 12 hilos para `mandos_medios`
  + 5–6 por cada uno de los otros 4 fenómenos, base Jordi Alemany; mecanismos de profundidad
  (laddering, contraste temporal, cambio de perspectiva, forzar especificidad, reformular) y
  anti-patrones "Nunca".
- `clasificador.ts` — modo DOMINANTE (incluye `DOMINANTE_DEBIL`), clasificación de caso 1–4,
  pesos de co-dominancia. Función pura, nunca `undefined`.
- `motor-economico.ts` — factor de fricción derivado de los fenómenos confirmados (DD-05);
  reducción proyectada **siempre como rango**; casos 1/2/3/4 con descuento de circuito.
- `schemas.ts` — JSON Schemas para `output_config.format` (turno, síntesis, mensaje).
- `prompts/` — generadores de system+user prompt de los 3 motores desde la config versionada.
- Tests (`node --test`): 17 casos, verde. `tsc --noEmit`, `next lint` y `next build` limpios.

### Added — migraciones DB (`supabase/`)
- `supabase/migrations/0001..0005`: `pgcrypto`; `users` + `consentimiento_textos`; `empresa` +
  `diagnostico`; 9 tablas hijas + `llamada_ia`; esquema `ec_publico` con las 3 vistas del FDW.
  Idempotentes, RLS en la misma migración que crea cada tabla, helpers `es_admin()` /
  `puede_ver_diag()` (`security definer`).
- `supabase/roles/newen_reader.sql` (rol de solo lectura, se corre a mano en Fase 0).
- `supabase/seed.sql` (consentimiento placeholder), `supabase/README.md`.

### Pendiente
- Shell de la tablet, endpoint `/api/turno`, STT, motor de síntesis, pantallas, integración Newen.
- Aplicar migraciones contra el proyecto Supabase real (Fase 0) + trigger de alta en `public.users`.
- Sesión con Ari para calibrar `mapa-indagacion.config` y los umbrales.
