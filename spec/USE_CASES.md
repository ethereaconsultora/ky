# USE CASES — KY

## UC-01 — Iniciar un diagnóstico

- **Actor**: Counselor
- **Disparador**: toca "Nuevo diagnóstico" en la tablet.
- **Precondiciones**: sesión iniciada (rol `counselor`).
- **Flujo principal**:
  1. Ingresa nombre, sector, N, S, R de la empresa (o selecciona una empresa existente).
  2. La app muestra la pantalla de consentimiento de audio (texto de `consentimiento_textos`
     vigente).
  3. El entrevistado acepta; la app registra `consentimiento` (texto_id, aceptado_por, ts).
  4. `POST /api/diagnostico` crea `empresa` (si nueva) + `diagnostico` (`en_curso`, versión B) +
     `datos_economicos` + `consentimiento`.
  5. La app pasa a la pantalla Conversación y pide un token STT (`POST /api/stt/token`).
- **Flujos alternativos**:
  - 3a. El entrevistado no consiente audio → `modo_captura = manual`; la app usa captura
    tipeada/chips. El resto del flujo es igual.
- **Postcondiciones**: diagnóstico `en_curso` con datos económicos y consentimiento.

## UC-02 — Turno de análisis durante la entrevista

- **Actor**: Counselor (indirecto: Entrevistado)
- **Disparador**: el Counselor toca "respuesta lista → analizar" (o detección de silencio ~2–3 s).
- **Flujo principal**:
  1. La app envía a `/api/turno` `{ diagnostico_id, respuesta_texto }` (texto acumulado desde el
     último disparo).
  2. El backend normaliza (PSAI B1), valida (Zod), aplica rate limit.
  3. Llama al Motor de Turno (`claude-haiku-4-5`, `output_config.format`) con: estado de los 5
     fenómenos + mecanismos, nº de preguntas, la respuesta nueva, la Mapa de Indagación como
     referencia.
  4. Persiste `respuesta_cruda` (transcripción cifrada), actualiza `fenomeno_detectado`
     (condiciones, mecanismos, intensidad/confianza si confirma), registra `llamada_ia`.
  5. Devuelve `fenomenos_actualizados`, `accion`, `sugerencias_pregunta[]` (2–3, hilos
     distintos), `alerta_seguridad`.
  6. La app actualiza el Mapa EC y muestra las pills de sugerencia.
- **Flujos alternativos**:
  - 5a. `alerta_seguridad = true` → la app muestra un banner discreto al Counselor; el fragmento
    sensible no se guarda en claro (hash + marca).
  - 5b. `accion = cerrar` y `fin_diagnostico = true` → la app sugiere cerrar el diagnóstico.
  - Rate limit alcanzado → la app muestra "esperá unos segundos", no bloquea la charla.
- **Postcondiciones**: estado del diagnóstico actualizado; 8–15 turnos por diagnóstico.

## UC-03 — Cerrar el diagnóstico

- **Actor**: Counselor
- **Disparador**: toca "Cerrar diagnóstico" (o acepta la sugerencia de UC-02 5b).
- **Flujo principal**:
  1. `POST /api/diagnostico/[id]/cerrar` marca `estado = cerrado`, `fecha_cierre = now()`.
  2. Se ejecuta el **Motor Económico** (código puro): deriva `factor_friccion_derivado` de los
     fenómenos confirmados, calcula presentismo / rotación / pérdida total, y — según el caso —
     `reduccion_ajustada_min/max` y `roi_min/max` como **rango**.
  3. Se ejecuta el **Motor de Síntesis** (`claude-opus-5`): clasifica relaciones entre
     fenómenos confirmados, define `caso` (1–4), estima `reversibilidad`, arma
     `intervencion_propuesta` (`aprobada_por_consultor = false`).
  4. Se ejecuta el **mensaje de cierre** (`claude-haiku-4-5`) a partir del `resultado_tipo`.
  5. La app muestra la pantalla Resultado (Mapa EC final + 3 capas económicas).
- **Flujos alternativos**:
  - 3a. Ningún fenómeno confirmado → `resultado_tipo = SIN_EVIDENCIA_SUFICIENTE`, sin síntesis
    relacional ni intervención.
  - 3b. Un solo fenómeno confirmado con score bajo → `DOMINANTE_DEBIL`.
  - 3c. La síntesis deja dos fenómenos en `A?B` → se autoriza **una** pregunta puente en vivo.
- **Postcondiciones**: `perdida_economica`, `relacion_fenomeno`, `reversibilidad`,
  `intervencion_propuesta` persistidos.

## UC-04 — Aprobar y enviar la intervención

- **Actor**: Counselor
- **Flujo principal**:
  1. Revisa la propuesta en la pantalla Intervención; edita `descripcion` / `traduccion_humana`
     si hace falta.
  2. `POST /api/intervencion/[id]/aprobar` → `aprobada_por_consultor = true`, `aprobada_at`.
  3. `POST /api/intervencion/[id]/enviar` → genera el PDF, setea `enviada_at` + `artefacto_url`.
- **Postcondiciones**: el resultado queda visible para Newen vía `ec_publico.v_*` (si la empresa
  tiene `organization_client_id`).

## UC-05 — Pausar y retomar (raro en B, previsto en el modelo)

- **Actor**: Counselor
- **Flujo**: `POST /api/diagnostico/[id]/pausar` → `estado = pausado`, `resume_token`,
  `expires_at = now() + 7 días`. Retomar con el token antes del vencimiento.

## UC-06 — Newen consume el resultado

- **Actor**: usuario del dashboard de empresa de Newen
- **Flujo**: el dashboard consulta las tablas foráneas `ec_publico.v_diagnostico` /
  `v_perdida_economica` / `v_intervencion_propuesta` por `organization_client_id` y muestra el
  contenido en la Fase 1 (Diagnóstico) del ciclo de 6 fases. Nunca ve `respuesta_cruda`.
