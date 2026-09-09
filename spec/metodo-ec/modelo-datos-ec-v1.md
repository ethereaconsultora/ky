# Modelo de Datos Compartido EC — V1

> Define qué guarda EC de cada diagnóstico, independientemente de cómo se vea después (landing o tablet). No es código todavía — es el esquema de entidades y campos. Sirve de base para Versión A (usa un subconjunto) y Versión B (usa todo).

**Principio rector: se guarda la evidencia cruda, no solo la conclusión.** Todo campo que la IA infiere debe poder trazarse hasta la respuesta original que lo sustenta — sin eso, "¿por qué EC llegó a esta conclusión?" no tiene respuesta.

---

## Jerarquía de entidades

```
EMPRESA
  └── DIAGNÓSTICO (puede tener diagnostico_origen_id → otro DIAGNÓSTICO, ver "Migración A → B")
        ├── DATOS_ECONÓMICOS
        ├── RESPUESTA_CRUDA (1..N)
        ├── FENÓMENO_DETECTADO (1..5)
        ├── RELACIÓN_FENÓMENO (0..N)
        ├── PÉRDIDA_ECONÓMICA
        ├── INTERVENCIÓN_PROPUESTA
        └── SEGUIMIENTO (0..N, futuro — no V1)
```

Convención de columnas en cada entidad: **Campo | Tipo | Generado por | Obligatorio | Propósito**
Valores posibles de "Generado por": `empresa` (responde en el formulario/entrevista), `consultor` (el Counselor lo marca/anota), `IA` (lo infiere o extrae), `cálculo` (fórmula determinística del motor económico).

---

## EMPRESA

| Campo | Tipo | Generado por | Obligatorio | Propósito |
|---|---|---|---|---|
| id | UUID | cálculo | sí | Identificador único |
| nombre | texto | empresa | sí | Identificación básica |
| sector | texto | empresa | no | Contexto para interpretar respuestas (ej: "operarios" ≠ "oficina") |
| tamaño (N empleados) | número | empresa | sí | Insumo directo del motor económico |
| fecha_alta | fecha | cálculo | sí | Auditoría |

---

## DIAGNÓSTICO

| Campo | Tipo | Generado por | Obligatorio | Propósito |
|---|---|---|---|---|
| id | UUID | cálculo | sí | Identificador único |
| empresa_id | FK | cálculo | sí | Relación con Empresa |
| versión | enum (`A`, `B`) | cálculo | sí | Determina qué lógica aplica (modo DOMINANTE en A, Casos 1-4 en B) |
| diagnostico_origen_id | FK → DIAGNÓSTICO (nullable, auto-referencia) | cálculo | no | Si este diagnóstico B nace de un diagnóstico A previo, apunta al original — ver "Migración A → B". Lo heredado se trata como hipótesis inicial, no como dato confirmado |
| resultado_tipo | enum (`DOMINANTE_CONFIRMED`, `DOMINANTE_AMBIGUOUS`, `SIN_EVIDENCIA_SUFICIENTE`) | cálculo | solo si versión=A | Resultado del modo DOMINANTE, a nivel de todo el diagnóstico — no confundir con el `estado` de cada fenómeno individual |
| counselor_id | FK | consultor | solo si versión=B | Quién condujo la entrevista |
| modo_captura | enum (`manual`, `audio_transcrito`) | consultor | solo si versión=B | El consentimiento específico se registra por respuesta, ver RESPUESTA_CRUDA |
| fecha_inicio / fecha_cierre | fecha | cálculo | sí | Duración real del diagnóstico |
| estado | enum (`en curso`, `cerrado`, `pausado`) | cálculo | sí | Necesario por el botón "continuar después" ya definido en Versión A |
| paused_at | fecha/hora | cálculo | solo si estado=pausado | Cuándo se pausó |
| expires_at | fecha/hora (paused_at + 7 días en A) | cálculo | solo si estado=pausado | Vencido esto, el diagnóstico queda cerrado/no retomable |
| resume_token | token seguro | cálculo | solo si estado=pausado | Permite retomar sin reautenticación completa |

---

## DATOS_ECONÓMICOS

| Campo | Tipo | Generado por | Obligatorio | Propósito |
|---|---|---|---|---|
| N (empleados) | número | empresa | sí | Insumo motor económico |
| S (salario promedio mensual) | número | empresa | sí | Insumo motor económico |
| R (tasa de rotación anual) | número | empresa | sí | Insumo motor económico |
| respuestas de los 3 ejes (promedio) | número | empresa | sí | Determina el factor de fricción |

---

## RESPUESTA_CRUDA

Esta es la entidad de trazabilidad. Sin ella, ninguna conclusión de la IA es auditable.

