# API CONTRACTS — KY

Todas las rutas (salvo auth) requieren sesión de Supabase verificada server-side con
`getUser()`. Todas validan el body con Zod. Las que llaman a un modelo o al STT están detrás de
rate limit (Upstash). Detalle de esquemas en `openapi.yaml`.

## Auth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/otp` | No | Envía OTP / magic link al email del counselor |
| GET | `/auth/callback` | No | Callback de Supabase Auth |

## Diagnóstico

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/diagnostico` | counselor | Crea empresa (o la reusa) + diagnóstico `en_curso`, guarda `datos_economicos` y el consentimiento |
| GET | `/api/diagnostico/[id]` | counselor dueño / admin | Estado completo: fenómenos, mecanismos, respuestas (metadata), Mapa EC |
| POST | `/api/diagnostico/[id]/cerrar` | counselor dueño | Marca `cerrado`, dispara síntesis + motor económico |
| POST | `/api/diagnostico/[id]/pausar` | counselor dueño | `pausado` + `resume_token` + `expires_at` |

## Motores de IA (BFF)

| Método | Ruta | Modelo | Rate limit | Descripción |
|---|---|---|---|---|
| POST | `/api/turno` | `claude-haiku-4-5` | 30 / 5 min por `diagnostico_id` | Recibe `{ diagnostico_id, respuesta_texto }`. Normaliza (PSAI B1), llama al Motor de Turno, persiste `respuesta_cruda` + `fenomeno_detectado` + `llamada_ia`. Devuelve `fenomenos_actualizados`, `accion`, `fenomeno_siguiente_prioridad`, `sugerencias_pregunta[]`, `alerta_seguridad` |
| POST | `/api/sintesis` | `claude-opus-5` | 5 / hora por `diagnostico_id` | Corre el Motor de Síntesis sobre los fenómenos confirmados. Persiste `relacion_fenomeno`, `reversibilidad`, `intervencion_propuesta`, `diagnostico.caso` |
| POST | `/api/sintesis/mensaje` | `claude-haiku-4-5` | 5 / hora por `diagnostico_id` | Redacta el mensaje de cierre a partir del `resultado_tipo` ya clasificado |

## STT

| Método | Ruta | Rate limit | Descripción |
|---|---|---|---|
| POST | `/api/stt/token` | 20 / hora por counselor | Acuña un token efímero (TTL `STT_TOKEN_TTL_SECONDS`) contra el proveedor configurado. No acepta URLs ni hosts del cliente |

## Entrega

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/intervencion/[id]/aprobar` | counselor dueño | `aprobada_por_consultor = true`, `aprobada_at = now()` |
| POST | `/api/intervencion/[id]/enviar` | counselor dueño | Genera el artefacto (PDF), setea `enviada_at` + `artefacto_url` |

## Reglas transversales

- El **motor económico** NO es un endpoint — corre dentro de `/api/diagnostico/[id]/cerrar`,
  como función pura de `lib/diagnostico/motor-economico.ts`.
- Toda salida de modelo se valida con `output_config.format` (JSON schema de `lib/diagnostico/schemas.ts`).
- Toda salida de modelo se sanea (PSAI B4) antes de devolverla al cliente.
- Errores: `{ error: { code, message } }` con status HTTP correcto; nunca pantalla en blanco en la UI.
