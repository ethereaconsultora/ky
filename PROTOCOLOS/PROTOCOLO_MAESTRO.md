# Protocolo Maestro de Arquitectura — aplicado a KY

> Protocolo obligatorio de arquitectura, seguridad y despliegue para el stack
> **Supabase + Vercel + n8n + HuggingFace + GitHub**. Claude debe ejecutarlo activamente,
> no sólo conocerlo. Fuente: memoria del proyecto `protocolo-maestro-arquitectura`.

**Stack de creación:** VS Code + Claude Code + n8n + HuggingFace + Supabase
**Stack de apps:** Supabase + Vercel + GitHub
**Tier:** Free en todos los servicios, con miras a escalar a pago.
**Contexto KY:** datos organizacionales sensibles y personas nombradas en la evidencia →
requieren cifrado en reposo.

---

## BLOQUE 0 — AUTO-AUDITORÍA OBLIGATORIA

Ejecutar antes de entregar SQL, Edge Function o cambio estructural. Dejar el resultado en el
log del día.

```
AUTO-AUDITORÍA
□ SECRETOS      ¿API Keys hardcodeadas?             → deben ser process.env
□ BFF           ¿El frontend llama APIs externas?   → debe ir por el backend
□ RLS           ¿Cada tabla tiene política?          → nadie accede por defecto
□ ENCRIPTACIÓN  ¿Campos sensibles encriptados?      → pgcrypto en respuesta_cruda / evidencia
□ POOLING       ¿pgbouncer en serverless?            → no conexión directa
□ AUTH          ¿JWT / auth.uid() validado?          → getUser() server-side, no getSession()
□ RATE LIMIT    ¿Endpoint expuesto sin límite?       → Upstash en /api/turno, /api/sintesis, /api/stt/token
□ IMPACTO       ¿Afecta funciones existentes?        → análisis antes de entregar
RESULTADO: [APROBADO / OBSERVACIONES: ...]
```

---

## BLOQUE 1 — GIT WORKFLOW

```
feature/xxx → dev → (validación Ari + análisis impacto) → main
```
- Todo código nuevo va a `dev`. Vercel genera Preview URL.
- Merge a `main` sólo con confirmación explícita de Ari. Nunca push directo a `main`.
- Pre-despliegue: scanner de secretos (GitGuardian / TruffleHog) sobre el historial.

---

## BLOQUE 2 — SEGURIDAD

**Secretos:** sólo `process.env`. `.env.local` en `.gitignore` antes del primer commit.
Nunca escribir tokens reales en archivos de memoria — referenciar dónde están.

**BFF (Backend-for-Frontend):** el frontend nunca llama a Claude, al STT ni a Supabase con
credencial permanente. El backend procesa la key server-side y devuelve el resultado limpio.
Para el STT en tiempo real: **token efímero** acuñado por el backend (TTL corto), nunca la
key permanente en la tablet.

**Auth:** RLS en cada tabla desde el inicio (sin política = sin acceso). `auth.uid()` en las
políticas. JWT verificado server-side con `getUser()` (no `getSession()`). En App Router:
proteger rutas con `getUser()` en server layouts (`app/(app)/layout.tsx`).

**Encriptación:** HTTPS + HSTS en tránsito. `pgcrypto` en reposo sobre
`respuesta_cruda.texto`, `respuesta_cruda.transcripcion` y campos de evidencia con personas
nombradas. CORS sólo al dominio de la tablet. Sanitización de todas las entradas.

---

## BLOQUE 3 — BASE DE DATOS

- Migrations numeradas en `/supabase/migrations`. Todo SQL de IA revisado a mano antes de correr.
- Probar en `dev` con datos ficticios antes de producción.
- pgbouncer (Transaction Mode) en serverless. Nunca conexión directa.
- Backup semanal vía n8n → Google Drive o GitHub.
- Monitorear el pool de conexiones; alertar antes del límite.

---

## BLOQUE 4 — INFRAESTRUCTURA VIVA

- Keep-alive n8n: ping HuggingFace cada 20 min · ping Supabase cada 24 h (`SELECT 1`) · backup DB semanal.
- Alertas con umbrales: sólo si el consumo supera 70 % por más de 5 min continuos.
- Niveles → Telegram (@cyberespacio_bot): leve (retry silencioso) · medio (log + Telegram) ·
  crítico (Telegram inmediato + pausar workflow).

---

## BLOQUE 5 — LÍMITES FREE TIER (escalar antes del 70 %)

| Servicio | Límite crítico |
|---|---|
| Supabase | 500 MB DB, pausa a 7 días de inactividad |
| Vercel | 100 GB bandwidth, 10 s timeout serverless |
| HuggingFace | Sleep a 48 h sin actividad |

> Nota KY: el proyecto Supabase de EC es **el segundo** proyecto free del ecosistema
> (Newen usa el primero). Vigilar la política de pausa a 7 días con keep-alive.

---

## BLOQUE 6 — VALIDACIÓN, UX Y RATE LIMITING

- Zod en el edge antes de enviar a Supabase o a la API de Claude.
- Rate limiting en todos los endpoints públicos y en los que llaman a Claude / STT
  (Upstash Redis free). Límite por `diagnostico_id` y por counselor.
- Manejo de errores visible — nunca pantalla en blanco.
- Responsive: la tablet es el target primario; funcionar también en desktop.
- Feedback inmediato en formularios.

---

## BLOQUE 7 — CALIDAD DE CÓDIGO

- Sin `console.log()` en producción. DRY. camelCase JS / snake_case SQL.
- Supabase (EC) es la única fuente de verdad — ni n8n ni el frontend guardan estado importante aparte.

---

## BLOQUE 8 — VERIFICACIÓN DE DEPLOY OBLIGATORIA

Antes de avisar que algo está listo para probar:

```
POST-DEPLOY CHECK
1. vercel curl "https://[url]/login" --head → 200
2. vercel project inspect ky → Framework Preset = Next.js
3. vercel logs [url] → sin errores 500
4. Sólo si los tres pasan → avisar
```

---

## BLOQUE 9 — DESIGN SYSTEM

- KY consume `DESIGN_SYSTEM.md` (Etherea DS, tema institucional EC). Antes de cambiar estilos
  globales: verificar impacto en todas las vistas.

---

## CHECKLIST DE DESPLIEGUE

```
ANTES DE CREAR
□ Ramas Git (main/dev)  □ Env vars en Vercel  □ Framework Preset = Next.js
□ Keep-alive n8n activo  □ Design System definido

AL CREAR (Auto-Auditoría Bloque 0)
□ BFF  □ RLS desde el inicio  □ pgcrypto en campos sensibles
□ Migration numerada  □ Zod en el edge  □ pgbouncer  □ Rate limiting  □ SQL revisado a mano

AL VALIDAR (rama dev)
□ Preview URL probada por Ari  □ Análisis de impacto  □ Sin console.log()
□ Free tier < 70 %  □ Scanner de secretos ejecutado

AL MERGEAR A MAIN
□ Confirmación explícita de Ari  □ Backup previo si el cambio es estructural
```
