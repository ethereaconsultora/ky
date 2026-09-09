# BACKLOG — KY

> Tareas de desarrollo. Sprints alineados con las Fases del `spec/PLAN_APROBADO.md` (Parte 6).
> Estado: ⬜ pendiente · 🟡 en curso · ✅ hecho.

---

## Sprint actual — Fase 0 + 1: scaffold + núcleo de dominio

- ✅ Instanciar archivos raíz del ecosistema para KY (docs + protocolos + SDD).
- ✅ `git init` local (rama `main`).
- ⬜ Crear proyecto Supabase de EC + proyecto Vercel `ky` + remoto Git (ramas `dev`/`main`).
- ⬜ Keep-alive n8n para el proyecto Supabase de EC (ping cada 24 h).
- ✅ `lib/diagnostico/matriz.config.ts` — 5 fenómenos, 4 condiciones, normalización, umbrales,
  `Δfactor_fricción`. Resuelve B1, B2, B3, I1.
- 🟡 `lib/diagnostico/mapa-indagacion.config.ts` — **v0.1.0 borrador** (12 hilos mandos_medios +
  5–6 c/u en el resto). Falta sesión con Ari para redactar/calibrar (Fase 1b / pendiente 8).
- ✅ `lib/diagnostico/contexto-comun.ts`.
- ✅ `lib/diagnostico/clasificador.ts` — DOMINANTE (+ `DOMINANTE_DEBIL`) + caso 1–4 + pesos.
- ✅ `lib/diagnostico/motor-economico.ts` — factor derivado + reducción como rango + circuito.
- ✅ `lib/diagnostico/schemas.ts`.
- ✅ `lib/diagnostico/prompts/` — turno, síntesis, mensaje de cierre.
- ✅ Tests de dominio (`node --test`) — 17/17 verde. `tsc`/`lint`/`build` limpios.

## Fase 2 — DB

- ✅ Migraciones numeradas en `supabase/migrations/0001..0005` (esquema de `spec/DATA_MODEL.md`),
  idempotentes.
- ✅ RLS por counselor en cada tabla base (misma migración) + helpers `es_admin()` /
  `puede_ver_diag()` (`security definer`, `search_path` fijo).
- ✅ `pgcrypto` (extensión) + columnas `bytea` cifradas en `respuesta_cruda`. El
  `pgp_sym_encrypt` va en el backend (Fase 4).
- ✅ Vistas `ec_publico.v_diagnostico` / `v_perdida_economica` / `v_intervencion_propuesta`.
- ✅ Script del rol `newen_reader` (`supabase/roles/newen_reader.sql`) — se corre a mano en Fase 0.
- ⬜ Trigger/servicio de alta en `public.users` al crear `auth.users` (pendiente Fase 3).
- ⬜ Aplicar las migraciones contra el proyecto real (depende de Fase 0).

## Fase 3 — Shell + Inicio

- ⬜ Auth EC (Supabase Auth, email + OTP) + server layout con `getUser()`.
- ⬜ Componentes base del `DESIGN_SYSTEM.md`.
- ⬜ Pantalla Inicio: datos de empresa + consentimiento de audio versionado.
- ⬜ `InactivityTimer` (timeout de sesión).

## Fase 4 — Motor de Turno

- ✅ `lib/ia/` — núcleo BFF: `ClienteModelo` inyectable, Zod de salidas (`validar.ts`),
  `ejecutarTurno()` (orquestación pura), `clienteAnthropic()` (SDK). 9 tests con doble.
- ✅ Normalización + filtro PSAI B1 sobre la transcripción (`normalizar.ts`) + saneo B4.
- ✅ `@anthropic-ai/sdk` 0.68 → 0.124 (`output_config.format`, adaptive thinking).
- ⬜ `POST /api/turno` (Route Handler: auth `getUser()` + rate limit Upstash + persistencia).
- ⬜ Estado de fenómenos/mecanismos persistido en DB (`fenomeno_detectado`, `respuesta_cruda`
  cifrada, `llamada_ia` con `meta`).
- ⬜ Smoke test de `cliente.ts` contra la API real (`ANTHROPIC_API_KEY`).
- ⬜ Eval de amplitud/profundidad con Ari (transcripciones ficticias tipo Alemany).

## Fase 5 — Pantalla Conversación

- ⬜ Mapa EC en construcción (chips + intensidad/confianza).
- ⬜ Control "respuesta lista → analizar" + detección de silencio.
- ⬜ Sugerencias de próxima pregunta (pills).

## Fase 6 — STT

- ⬜ `POST /api/stt/token` (token efímero).
- ⬜ WebSocket al proveedor + transcripción viva + persistencia.
- ⬜ Fallback a captura manual. Cola offline (IndexedDB).

## Fase 7 — Síntesis + Económico

- ⬜ `POST /api/sintesis` (Claude `claude-opus-5`).
- ⬜ Motor económico ejecutado al cierre.
- ⬜ `resultado_tipo` (incluye `DOMINANTE_DEBIL`).
- ⬜ Las 4 visualizaciones de caso del Mapa EC.

## Fase 8 — Resultado + Intervención

- ⬜ Pantalla Resultado (3 capas: sabemos / estimamos / proyectamos).
- ⬜ Pantalla Intervención (rangos, no cifras categóricas).
- ⬜ Editar / aprobar / enviar + artefacto PDF.

## Fase 9 — Integración Newen

- ⬜ FDW `Wrappers` en el proyecto Newen → `ec_publico.*`.
- ⬜ Sección "Diagnóstico EC" en `app/(empresa)` de Newen (match por `organization_client_id`).

## Fase 10 — Hardening

- ⬜ Protocolo de crisis (`alerta_seguridad`).
- ⬜ `llamada_ia` (auditoría de prompts + costo).
- ⬜ Política de retención de `respuesta_cruda`.
- ⬜ Scanner de secretos + POST-DEPLOY CHECK.

---

## Decisiones abiertas (ver `spec/PLAN_APROBADO.md` §Pendientes)

1. Proveedor STT (Deepgram / AssemblyAI / Azure).
2. Modelo de síntesis (`claude-opus-5` vs `claude-sonnet-5`).
3. Valores concretos de la tabla de normalización + recalibración de 0.60/0.15.
4. Días de retención de `respuesta_cruda`.
5. Auth: login propio de EC (recomendado) vs SSO con Newen.
6. Texto de consentimiento de audio (contenido legal).
7. ¿`costo_intervención` puntual o anual? (ROI).
8. Contenido de la Mapa de Indagación (sesión con Ari) + ¿prompt lleva la Mapa completa o subconjunto?
9. ¿"Mandos medios" como lente principal con los otros 4 como mecanismos que la atraviesan?
