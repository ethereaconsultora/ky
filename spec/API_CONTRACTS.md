# API CONTRACTS — KY

Todas las rutas (salvo auth) requieren sesión de Supabase verificada server-side con
`getUser()`. Todas validan el body con Zod. Las que llaman a un modelo o al STT están detrás de
rate limit (Upstash). Detalle de esquemas en `openapi.yaml`.

## Auth

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/acceso/enlace` | No | «Crear cuenta» y «olvidé mi contraseña»: `{ email }`. Si el email está en `usuarios_habilitados`, crea la cuenta (si no existe) y Supabase manda el link para elegir la contraseña. Responde **siempre 200 con el mismo mensaje** (no revela quién está habilitado). 400 datos inválidos · 429 límites (8/h por IP, 3/h por email, o de mails de Supabase) · 502 no se pudo enviar el mail · 503 falta la migración 0010 |
| — | Ingreso / nueva contraseña | No | Cliente de Supabase en el navegador: `signInWithPassword`; `/reset-password` usa `updateUser({ password })` con la sesión que deja el link |

Todas las rutas de escritura responden `403 cuenta_no_habilitada` si la cuenta no tiene `app_metadata.ky_activo` (lo pone el trigger de
`auth.users` según `usuarios_habilitados`).

## Diagnóstico

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/diagnostico` | counselor | Crea empresa (o la reusa) + diagnóstico `en_curso`, guarda `datos_economicos` y el consentimiento |
| GET | `/api/diagnostico/[id]` | counselor dueño / admin | Estado completo: fenómenos, mecanismos, respuestas (metadata), Mapa EC |
| POST | `/api/diagnostico/[id]/cerrar` | counselor dueño | Marca `cerrado`, dispara síntesis + motor económico. **Con < 10 turnos: `409 evidencia_insuficiente`** (`evaluarCierre()`, DD-11); con `forzar_sin_diagnostico` cierra como `SIN_EVIDENCIA_SUFICIENTE`, sin económico ni intervención |
| POST | `/api/diagnostico/[id]/pausar` | counselor dueño | `pausado` + `resume_token` + `expires_at` |

## Motores de IA (BFF)

| Método | Ruta | Modelo | Rate limit | Descripción |
|---|---|---|---|---|
| POST | `/api/turno` | `claude-haiku-4-5` | 30 / 5 min por `diagnostico_id` | Recibe `{ diagnostico_id, respuesta_texto }`. Normaliza (PSAI B1), llama al Motor de Turno, persiste `respuesta_cruda` + `fenomeno_detectado` + `llamada_ia`. Pasa por los guardarraíles de suficiencia (DD-11). Devuelve `fenomenos_actualizados`, `accion`, `fenomeno_siguiente_prioridad`, `sugerencias_pregunta[]`, `alerta_seguridad`, `progreso {turnos, minimo, faltan, puede_concluir}` y `avisos[]` |
| POST | `/api/sintesis` | `claude-opus-5` | 5 / hora por `diagnostico_id` | Corre el Motor de Síntesis sobre los fenómenos confirmados. Persiste `relacion_fenomeno`, `reversibilidad`, `intervencion_propuesta`, `diagnostico.caso` |
| POST | `/api/sintesis/mensaje` | `claude-haiku-4-5` | 5 / hora por `diagnostico_id` | Redacta el mensaje de cierre a partir del `resultado_tipo` ya clasificado |

## STT

| Método | Ruta | Rate limit | Descripción |
|---|---|---|---|
| POST | `/api/stt/token` | 20 / hora por counselor | Acuña un token efímero (TTL `STT_TOKEN_TTL_SECONDS`) contra el proveedor configurado. No acepta URLs ni hosts del cliente |

## Entrega

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| PATCH | `/api/intervencion/[id]` | counselor dueño | Edita `descripcion` / `traduccion_humana` (10–2000 car.). Sólo en borrador; aprobada ⇒ 409 |
| POST | `/api/diagnostico/[id]/aprobar` | counselor dueño | Aprueba TODA la propuesta (`aprobada_por_consultor = true`, `aprobada_at`). Sólo cerrado y en borrador; si no ⇒ 409 |
| POST | `/api/diagnostico/[id]/enviar` | counselor dueño | Marca la propuesta como entregada: `enviada_at` + `artefacto_url` = `/diagnostico/[id]/informe` (imprimible/PDF). Requiere aprobada; KY no envía el mail |

## Reglas transversales

- El **motor económico** NO es un endpoint — corre dentro de `/api/diagnostico/[id]/cerrar`,
  como función pura de `lib/diagnostico/motor-economico.ts`.
- Toda salida de modelo se valida con `output_config.format` (JSON schema de `lib/diagnostico/schemas.ts`).
- Toda salida de modelo se sanea (PSAI B4) antes de devolverla al cliente.
- Errores: `{ error: { code, message } }` con status HTTP correcto; nunca pantalla en blanco en la UI.
