# KY — Copiloto de diagnóstico de Espacio Crítico (Versión B)

App de **tablet** que asiste al Counselor de Espacio Crítico durante una entrevista
diagnóstica real con una empresa mediana o grande. Corre el **motor de turno** (analiza cada
respuesta y sugiere la siguiente pregunta), el **motor de síntesis** (reconstruye relaciones
entre fenómenos y arma la intervención) y el **motor económico** (traduce los hallazgos a
pérdida y proyección). Publica los resultados hacia el dashboard de Newen.

> KY es la Versión B del método EC. La Versión A (autodiagnóstico web público) no se
> construye en esta v1, pero el modelo de datos ya la contempla.

## Estado

`v0.1.0` — Fase 0/1: scaffold + núcleo de dominio (matriz, mapa de indagación, clasificador,
motor económico, generadores de prompt). Sin UI ni STT todavía.

## Stack

Next.js 15 (App Router, PWA) · React 19 · TypeScript · Tailwind 4 · Supabase (proyecto propio
de EC, Postgres + Auth + RLS + pgcrypto) · API de Claude (BFF) · STT en tiempo real (proveedor
a confirmar) · Vercel · Upstash Redis (rate limit).

## Orden de lectura

Ver [`AGENTS.md`](AGENTS.md). En una línea:
`PRIMORDIAL.md` → `WORKFLOW.md` → `spec/SPEC_MATRIX.md` → `SECURITY_SUMMARY.md` → `BACKLOG.md`.

El plan aprobado y el análisis de los 8 MD del método viven en
[`spec/PLAN_APROBADO.md`](spec/PLAN_APROBADO.md) y [`spec/metodo-ec/`](spec/metodo-ec/).

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local   # completar credenciales
npm run typecheck
npm run test:dominio               # tests de las funciones puras de dominio
npm run dev
```

## Convenciones

- Idioma: español (código, docs, commits, logs).
- `feat` | `fix` | `refactor` | `docs` | `chore` | `security` — cada commit referencia un log
  de `logs/`.
- Nunca se escribe código sin antes registrar en `logs/CHANGELOG_DEV.md` (ver `WORKFLOW.md`).
