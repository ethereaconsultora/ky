# DEPLOYMENT CHECKLIST — KY

## Antes de crear

- [ ] Ramas Git `main` / `dev` definidas.
- [ ] Proyecto Supabase de EC creado (distinto del de Newen).
- [ ] Proyecto Vercel `ky` creado, **Framework Preset = Next.js**.
- [ ] Env vars cargadas en Vercel (Production + Preview) — ver `.env.local.example`.
- [ ] Keep-alive n8n apuntando al Supabase de EC.
- [ ] `DESIGN_SYSTEM.md` definido.

## Al crear (Auto-Auditoría Bloque 0 en el log del día)

- [ ] BFF: la tablet no llama a Claude ni al STT con credencial permanente.
- [ ] RLS activa en **todas** las tablas base (`spec/init_schema.sql` ejecutado y verificado).
- [ ] `pgcrypto` sobre `respuesta_cruda.texto_cifrado` / `transcripcion_cifrada`.
- [ ] `EC_PGCRYPTO_KEY` sólo en env del server.
- [ ] Migraciones numeradas guardadas en `/supabase/migrations`.
- [ ] Zod en cada Route Handler.
- [ ] pgbouncer (transaction mode) en las Route Handlers.
- [ ] Rate limit Upstash en `/api/turno`, `/api/sintesis`, `/api/stt/token`.
- [ ] SQL revisado a mano antes de correr.
- [ ] Normalización PSAI B1 sobre la transcripción antes del motor.
- [ ] Validación PSAI B4 sobre las salidas del modelo.
- [ ] `llamada_ia` registrando cada llamada.

## Al validar (rama dev)

- [ ] Preview URL probada por Ari.
- [ ] Análisis de impacto confirmado.
- [ ] Sin `console.log()` en producción.
- [ ] `npm run typecheck` sin errores.
- [ ] `npm run test:dominio` verde (clasificador + motor económico).
- [ ] Eval de amplitud/profundidad del motor de turno revisado con Ari (Fase 4).
- [ ] Free tier Supabase / Vercel por debajo del 70 %.
- [ ] Scanner de secretos (GitGuardian / TruffleHog) sin hallazgos en el historial.

## Al mergear a main

- [ ] Confirmación explícita de Ari.
- [ ] Backup del Supabase de EC si el cambio es estructural.

## Post-deploy

- [ ] `vercel curl "https://<url>/login" --head` → 200.
- [ ] `vercel project inspect ky` → Framework Preset: Next.js.
- [ ] `vercel logs <url>` → sin 500.
- [ ] Bundle de producción sin `ANTHROPIC_API_KEY` ni `STT_API_KEY`.
- [ ] Dos counselors: uno no ve el diagnóstico del otro (403).
- [ ] `newen_reader` no puede `SELECT` sobre `public.respuesta_cruda`; sí sobre `ec_publico.v_*`.

## Integración Newen (Fase 9)

- [ ] `wrappers` habilitado en el proyecto Newen.
- [ ] Password de `newen_reader` guardada como Vault secret (no inline).
- [ ] `import foreign schema ec_publico` ejecutado.
- [ ] Sección "Diagnóstico EC" en `app/(empresa)` de Newen muestra el dato por
      `organization_client_id` y **no** muestra transcripciones.