| Campo | Tipo | Generado por | Obligatorio | Propósito |
|---|---|---|---|---|
| id | UUID | cálculo | sí | Identificador único |
| diagnóstico_id | FK | cálculo | sí | Relación |
| fenómeno_asociado_id | FK | IA | no (se asigna al procesar) | A qué fenómeno aporta evidencia esta respuesta |
| tipo_pregunta | enum (`detección`, `evidencia`, `consecuencia`, `confirmación`, `puente`) | cálculo | sí | Ubica la respuesta en el árbol |
| pregunta_texto | texto | IA (generada) o consultor (formulada) | sí | Qué se preguntó exactamente (puede variar por adaptación) |
| modalidad | enum (`texto`, `audio`) | cálculo | sí | Cómo se capturó esta respuesta |
| texto | texto | empresa/entrevistado (si modalidad=texto) | solo si modalidad=texto | La evidencia cruda, verbatim |
| audio_ref | referencia a archivo | cálculo | opcional, solo si modalidad=audio | El audio original — **conservarlo es opcional**, no un requisito del motor diagnóstico |
| transcripción | texto | IA (generada del audio) | solo si modalidad=audio | **Esta es la materia prima real del motor diagnóstico** — el motor trabaja sobre texto, use o no audio |
| consentimiento_audio | booleano + timestamp + versión del texto de consentimiento | empresa/entrevistado | solo si modalidad=audio | Registrado por respuesta, no solo una vez por diagnóstico — permite auditar exactamente qué se consintió y cuándo |
| timestamp | fecha/hora | cálculo | sí | Orden cronológico, relevante para circuitos (evidencia temporal) |

**Principio de minimización de datos**: el motor diagnóstico necesita la transcripción, no necesariamente el audio. La arquitectura queda preparada para conservar `audio_ref`, pero como campo opcional gobernado por una política de retención configurable — no como parte obligatoria del diagnóstico.

**Regla de retención**: la respuesta cruda tiene un ciclo de vida independiente de la información diagnóstica que produce.

```
RESPUESTA_CRUDA
      ↓ procesamiento
EVIDENCIA / HIPÓTESIS / DIAGNÓSTICO (queda en FENÓMENO_DETECTADO, RELACIÓN_FENÓMENO, etc.)
      ↓
RESPUESTA_CRUDA puede eliminarse sin afectar el diagnóstico ya derivado
```

Esto evita que EC necesite conservar cada conversación indefinidamente solo para sostener el diagnóstico que ya se generó a partir de ella. La duración exacta de retención queda diferenciada por versión — menor en A (propósito comercial/estimativo), más restrictiva en B (dato profesional sensible, con consentimiento específico) — pero el número de días concreto es una decisión de política de privacidad/legal previa a producción, no una decisión conceptual del método EC.

---

## FENÓMENO_DETECTADO

Una fila por cada uno de los 5 fenómenos que fue evaluado en este diagnóstico (evaluado ≠ confirmado; se guarda también el resultado de los descartados, para trazabilidad).

| Campo | Tipo | Generado por | Obligatorio | Propósito |
|---|---|---|---|---|
| id | UUID | cálculo | sí | Identificador único |
| diagnóstico_id | FK | cálculo | sí | Relación |
| fenómeno_tipo | enum (los 5 de la matriz) | IA | sí | Cuál de los 5 es |
| condición_evidencia | booleano | IA | sí | ¿Se cumplió? — determina SI el fenómeno se confirma |
| condición_recurrencia | booleano | IA | sí | ¿Se cumplió? |
| condición_consecuencia | booleano | IA | sí | ¿Se cumplió? |
| condición_hipótesis_plausible | booleano | IA | sí | ¿Se cumplió? |
| estado | enum (`confirmado`, `en observación`, `descartado`) | IA | sí | Resultado del criterio único de cierre |
| **intensidad** | escala 1-5 (o `leve`/`moderado`/`severo`/`crítico`) | IA | solo si confirmado | **Gravedad del fenómeno** — no es lo mismo un conflicto ocasional que uno que domina el clima diario. Las 4 condiciones dicen si existe; esto dice cuánto pesa |
| **confianza** | escala (`baja`/`media`/`alta`) | IA | solo si confirmado | **Solidez de la evidencia** que sostiene el fenómeno (cantidad y consistencia de respuestas que lo corroboran), independiente de la gravedad. Un fenómeno puede ser severo con confianza baja (un solo relato, sin corroborar) o leve con confianza alta |
| mecanismo_organizacional | texto | IA | solo si confirmado | De la matriz diagnóstica |
| consecuencia_operativa | texto | IA | solo si confirmado | De la matriz diagnóstica |
| indicador_económico_afectado | enum (presentismo/rotación/horas improductivas/fricción) | IA | solo si confirmado | Puente al motor económico |
| respuestas_crudas_asociadas | FK (1..N) | cálculo | sí | Trazabilidad — de dónde salió esto |

