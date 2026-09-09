# Seguridad en 1 minuto — KY

## Lo esencial

| Regla | Detalle |
|---|---|
| 🔑 API Keys | NUNCA en frontend. Sólo `NEXT_PUBLIC_*` para la anon key de Supabase. Claude / STT sólo server-side. |
| 🎫 STT | La tablet abre el WebSocket al STT con un **token efímero** (TTL corto) acuñado por el backend. La key permanente nunca sale del server. |
| 🛡️ RLS | Todas las tablas de EC con Row Level Security desde la migración que las crea. Sin política = sin acceso. |
| 🔒 Cifrado | `pgcrypto` sobre `respuesta_cruda.texto`, `respuesta_cruda.transcripcion` y evidencia con personas nombradas. |
| 🚪 Auth | `getUser()` server-side en server layouts. Nunca `getSession()`. Nunca confiar en el cliente. |
| 🧱 Aislamiento | `respuesta_cruda` NUNCA sale del proyecto EC. Newen ve sólo vistas `ec_publico.*` (diagnóstico, pérdida, intervención). |
| 📝 Auditoría | `llamada_ia` registra modelo + prompt_version + tokens por cada llamada. Trazabilidad: toda conclusión de la IA apunta a `respuesta_cruda`. |
| 🚨 Crisis | Si el motor de turno marca `alerta_seguridad` (autolesión / acoso / violencia / ilícito) → aviso al Counselor, no persistir el fragmento en claro. |
| ⏱️ Rate limit | Upstash en `/api/turno`, `/api/sintesis`, `/api/stt/token`. Por `diagnostico_id` y por counselor. |
| 📊 Proyección | "Reducción estimada" y ROI SIEMPRE como rango, marcados "sin validar". Nunca como conclusión. |

## Ante cada feature nueva (Auto-Auditoría Bloque 0)

1. ¿API key nueva? → `.env.local`, NUNCA `NEXT_PUBLIC_*`.
2. ¿Toca datos de la entrevista? → RLS + cifrado + `llamada_ia` / trazabilidad.
3. ¿Acepta input? → Zod en el edge + sanitización + (si va a un modelo) normalización PSAI B1.
4. ¿Se expone a Newen? → sólo vía vista `ec_publico.*`, nunca tabla base.
5. ¿Llama a Claude / STT? → BFF + rate limit.

## Si algo falla

1. `logs/BUGS.md` con tag `[SEGURIDAD]`.
2. Commit con prefijo `security:`.
3. Notificar a Ari.

## Referencias

`SECURITY.md` (completo) · `PROTOCOLOS/PSAI_v1.3.md` · `PROTOCOLOS/PROTOCOLO_MAESTRO.md`.
