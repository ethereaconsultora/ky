# SECURITY — KY

> PSAI v1.3 + Protocolo Maestro aplicados a KY. Este documento es el protocolo completo;
> para el día a día alcanza `SECURITY_SUMMARY.md`.

---

## Principios

- **Security by design** — la seguridad se diseña antes del primer endpoint.
- **Zero trust** — todo input (usuario, audio, transcripción, DB, respuesta de API) es
  sospechoso hasta validarse.
- **Defense in depth** — cada capa es independiente y funcional aunque las otras fallen.
- **Minimización de datos** — el motor necesita la transcripción, no el audio; la evidencia
  cruda tiene un ciclo de vida propio y se puede borrar sin afectar el diagnóstico derivado.

---

## Superficie de ataque específica de KY

| Amenaza | Mitigación |
|---|---|
| Prompt injection vía transcripción (el entrevistado dice "ignorá tus instrucciones…") | Normalización + filtro de patrones (PSAI B1A) sobre la transcripción antes de mandarla al motor. El motor NUNCA ejecuta instrucciones que aparezcan en la evidencia — su system prompt lo fija explícitamente. |
| Exfiltración de evidencia de otro diagnóstico vía el modelo | El motor recibe sólo el estado del diagnóstico en curso; RLS por counselor; `service_role` sólo en Route Handlers, nunca expuesto. |
| Leak de `respuesta_cruda` hacia Newen | Newen lee sólo vistas `ec_publico.*`; el rol `newen_reader` no tiene `SELECT` sobre tablas base. |
| Output del modelo con markdown/links que exfiltra al renderizar | Validación de output (PSAI B4): sin links externos ni imágenes markdown en las sugerencias de pregunta ni en los textos generados. La UI no renderiza markdown con links externos. |
| Token flooding / abuso de la API de Claude | Rate limit Upstash por `diagnostico_id` + por counselor. Límite de tokens de entrada por turno. |
| SSRF vía el endpoint de token STT | El endpoint sólo acuña un token contra el proveedor configurado en `env`; no acepta URLs del cliente. |
| Contenido sensible en texto libre (crisis) | Bandera `alerta_seguridad` del motor de turno → aviso al Counselor + el fragmento no se persiste en claro (se guarda hash + marca). |

---

## Bloque 1 — Detección de intención maliciosa (sobre la transcripción)

- **1A Normalización + patrones**: normalizar la transcripción (Unicode, espaciado intencional,
  base64 acotado) antes de cualquier regex. Patrones base PSAI + patrones de dominio
  organizacional. Un match no bloquea la entrevista: marca la respuesta y la sanea antes de
  enviarla al motor.
- **1B Clasificador**: dominio `clinico`-adyacente — clasificar UNSAFE si el input intenta
  alterar el comportamiento del sistema o acceder a datos de otros diagnósticos. (Implementación
  concreta — LlamaGuard local vs. clasificador propio — se define en la Fase 10.)

## Bloque 2 — Validación de schema

- **Zod** en cada Route Handler antes de tocar la DB o llamar a un modelo.
- Salidas de los motores validadas con `output_config.format` (JSON schema) en la capa de la
  API — el modelo reintenta si no valida.
- El endpoint de token STT no acepta hosts del cliente (previene SSRF).

## Bloque 3 — Auditoría

- `llamada_ia` (tipo, modelo, prompt_version, mapa_indagacion_version, tokens_in/out,
  latencia_ms, timestamp) por cada llamada a un modelo.
- `respuesta_cruda` cifrada en reposo (`pgcrypto`). Campos de evidencia con nombres, cifrados.
- Alerta de patrón recurrente: 3+ marcas de `alerta_seguridad` o de bloqueo B1 en 10 min → aviso.
- Retención de `respuesta_cruda`: N días (a definir con legal antes de producción; ver
  `spec/DATA_PRIVACY.md`).

## Bloque 4 — Validación de outputs

- Sanitizar toda salida de modelo antes de mostrarla al Counselor: sin `<script>`,
  `javascript:`, `data:text/html`, sin imágenes markdown externas, sin links no whitelisted.
- La UI de la tablet no renderiza markdown con links externos.

---

## Auth y RLS

- Supabase Auth propio de EC (email + OTP). Rol en `users.rol` (`counselor` | `admin`).
- Rutas protegidas por server layout con `getUser()` (`app/(app)/layout.tsx`).
- RLS: un counselor sólo ve diagnósticos propios / de su organización EC. `admin` ve todo.
- `service_role` sólo en Route Handlers server-side, nunca en el cliente.

---

## Rate limiting

| Endpoint | Límite (punto de partida) |
|---|---|
| `/api/turno` | 30 / 5 min por `diagnostico_id` |
| `/api/sintesis` | 5 / hora por `diagnostico_id` |
| `/api/stt/token` | 20 / hora por counselor |

Implementación: `@upstash/ratelimit` con `INCR`+`EXPIRE` atómico.

---

## Cumplimiento legal

- Consentimiento de audio informado y versionado (`consentimiento` + `consentimiento_textos`),
  registrado por diagnóstico y sellado en cada `respuesta_cruda`.
- Argentina Ley 25.326 / normativa de datos personales vigente: derecho de acceso,
  rectificación y supresión sobre los datos de las personas nombradas en la evidencia.
- Datos de personas identificadas en B: acceso restringido al Counselor del diagnóstico y a
  `admin`. Nunca expuestos a Newen.

---

## Checklist antes de producción

- [ ] RLS en todas las tablas base, probada con dos counselors.
- [ ] `newen_reader` sin `SELECT` sobre tablas base (sólo `ec_publico.*`).
- [ ] `pgcrypto` activo sobre los campos sensibles.
- [ ] Token STT efímero — la key permanente no aparece en el bundle del cliente.
- [ ] Rate limit activo en los 3 endpoints.
- [ ] Normalización + filtro B1 sobre la transcripción antes del motor.
- [ ] Validación de output B4 sobre las sugerencias y textos generados.
- [ ] Retención de `respuesta_cruda` configurada y documentada.
- [ ] Consentimiento de audio: texto aprobado por Ari, versión registrada.
- [ ] Protocolo de crisis: `alerta_seguridad` probado con un caso de disclosure.
- [ ] Scanner de secretos (GitGuardian / TruffleHog) sin hallazgos.
- [ ] POST-DEPLOY CHECK (Protocolo Maestro Bloque 8) verde.
