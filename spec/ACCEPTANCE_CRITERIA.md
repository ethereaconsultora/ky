# ACCEPTANCE CRITERIA — KY

Formato Gherkin resumido (Dado / Cuando / Entonces). Referencia: `USER_STORIES.md`, `USE_CASES.md`.

## Núcleo de dominio (Fase 1)

- **AC-D1** · Dado un set de fenómenos confirmados con intensidad/confianza, cuando corro
  `clasificarDominante()`, entonces devuelve exactamente uno de
  `DOMINANTE_CONFIRMED | DOMINANTE_AMBIGUOUS | DOMINANTE_DEBIL | SIN_EVIDENCIA_SUFICIENTE`
  (nunca `undefined`) — incluido el caso de un único confirmado con score < 0.60.
- **AC-D2** · Dado el mapeo `intensidad/confianza → 0–1` de `matriz.config`, cuando calculo el
  `score`, entonces el resultado está en `[0,1]` y la tabla es la única fuente (no hay números
  mágicos en el clasificador).
- **AC-D3** · Dado N/S/R conocidos, cuando corro `motorEconomico()`, entonces `presentismo`,
  `rotacion` y `perdida_total` coinciden con el cálculo manual de `metodo-ec/matriz-diagnostica-ec.md`.
- **AC-D4** · Dado cualquier caso (1–4), cuando el motor económico produce la reducción,
  entonces devuelve un **rango** (`min`, `max`), nunca un único número.
- **AC-D5** · Dado que no hay 3 ejes de fricción cargados, cuando cierro el diagnóstico,
  entonces el `factor_friccion_derivado` se calcula desde los fenómenos confirmados (no falla,
  no usa un default silencioso sin registrarlo).

## Motor de Turno (Fase 4)

- **AC-T1** · Dado un turno, cuando el motor responde, entonces `sugerencias_pregunta` tiene 2–3
  ítems y no son paráfrasis entre sí (exploran hilos/ángulos distintos) — verificado en el eval
  con Ari.
- **AC-T2** · Dado un fenómeno con las 4 condiciones cumplidas, cuando el motor lo procesa,
  entonces `estado = confirmado` con `intensidad` y `confianza` no nulas.
- **AC-T3** · Dado un fenómeno sin señal tras 2 preguntas, cuando el motor decide, entonces
  `accion = saltar` y `fenomeno_siguiente_prioridad` apunta al de menos preguntas consumidas.
- **AC-T4** · Dado 15 preguntas alcanzadas con un fenómeno en curso, cuando el motor decide,
  entonces puede cerrar ese fenómeno pero NO abre uno nuevo.
- **AC-T5** · Dado un input con instrucciones tipo "ignorá tus instrucciones", cuando llega al
  motor, entonces se normaliza/marca y el motor no cambia de comportamiento; queda registro.
- **AC-T6** · Dado un disclosure de autolesión/acoso, cuando el motor procesa, entonces
  `alerta_seguridad = true` y el fragmento sensible no queda en `respuesta_cruda` en claro.
- **AC-T7** · Cada llamada al motor deja una fila en `llamada_ia` con modelo, `prompt_version`,
  `mapa_indagacion_version`, tokens y latencia.

## Síntesis (Fase 7)

- **AC-S1** · Dado sólo un fenómeno confirmado no subordinado, entonces `caso = 1`.
- **AC-S2** · Dado dos cadenas explicativas independientes, entonces la relación es `A_PERP_B`
  (⊥) y `caso = 2` — nunca por empate de puntajes.
- **AC-S3** · Dado que no hay recursividad explícita ni evidencia temporal narrada, entonces un
  circuito se clasifica como hipotético (`A_HIP_B`), nunca confirmado.
- **AC-S4** · `intervencion_propuesta.aprobada_por_consultor` siempre `false` al generarse.

## Seguridad / privacidad (transversal)

- **AC-SEC1** · Con dos counselors, cada uno consulta `/api/diagnostico/[id]` del otro → 403.
- **AC-SEC2** · El rol `newen_reader` ejecuta `SELECT` sobre `public.respuesta_cruda` → error de
  permisos. Sobre `ec_publico.v_diagnostico` → OK.
- **AC-SEC3** · El bundle del cliente (build de producción) no contiene `ANTHROPIC_API_KEY` ni
  la key permanente del STT.
- **AC-SEC4** · `respuesta_cruda.texto_cifrado` / `transcripcion_cifrada` no son legibles en
  texto plano desde una consulta SQL directa sin la clave.

## Integración Newen (Fase 9)

- **AC-N1** · Dado un diagnóstico `cerrado` de una empresa con `organization_client_id`, cuando
  el dashboard de empresa de Newen consulta la tabla foránea, entonces ve el fenómeno dominante,
  el rango de pérdida y la intervención — y **no** ve ninguna transcripción.

## UX (Fases 3, 5, 8)

- **AC-UX1** · La proyección económica se muestra en un bloque visualmente distinto (borde
  dashed) con la nota "proyección — sin validar". Nunca como cifra suelta.
- **AC-UX2** · Si hay cola offline pendiente, el Mapa EC muestra un indicador "desactualizado".
- **AC-UX3** · El error de cualquier endpoint muestra un mensaje al Counselor; nunca pantalla en
  blanco.