**Por qué son dos ejes y no uno**: las 4 condiciones booleanas resuelven la pregunta binaria "¿existe o no?" (eso es lo que decide cuándo cerrar la rama del árbol). Intensidad y confianza resuelven dos preguntas distintas entre sí — "¿cuán grave es?" y "¿cuán seguro estoy de esta lectura?" — que un diagnóstico serio no puede colapsar en un solo número. Fiebre de 38.5° y fiebre de 42° pueden cumplir exactamente las mismas 4 condiciones de "hay fiebre confirmada", pero exigen intervenciones distintas.

**Regla de visibilidad (no de cálculo)**: intensidad y confianza **se calculan siempre**, en A y en B por igual — nunca se pierde esa graduación. Lo que cambia por versión es si se muestran al usuario. En A se calculan pero no se exponen. En B sí se muestran, porque ahí el usuario es el Counselor y esa graduación es insumo de trabajo. Esto es lo que hace posible la migración A → B sin perder información.

---

## RELACIÓN_FENÓMENO

Solo existe en Versión B. Se genera en la etapa de síntesis, comparando cadenas explicativas de fenómenos ya confirmados — nunca se le pregunta directamente al entrevistado (salvo la excepción de pregunta puente).

| Campo | Tipo | Generado por | Obligatorio | Propósito |
|---|---|---|---|---|
| id | UUID | cálculo | sí | Identificador único |
| diagnóstico_id | FK | cálculo | sí | Relación |
| fenómeno_a_id / fenómeno_b_id | FK | cálculo | sí | Qué par de fenómenos se relaciona |
| tipo_relación | enum (`A→B`, `B→A`, `A↔B` hipótesis, `A⇄B` confirmado, `A⊥B` co-dominante, `A?B` abierto) | IA | sí | Resultado de la matriz de relación |
| evidencia_soporte | texto (razonamiento) | IA | sí | Por qué se clasificó así — auditable |
| requirió_pregunta_puente | booleano | cálculo | sí | Si se usó la excepción de una pregunta adicional |
| punto_accesibilidad_sugerido | texto | IA | solo si circuito | Dónde intervenir según los 4 criterios de accesibilidad |

---

## REVERSIBILIDAD

Entidad propia, no un campo suelto — porque la usan tanto Pérdida Económica (para ajustar la reducción estimada) como Intervención Propuesta (para fijar expectativas), y ambas deben leer el mismo dato, no dos versiones redactadas por separado.

| Campo | Tipo | Generado por | Obligatorio | Propósito |
|---|---|---|---|---|
| id | UUID | cálculo | sí | Identificador único |
| diagnóstico_id | FK | cálculo | sí | Relación |
| aplica_a | FK (fenómeno_id, relación_id, o `circuito`) | IA | sí | A qué corresponde esta estimación — un fenómeno individual, un par co-dominante, o el punto de accesibilidad de un circuito |
| grado_temprano | número (0–1) | IA | sí | Reversibilidad a 6 meses — reemplaza el rango difuso por una ancla temporal concreta |
| grado_tardio | número (0–1) | IA | sí | Reversibilidad a 24 meses — el motor económico interpola entre esta y la anterior según el horizonte pedido |
| peso_atribucion | número (0–1) | cálculo | solo si aplica_a=co-dominante | Fracción de la pérdida total atribuida a este fenómeno frente al otro co-dominante — proporcional al score (intensidad×confianza), no una medición real |
| alcance | número (0–1) | IA | solo si aplica_a=circuito | Fracción de la pérdida total que se vería afectada si el circuito se rompe en este punto — estimación conservadora |
| factor_confianza_circuito | número (0.5 hipotético / 1.0 confirmado) | cálculo | solo si aplica_a=circuito | Descuento por incertidumbre mientras el circuito no esté confirmado |
| plazo_esperado | enum (`inmediato` <3m, `corto` 3-6m, `medio` 6-12m, `largo` 12-24m) | IA | sí | En qué horizonte es razonable esperar el efecto |
| justificación | texto | IA | sí | Por qué esos valores — trazabilidad de la estimación |

`PÉRDIDA_ECONÓMICA.reducción_estimada_ajustada` y `INTERVENCIÓN_PROPUESTA.reversibilidad_esperada` pasan a ser referencias (FK) a esta entidad, no texto propio en cada una. El cálculo real (interpolación, atribución por peso, o fórmula de circuito) vive en el motor económico ajustado — ver "Motor Económico Ajustado" en `matriz-diagnostica-ec.md`, no acá; esta tabla solo guarda los insumos.

---

## PÉRDIDA_ECONÓMICA

