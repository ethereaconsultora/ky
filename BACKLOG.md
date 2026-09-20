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

- ✅ Clientes Supabase: `lib/supabase/{env,server,client,service}.ts` (`@supabase/ssr`).
  `usuarioActual()` / `perfilActual()` con `getUser()`. Verificado (13 tablas → 200).
- ✅ Auth EC: login propio (Supabase Auth, email + OTP, `shouldCreateUser:false`). Decisión #5 cerrada.
  `middleware.ts` (refresh + guard de rutas), `app/login/`, `app/auth/signout`, layout `(app)/`
  con revalidación server-side.
- ✅ Trigger `on auth.users` → alta en `public.users` (`supabase/migrations/0007`, con backfill).
- ✅ Migraciones `0001–0007` aplicadas y verificadas en el proyecto real (16 tablas en `public`, esquema
  `ec_publico` con 3 vistas, 5 funciones, trigger `on_auth_user_created`) — 2026-09-20.
- ⬜ Dar de alta a los counselors en Supabase → Authentication → Users (hoy hay 0) y correr `supabase/seed.sql`
  (consentimiento placeholder; `consentimiento_textos` está vacía).
- ⬜ Componentes base del `DESIGN_SYSTEM.md` (hoy estilos inline con tokens).
- ⬜ `POST /api/diagnostico` + Pantalla Inicio: datos de empresa + consentimiento de audio versionado.
- ⬜ `InactivityTimer` (timeout de sesión).

## Fase 4 — Motor de Turno

- ✅ `lib/ia/` — núcleo BFF: `ClienteModelo` inyectable, Zod de salidas (`validar.ts`),
  `ejecutarTurno()` (orquestación pura), `clienteAnthropic()` (SDK). 9 tests con doble.
- ✅ Normalización + filtro PSAI B1 sobre la transcripción (`normalizar.ts`) + saneo B4.
- ✅ `@anthropic-ai/sdk` 0.68 → 0.124 (`output_config.format`, adaptive thinking).
- ✅ `POST /api/turno` (Route Handler: `getUser()` + carga diagnóstico por RLS + rate limit +
  `ejecutarTurno` + persistencia). `build` lo lista como `ƒ /api/turno`.
- ✅ Estado de fenómenos/mecanismos ↔ DB: `lib/ia/persistencia-turno.ts` (`estadoFenomenos`,
  `upsertsFenomenos`) + 4 tests. `respuesta_cruda` cifrada vía RPC `guardar_respuesta_cruda`
  (migración `0006`). `llamada_ia` con `meta`.
- ✅ Rate limit: `lib/ratelimit/` — Upstash si hay env, limiter en memoria si no.
- 🟡 Smoke test contra la API real: **plomería OK** (llega a Claude, arma `output_config.format`),
  pero el workspace de Anthropic no tiene crédito → falta cargar saldo para el eval.
- ✅ Proveedor de IA intercambiable: `lib/ia/proveedor.ts` (`KY_PROVEEDOR_IA=claude|gemini|groq|openrouter|custom`)
  + `cliente-openai-compat.ts` (modo JSON + Zod + 1 reintento). Para probar gratis y volver a Claude
  cambiando una variable. Bloqueado en Vercel production salvo `KY_PERMITIR_IA_GRATIS=1` (los tiers
  gratuitos pueden entrenar con los datos → sólo datos ficticios). 16 tests.
- ✅ Smoke test contra Gemini real (`gemini-3.5-flash`): OK, 6 s/turno con `reasoning_effort=low`.
- ✅ **Guardarraíles de suficiencia (DD-11)**: piso global de 10 turnos (R1), 3 turnos propios por fenómeno para
  confirmar (R2), confianza alta sólo con 4 (R3). Los aplica el código sobre la salida del modelo (no depende
  del prompt). Verificado con Gemini real: en el turno 3 ya no confirma. 20 tests.
- ⬜ Ari: revisar los números de `GUARDARRAILES` (10 / 2+1 / 4) y decidir si conviene la columna `fenomenos_tocados`.
- ⬜ `POST /api/diagnostico/[id]/cerrar` debe usar `evaluarCierre()` (AC-D9).
- ⬜ **Antes del lanzamiento**: recorrer el eval con Ari sobre Claude (un modelo gratis sigue peor la Mapa de Indagación).
- ✅ Migración `0006` aplicada.
- ⬜ Auth real (login) para poder llamar a `/api/turno` de punta a punta.
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
