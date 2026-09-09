# DATA PRIVACY — KY

## Filosofía

KY maneja información organizacional sensible y **personas nombradas** dentro de la evidencia de
la entrevista (ej. "Sebastián Ríos, Gerente de Operaciones"). La privacidad es una obligación,
no una feature. Principio de minimización: el motor necesita la transcripción, no el audio; la
evidencia cruda tiene un ciclo de vida propio y se puede borrar sin afectar el diagnóstico
derivado.

## Datos que recolecta

| Dato | Propósito | Dónde | Retención |
|---|---|---|---|
| Email del counselor | Login | `users` / Supabase Auth | Hasta baja |
| Datos económicos (N, S, R) | Motor económico | `datos_economicos` | Vida del diagnóstico |
| Transcripción / texto de respuestas | Materia prima del motor diagnóstico | `respuesta_cruda` (**cifrado pgcrypto**) | **N días — A DEFINIR con legal antes de producción** (más restrictivo que el diagnóstico derivado) |
| Audio original | Opcional (no requerido por el motor) | `respuesta_cruda.audio_ref` | Opcional, gobernado por política de retención; por defecto NO se conserva |
| Personas nombradas en la evidencia | Trazabilidad del diagnóstico | dentro de `respuesta_cruda` cifrada + `fenomeno_detectado.mecanismos` | Igual que la respuesta cruda |
| Consentimiento de audio | Cumplimiento | `consentimiento` + `consentimiento_textos` | Permanente (registro legal) |
| Conclusiones del diagnóstico | Producto | `fenomeno_detectado`, `relacion_fenomeno`, `perdida_economica`, `intervencion_propuesta` | Permanente (dato de negocio, sin PII directa) |
| Auditoría de IA | Calibración + costo | `llamada_ia` | Permanente (sin contenido, sólo metadata) |

## Datos que NO recolecta

- Diagnósticos clínicos de individuos. Historia médica. Grabaciones de video.
- Datos de la evidencia cruda NO se exponen a Newen bajo ninguna circunstancia.

## Regla de retención (del método)

```
respuesta_cruda  ──procesamiento──▶  conclusión (fenomeno_detectado, relacion_fenomeno, ...)
respuesta_cruda  puede eliminarse sin afectar el diagnóstico ya derivado
```

Al vencer la retención, se borra `respuesta_cruda` (texto/transcripción/audio) y el diagnóstico
sobrevive con sus conclusiones y su trazabilidad reducida (queda el `pregunta_texto` y los
metadatos, no la evidencia verbatim).

## Consentimiento de audio

- Texto versionado en `consentimiento_textos` (aprobado por Ari).
- Se muestra al inicio de cada diagnóstico con `modo_captura = audio_transcrito`.
- Se registra `consentimiento` (texto_id, aceptado_por, aceptado_at) y su id se sella en cada
  `respuesta_cruda` de audio — auditable qué se consintió y cuándo.

## Derechos (Argentina Ley 25.326 / normativa vigente)

| Derecho | Cómo se ejerce |
|---|---|
| Acceso | La empresa / persona nombrada solicita a EC; el Counselor del diagnóstico o `admin` exportan lo que corresponde |
| Rectificación | Sobre datos económicos y sobre la evidencia mal atribuida |
| Supresión | Borrado de `respuesta_cruda` de un diagnóstico a solicitud, antes del vencimiento de retención |
| Portabilidad | Exportación del diagnóstico (JSON) |

## Seguridad técnica

- HTTPS + HSTS en tránsito. `pgcrypto` en reposo sobre los campos sensibles.
- RLS por counselor. `service_role` sólo server-side.
- Newen lee sólo `ec_publico.v_*` con un rol sin acceso a tablas base.
- Rate limit + normalización PSAI B1 + validación de output B4.

## Brecha

1. Notificar a Ari inmediatamente. 2. Evaluar alcance (¿qué diagnósticos, qué evidencia?).
3. Notificar a las empresas afectadas en 72 h. 4. Parche + commit `security:`.
5. Post-mortem en `logs/BUGS.md`.

## Pendiente antes de producción

- **Días concretos de retención de `respuesta_cruda`** (decisión legal, no técnica).
- Texto legal del consentimiento de audio.
- Procedimiento documentado de supresión a solicitud.