| Campo | Tipo | Generado por | Obligatorio | Propósito |
|---|---|---|---|---|
| presentismo | número | cálculo | sí | Fórmula del motor económico |
| rotación | número | cálculo | sí | Fórmula del motor económico |
| pérdida_total | número | cálculo | sí | Suma |
| reducción_estimada_base | número (40% flat) | cálculo | sí | Valor por defecto, sin ajuste |
| reversibilidad_id | FK → REVERSIBILIDAD | cálculo | solo si versión=B | Reemplaza al campo de texto suelto — apunta a la estimación compartida |
| reducción_estimada_ajustada | número (derivado del grado de REVERSIBILIDAD) | cálculo | solo si versión=B | Resultado de aplicar el modificador a la base |
| ROI | número | cálculo | sí | Fórmula del motor económico |

---

## INTERVENCIÓN_PROPUESTA

| Campo | Tipo | Generado por | Obligatorio | Propósito |
|---|---|---|---|---|
| caso | enum (1 dominante, 2 co-dominante, 3 circuito hipotético, 4 circuito confirmado) | IA | sí | Determina la estrategia (ver matriz diagnóstica) |
| fenómenos_objetivo | FK (1..N) | IA | sí | Sobre qué fenómeno(s) o punto de accesibilidad actúa |
| descripción | texto | IA (borrador) + consultor (ajusta) | sí | Qué se va a hacer |
| traducción_humana | texto | IA | sí | Qué se transforma en la experiencia de las personas |
| reversibilidad_id | FK → REVERSIBILIDAD | cálculo | sí | Misma estimación que usa Pérdida Económica — no se redacta dos veces |
| horizonte_temporal | enum (6/12/24 meses) | IA | sí | Proyección |
| aprobada_por_consultor | booleano | consultor | solo si versión=B | El Counselor tiene la última palabra, no la IA |

---

## SEGUIMIENTO (roadmap — no se construye en V1)

Queda solo definida la necesidad, no el esquema completo. Conceptualmente, el diagnóstico EC no termina en el diagnóstico — la cadena completa es:

```
diagnosticar → intervenir → medir → comparar → recalibrar
```

Esto es lo que eventualmente permite validar si la "reversibilidad esperada" que se asignó fue correcta o no — cerrando el ciclo con datos reales en vez de estimaciones. Se construye cuando exista la función de seguimiento; por ahora solo se reserva su lugar en la jerarquía de entidades.

---

## Migración A → B

La landing (Versión A) no es una herramienta separada del sistema diagnóstico EC — es su puerta de entrada. Un diagnóstico que arrancó como A puede convertirse en B sin recalcular desde cero — pero **B no da por cierto lo que A concluyó**:

```
A → hipótesis inicial → B → verificación / corrección / profundización → diagnóstico EC definitivo
```

Lo que A ya calculó (datos económicos, intensidad, confianza, y qué fenómenos dieron señal) se hereda en el nuevo diagnóstico B a través de `diagnostico_origen_id`. B no vuelve a preguntar desde cero, pero el Counselor y el motor de B tratan lo heredado como punto de partida a confirmar. Si la confianza que dejó A en algún fenómeno era baja, B puede (y probablemente deba) volver a indagar ahí en vez de asumirlo resuelto.

**Principio**: A descubre, no concluye. B interpreta sin perder lo que A ya aprendió, pero sin heredar sus errores como si fueran hechos.

---

## Qué usa cada versión

| Entidad | Versión A | Versión B |
|---|---|---|
| EMPRESA | ✅ | ✅ |
| DIAGNÓSTICO | ✅ (versión=A, sin origen) | ✅ (versión=B, puede tener diagnostico_origen_id) |
| DATOS_ECONÓMICOS | ✅ | ✅ |
| RESPUESTA_CRUDA | ✅ (siempre modalidad=texto) | ✅ completa (texto o audio) |
| FENÓMENO_DETECTADO | ✅ (calcula intensidad/confianza, no las muestra) | ✅ completa (las muestra) |
| RELACIÓN_FENÓMENO | ❌ no se genera | ✅ |
| REVERSIBILIDAD | ❌ no se genera (A usa siempre la reducción base flat) | ✅ |
| PÉRDIDA_ECONÓMICA | ✅ (solo `reducción_estimada_base`) | ✅ completa (con ajuste vía REVERSIBILIDAD) |
| INTERVENCIÓN_PROPUESTA | ✅ (siempre caso=1, sin reversibilidad_id) | ✅ (casos 1-4) |

---

## Pendiente a definir juntos

- Duración exacta de retención de `RESPUESTA_CRUDA` en A y en B — queda como decisión de política de privacidad/legal previa a producción, no conceptual.
- Esquema completo de `SEGUIMIENTO` cuando llegue el momento de construirlo (solo está reservado el lugar en la jerarquía).
- Texto/flujo exacto de la pantalla de consentimiento de audio en B (qué se le muestra al entrevistado, versión del consentimiento que se registra en `respuesta_cruda.consentimiento_audio`).
