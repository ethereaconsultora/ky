# Matriz Diagnóstica — Espacio Crítico (V1, 5 fenómenos)

> Documento base ("cerebro") compartido por ambas versiones de la herramienta (auto-conversacional y copiloto del Counselor). Define qué detecta el sistema, con qué preguntas, cómo decide cuándo parar, y cómo cada hallazgo se traduce en pérdida económica e intervención.

---

## Decisiones cerradas en esta versión

- **5 fenómenos, no 6.** No son casilleros mutuamente excluyentes: una misma situación real puede activar varios en cadena (ej: conflicto → sobrecarga del mando medio → desgaste → ausentismo → pérdida económica). El objetivo no es diagnosticar "temas" sino reconstruir el **mecanismo de pérdida**.
- **Máximo 4 preguntas por fenómeno**, pero 4 es el techo, no el recorrido normal. El sistema puede cerrar en 1, 2 o 3 si ya hay evidencia suficiente.
- **Diagnóstico completo: 8–15 preguntas efectivas** (nunca los 20 del máximo teórico), porque saltar fenómenos sin evidencia es tan válido como profundizar en los que sí la tienen.
- El **Motor Económico** (fórmulas de presentismo/rotación/ROI que ya existen en el HTML) se mantiene separado de la matriz diagnóstica. La matriz no calcula números directamente — produce mecanismos de pérdida, que después alimentan al motor económico. Esto permite hacer evolucionar el diagnóstico sin tocar el cálculo, y viceversa.

---

## Estructura de 4 preguntas por fenómeno

| # | Tipo | Pregunta genérica | Qué busca | Regla |
|---|---|---|---|---|
| 1 | **Detección** | "¿Está ocurriendo algo de este tipo?" (formulada de manera indirecta, ver preguntas disparadoras abajo) | Señal inicial | Si NO hay evidencia → saltar al siguiente fenómeno |
| 2 | **Evidencia** | "¿Cómo se manifiesta concretamente? ¿Desde cuándo, dónde, a quién, con qué frecuencia?" | Hechos, no opiniones | Si la evidencia es clara y recurrente → puede cerrarse acá |
| 3 | **Consecuencia** | "¿Qué empieza a pasar en la operación cuando esto ocurre?" | El puente entre experiencia humana y organización (conflicto→demora, sobrecarga→errores, mala conducción→rotación, transición→pérdida de conocimiento, estructura confusa→duplicación) | Casi siempre se llega hasta acá |
| 4 | **Confirmación / profundidad** | "¿Qué cree que está sosteniendo esta situación?" o pregunta específica generada por las respuestas previas | Solo si la hipótesis es relevante pero insuficientemente sustentada | Cierra el fenómeno |

### Criterio único de cierre (4 condiciones, no una escala numérica)

Cada una de las 4 preguntas verifica una condición específica. Un fenómeno se **confirma** cuando las cuatro están satisfechas — no importa si eso pasa en la pregunta 2 o en la 4:

| Pregunta | Condición que verifica |
|---|---|
| 1. Detección | ¿Hay **evidencia** de que esto ocurre? |
| 2. Evidencia | ¿Se presenta con **recurrencia** (no es un hecho aislado)? |
| 3. Consecuencia | ¿Produce una **consecuencia operativa relevante**? |
| 4. Confirmación | ¿Existe una **hipótesis plausible** que conecte el fenómeno con esa consecuencia? |

**Fenómeno confirmado** = las 4 condiciones satisfechas (cierre temprano si se logra antes de la pregunta 4). Cada condición se registra como una bandera (sí/no/parcial), no como un puntaje — eso es lo que le permite al motor decidir en cualquier punto si cerrar, saltar o profundizar.

### Formato híbrido de las preguntas (exclusivo de Versión A)

Estas 4 condiciones **no exigen texto libre en las 4** — eso es fricción innecesaria en una landing fría. El formato de cada pregunta se elige según qué condición está verificando, no al revés:

| Condición | Formato recomendado | Por qué |
|---|---|---|
| Evidencia | **Cerrada (escala)** — ej. "¿Qué tan clara llega una decisión de dirección?" Muy clara / Bastante clara / A veces / Poco clara / Muy poco clara | Mide sin exigir elaboración. Si la respuesta es alta en claridad, se descarta el fenómeno sin gastar más preguntas — **no hace falta abrir el campo si no hay señal** |
| Recurrencia | Implícita en la frecuencia elegida en la escala anterior — no necesita pregunta propia |
| Consecuencia operativa | **Multi-select de manifestaciones** — ej. "Cuando no llega clara, ¿qué suele pasar?" con checkboxes (se demora la ejecución / cada área interpreta distinto / hay que rehacer trabajo / se consulta de nuevo / aparecen conflictos / otro). **Es el dato más explotable para el motor** — estructurado, no hay que interpretar texto libre |
| Hipótesis plausible | **Abierta, breve** — solo acá vale la pena el lenguaje, y solo si las condiciones anteriores ya dieron señal. Ej. "Contame un ejemplo reciente" o "¿Qué es lo que más impacto tiene hoy?" |

**Esto es exclusivo de Versión A.** En B no aplica formato cerrado/multi-select — es una entrevista hablada, el Counselor no puede pedirle a alguien que marque un checkbox a mitad de una charla empática. B sigue siendo enteramente narrativo; solo A se beneficia del híbrido porque su interfaz es una pantalla, no una conversación humana.

### Criterios de decisión del árbol

- **Salida temprana** — las 4 condiciones quedan satisfechas antes de llegar a la pregunta 4: cerrar sin seguir preguntando.
- **Salto** — la pregunta cerrada de evidencia da una respuesta baja/nula (ej. "Muy clara", "Nunca"): descartar el fenómeno directamente, sin pasar a multi-select ni a abierta — ahí es donde el formato híbrido ahorra más fricción.
- **Profundización** — hay evidencia y recurrencia, pero falta consecuencia o hipótesis plausible: usar el multi-select y luego la abierta breve para completar lo que falta.

No es "Fenómeno 1 → P1,P2,P3,P4 → Fenómeno 2 → P1,P2,P3,P4..." (eso sería otra vez un cuestionario). Es un salto dinámico entre fenómenos según dónde aparece evidencia.

---

## El flujo completo por fenómeno

```
FENÓMENO
   ↓
PREGUNTA DE DETECCIÓN
   ↓
EVIDENCIA
   ↓
PREGUNTA DE PROFUNDIZACIÓN (consecuencia / confirmación)
   ↓
MECANISMO ORGANIZACIONAL
   ↓
CONSECUENCIA OPERATIVA
   ↓
INDICADOR AFECTADO (del motor económico)
   ↓
PÉRDIDA ECONÓMICA
   ↓
TRADUCCIÓN HUMANA DE LA INTERVENCIÓN (qué se acompaña/transforma en las personas)
   ↓
GRADO DE REVERSIBILIDAD ESPERADO (cuánto y en cuánto tiempo se modifica el número)
   ↓
INTERVENCIÓN EC
```

El diagnóstico no busca solo "qué problema tiene la empresa": busca **cómo se transforma una experiencia humana en una pérdida organizacional** — y, en el otro sentido, **cuánto y en qué plazo acompañar esa experiencia humana puede revertir la pérdida.** Ese doble sentido es el núcleo diferencial de EC.

---

## 1. Mandos medios / traducción estratégica-operativa

| Campo | Contenido |
|---|---|
| Pregunta de detección | "¿Cómo llegan las decisiones de dirección hasta quienes tienen que ejecutarlas?" |
| Evidencia esperada | Menciones de reinterpretación, silencios, "se pierde en el camino", quejas sobre instrucciones poco claras |
| Pregunta de consecuencia | "¿Qué ocurre cuando esa decisión no puede ejecutarse como fue planteada?" |
| Pregunta de confirmación | "¿Qué cree que hace que esa traducción falle en ese punto?" |
| Mecanismo organizacional | La decisión se filtra/reinterpreta al bajar de nivel jerárquico |
| Consecuencia operativa | Retrabajo, escalamiento excesivo, demora en ejecución |
| Indicador económico afectado | Rotación (vía frustración de mandos medios) + horas improductivas |
| Traducción humana de la intervención | Coaching de liderazgo intermedio, entrenamiento en comunicación descendente y toma de decisión |
| Reversibilidad esperada | **Alta y rápida** — es un rol puntual, entrenable. Modificador sugerido sobre la reducción base: +10 a +15% (0.45–0.50 en vez de 0.40 flat) |
| Intervención EC | Diagnóstico específico de conducción / desarrollo de mandos medios |

## 2. Clima y vínculos (conflicto)

| Campo | Contenido |
|---|---|
| Pregunta de detección | "¿Cómo describirías el clima entre los equipos que más interactúan entre sí?" |
| Evidencia esperada | Tono defensivo, mención repetida de una persona/área, "no nos entendemos" |
| Pregunta de consecuencia | "¿Qué pasa en el día a día cuando ese roce aparece?" |
| Pregunta de confirmación | "¿Hay algo puntual que pasó y que todavía condiciona esa relación?" |
| Mecanismo organizacional | Fricción sostenida entre personas o áreas que deriva en evitación |
| Consecuencia operativa | Demoras por evitación de contacto, ausentismo puntual, tiempo de gestión del conflicto |
| Indicador económico afectado | Ausentismo (factor de presentismo) + rotación puntual |
| Traducción humana de la intervención | Mediación y reconstrucción de vínculo entre las partes |
| Reversibilidad esperada | **Media** — depende de la antigüedad del conflicto. Modificador neutro a levemente negativo si es un conflicto viejo: 0.30–0.40 |
| Intervención EC | Intervención de clima y vínculos |

## 3. Desgaste / sobrecarga

| Campo | Contenido |
|---|---|
| Pregunta de detección | "¿Cómo llegan las personas a un viernes, comparado con cómo llegaban hace un año?" |
| Evidencia esperada | Menciones de cansancio, licencias, "no dan más", ironía o resignación |
| Pregunta de consecuencia | "¿Qué cambió en la carga de trabajo en ese último año?" |
| Pregunta de confirmación | "¿Qué pasaría si esa carga siguiera igual seis meses más?" |
| Mecanismo organizacional | Demanda sostenida que superó la capacidad de recuperación del equipo |
| Consecuencia operativa | Errores, presentismo, licencias por salud, caída de velocidad |
| Indicador económico afectado | Presentismo (directo) |
| Traducción humana de la intervención | Rediseño de carga + espacios de recuperación real (no solo discurso de "bienestar") |
| Reversibilidad esperada | **Media-baja al inicio, sube con el tiempo** — es fisiológico, no solo organizativo. Modificador: 0.25–0.30 en los primeros 6 meses, subiendo a 0.40 hacia los 12–24 meses |
| Intervención EC | Programa de recuperación de capacidad |

## 4. Transición / duelo organizacional

| Campo | Contenido |
|---|---|
| Pregunta de detección | "¿Qué cambió en la organización en los últimos dos años que la gente todavía menciona?" |
| Evidencia esperada | "Antes era distinto", resistencia a lo nuevo sin razón operativa clara |
| Pregunta de consecuencia | "¿Cómo se vivió ese cambio en el momento en que ocurrió?" |
| Pregunta de confirmación | "¿Qué se perdió (en el sentido que sea) con ese cambio, que todavía no se nombró?" |
| Mecanismo organizacional | Un cambio real (fusión, salida de un líder, reestructuración) no fue procesado colectivamente |
| Consecuencia operativa | Lentitud en adopción de nuevas formas de trabajo, pérdida de conocimiento de quienes se fueron sin cierre |
| Indicador económico afectado | Rotación (de quienes no "cerraron" el proceso) + velocidad de ejecución |
| Traducción humana de la intervención | Procesar colectivamente la pérdida — nombrar y cerrar el ciclo (duelo organizacional) |
| Reversibilidad esperada | **Alta una vez identificado** — suele ser una intervención breve pero de efecto profundo. Modificador: 0.45–0.55, con efecto visible ya en los primeros 3 meses |
| Intervención EC | Intervención de duelo organizacional |

## 5. Estructura organizacional

| Campo | Contenido |
|---|---|
| Pregunta de detección | "¿Quién decide qué, cuando dos áreas necesitan lo mismo al mismo tiempo?" |
| Evidencia esperada | "Depende", "no está claro", respuestas distintas según a quién se le pregunte |
| Pregunta de consecuencia | "¿Qué pasa cuando nadie tiene claro quién decide?" |
| Pregunta de confirmación | "¿Hace cuánto que la estructura no se revisa formalmente?" |
| Mecanismo organizacional | Ambigüedad de roles y funciones por diseño, no por comportamiento de las personas |
| Consecuencia operativa | Doble trabajo, decisiones lentas, responsabilidad diluida |
| Indicador económico afectado | Horas improductivas + factor de fricción general |
| Traducción humana de la intervención | Acá EC no acompaña principalmente a las personas — rediseña el sistema en el que operan. El foco humano es ayudar a soltar roles/costumbres viejas durante la transición al nuevo diseño |
| Reversibilidad esperada | **Baja al inicio, alta y duradera después** — el rediseño formal es lento de implementar pero, una vez asentado, no depende de sostener a nadie. Modificador: 0.20–0.25 en los primeros meses, subiendo por encima de 0.40 pasado el año |
| Intervención EC | Consultoría organizacional (rediseño estructural) |

---

## Modelo de lenguaje EC — codificación / decodificación

EC funciona traduciendo entre dos idiomas en ambas direcciones. Esto debería ser explícito en el sistema, no quedar implícito:

**1. Decodificación (entrevista → EC)**
Lenguaje humano, informal, narrativo → indicador EC. Es lo que hace la matriz de arriba: de "la gente llega reventada los viernes" a *desgaste / presentismo*.

**2. Codificación (EC → negocio)**
Indicador EC → variable económica del Motor Económico (N, S, R, factor). Ejemplo: *desgaste confirmado* → sube el factor de fricción usado en el cálculo de rotación, y/o justifica un ajuste sobre la reducción estimada del 40% flat (ver "reversibilidad esperada" en cada fenómeno).

**3. Recodificación (negocio → intervención humana)**
Meta económica/estratégica ("necesitamos bajar la rotación 15% en 12 meses") → qué se transforma concretamente en la experiencia de las personas para lograrlo, y en qué plazo es razonable esperar el efecto. Esto es la columna "Traducción humana de la intervención" + "Reversibilidad esperada" de cada fenómeno.

Esta tercera capa es la que hoy el HTML no tiene (usa una efectividad de intervención flat del 90% y una reducción flat del 40% para todos los casos por igual). La propuesta es que el Mapa EC, además de decir "necesita esto", diga **con qué grado de confianza y en qué plazo**, según qué mecanismo de pérdida domine.

---

## Relaciones entre fenómenos: dominancia, co-dominancia y circuitos

No todos los diagnósticos tienen un único fenómeno dominante. Forzar esa simplificación empobrece el diagnóstico EC. **Esto es una operación de síntesis, no una pregunta más de la entrevista**: el motor compara las cadenas explicativas ya obtenidas (fenómeno → consecuencia → impacto) de cada fenómeno confirmado, y de esa comparación *emerge* la relación — no se le pregunta al entrevistado por ella.

Ejemplo del razonamiento de síntesis:
- Si `A → consecuencia A1 → impacto A2` y `B → consecuencia B1 → impacto B2` son cadenas independientes (ninguna necesita a la otra para explicarse) → **co-dominancia**.
- Si la cadena de A ya explica la aparición de B (`A → B → consecuencia`) → B es **consecuente/asociado** de A, no co-dominante.

### Matriz de relación

| Relación | Evidencia | Interpretación | Acción |
|---|---|---|---|
| A → B | A explica B | B consecuente | Intervenir sobre A |
| B → A | B explica A | A consecuente | Intervenir sobre B |
| A ↔ B | Ambos parecen retroalimentarse, recursividad no confirmada | **Hipótesis de circuito** | No intervenir aún sobre el circuito; ver Caso 3 abajo |
| A ⇄ B (confirmado) | Recursividad evidenciada explícitamente | **Circuito confirmado** | Intervenir en el punto de mayor accesibilidad |
| A ⊥ B | Cadenas independientes, ninguna reduce a la otra | **Co-dominantes** | Intervenir en ambos (frentes complementarios) |
| A ? B | Relación insuficientemente evidenciada | Hipótesis abierta | No concluir |

`A ⊥ B` no significa que no estén relacionados organizacionalmente — significa que ninguno es explicativamente reducible al otro con la evidencia disponible.

### Los dos estados del circuito

- **Hipótesis de circuito (A ↔ B)**: hay evidencia de que A puede contribuir a B y B a A, pero la recursividad temporal no está demostrada. Se informa como hipótesis en el Mapa EC; no dispara todavía una intervención basada en el circuito.
- **Circuito confirmado (A ⇄ B)**: solo cuando (a) el relato describe explícitamente la secuencia de ida y vuelta (*A produce B → B modifica las condiciones de A → A se intensifica*), o (b) la evidencia recogida permite reconstruir más de un momento del proceso y se observa que el efecto vuelve sobre el fenómeno inicial.

**Excepción — pregunta puente en vivo**: si tras la síntesis dos fenómenos quedan en `A ? B` sin que la evidencia ya recolectada alcance para resolver, se autoriza **una sola pregunta adicional** conectando ambos explícitamente. No se gasta más presupuesto de preguntas que eso.

### Definiendo "accesibilidad" (para no dejarlo como un principio poético)

El punto de intervención en un circuito se elige por el que maximice, simultáneamente:
1. **Viabilidad** dentro del alcance de EC (no requiere reestructurar cosas fuera de su mandato)
2. **Costo relativo bajo** frente a intervenir en el nodo "más grande"
3. **Baja resistencia esperada** de la organización a ese cambio puntual
4. **Tiempo de implementación corto**, para poder observar efecto pronto

No siempre se interviene sobre la causa más profunda — se interviene donde una modificación es simultáneamente viable y capaz de alterar el circuito.

### Mapeo diagnóstico → estrategia de intervención

| Caso | Situación | Estrategia |
|---|---|---|
| 1 — Dominante | A confirmado, sin co-dominancia ni circuito | Intervención focal sobre A (ver tabla de mapeo más abajo) |
| 2 — Co-dominantes | A ⊥ B | Intervención **bifocal**: A + B diseñadas como frentes complementarios, no como dos proyectos sin relación entre sí |
| 3 — Circuito hipotético | A ↔ B | No se interviene "sobre el circuito" todavía. Se identifica el punto probable de accesibilidad y se diseña la intervención para que funcione también como **prueba diagnóstica longitudinal** — si el efecto esperado no aparece, es evidencia de que el circuito no era tal |
| 4 — Circuito confirmado | A ⇄ B | No necesariamente se interviene sobre ambos nodos: se interviene en el punto de mayor accesibilidad (ver definición arriba), que puede ser un tercer punto más chico y no A ni B directamente |

**Nota de alcance**: el Caso 3 implica que la intervención debe poder re-evaluarse pasado un tiempo (¿el efecto esperado apareció?) — esto requiere, más adelante, un mecanismo de seguimiento post-intervención que hoy no existe en el diseño. Queda anotado como pendiente de roadmap, no bloquea V1.

**Nota de implementación**: nada de esta sección requiere un algoritmo de grafos programado a mano. Es exactamente el tipo de razonamiento que se le da como instrucción a un modelo en el momento de la síntesis (después de la entrevista, con toda la evidencia recolectada). Este documento es, en la práctica, borrador directo del *system prompt* de esa llamada de síntesis.

---

## Motor Económico (referencia — no se modifica, se conecta)

```
N = cantidad de empleados
S = salario promedio mensual
R = tasa de rotación anual

factor de fricción:
  prom < 2  → 0.5
  prom < 3  → 0.75
  prom < 4  → 1.0
  prom ≥ 4  → 1.2

presentismo   = N × S × 12 × 0.048
rotación      = (N × R) × (S × 3) × factor
pérdida total = presentismo + rotación

reducción estimada = pérdida total × 0.40   ← candidato a modularse por fenómeno dominante (ver reversibilidad esperada arriba)
costo intervención  = N × S × 0.06
ROI = ((reducción − costo) / costo) × 100
```

Proyección a 6/12/24 meses usa una efectividad de intervención estimada del 90% (también candidata a diferenciarse por fenómeno/plazo, según reversibilidad esperada).

### Separación metodológica obligatoria: lo que sabemos / lo que estimamos / lo que proyectamos

Ninguna de estas tres capas puede presentarse como si fuera la misma cosa — mezclarlas es lo que vuelve a EC no defendible frente a una empresa:

| Capa | Contenido | Naturaleza | Se muestra como... |
|---|---|---|---|
| **Lo que sabemos** | Fenómeno(s) confirmado(s), datos económicos ingresados por la empresa (N, S, R) | Hecho — dato de entrada o evidencia verificada | Afirmación directa |
| **Lo que estimamos** | `presentismo`, `rotación`, `pérdida total` | Cálculo determinístico a partir de los datos ingresados — es aritmética, no diagnóstico | Cifra, sin cobertura de duda |
| **Lo que proyectamos** | `reducción estimada` (el 40% flat), `ROI`, la proyección a 6/12/24 meses | Hipótesis no validada empíricamente todavía — depende del fenómeno, del caso, y de una intervención real que no ocurrió | Rango o hipótesis, explícitamente marcada como pendiente de validación profesional — **nunca como conclusión del diagnóstico** |

**Consecuencia directa para Versión A**: la pérdida total puede mostrarse con confianza (es aritmética sobre datos que la empresa mismo dio). La "reducción estimada" y el ROI **no deberían presentarse como una conclusión categórica** en la pantalla de resultado de A — son una proyección, no un hallazgo. Su lugar es como gancho hacia la evaluación profesional (B), no como cifra de cierre del autodiagnóstico.

---

## Motor Económico Ajustado (solo Versión B — usa REVERSIBILIDAD real, no el 0.40 flat)

Resuelve lo que quedaba pendiente: cómo combinar reversibilidad diferenciada por fenómeno con los 4 casos del diagnóstico. Todo lo que sigue es capa **"lo que proyectamos"** — se muestra siempre como rango, nunca como número único categórico.

### Caso 1 — Dominante

Cada fenómeno de la matriz ya tiene su reversibilidad descripta con dos anclas temporales (ej. desgaste: "0.25–0.30 los primeros 6 meses, sube a 0.40 hacia los 12–24 meses"). Formalizamos eso como dos puntos, no un rango difuso:

```
grado_temprano  (a 6 meses)
grado_tardio    (a 24 meses)
grado(t) = interpolación lineal entre ambos puntos, según el horizonte pedido (6/12/24)

reducción_proyectada(t) = pérdida_total × grado(t)
```

Esto reemplaza el 0.40 flat por una curva propia de cada fenómeno — algunos parten altos y se mantienen (mandos medios), otros parten bajos y suben con el tiempo (desgaste, estructura).

### Caso 2 — Co-dominante (A ⊥ B)

La pérdida total hoy es un número agregado, no dividido por fenómeno. Para aplicarle reversibilidades distintas a A y B, hace falta atribuir una fracción de esa pérdida a cada uno — y esa atribución es una **estimación, no una medición real** (hay que decirlo así en cualquier UI que la muestre):

```
peso_i = score_i / (score_A + score_B)     donde score = intensidad_normalizada × confianza_normalizada
                                             (el mismo score que ya usa el modo DOMINANTE de A)

reducción_proyectada(t) = Σ [ peso_i × pérdida_total × grado_i(t) ]   para cada fenómeno i
```

### Caso 3 y 4 — Circuito (hipotético o confirmado)

Acá no hay un fenómeno con reversibilidad propia — hay un **punto de accesibilidad**, que por definición es más chico que los dos fenómenos grandes. Su reversibilidad no sale de la matriz por fenómeno; se estima con dos componentes separados:

```
alcance            = fracción de la pérdida total que se vería afectada si el
                      circuito se rompe en ese punto (estimación conservadora,
                      normalmente menor que la suma de A+B)

grado_reversion     = qué tan reversible es esa fracción una vez intervenida
                      (tiende a ser alto — el punto se eligió justamente por ser
                      accesible)

factor_confianza_circuito:
  0.5  si es Caso 3 (hipótesis de circuito — todavía no confirmado, se aplica
       un descuento por la incertidumbre de que el circuito ni siquiera exista)
  1.0  si es Caso 4 (circuito confirmado — sin descuento adicional)

reducción_proyectada(t) = pérdida_total × alcance × grado_reversion(t) × factor_confianza_circuito
```

El factor 0.5 para el Caso 3 es un punto de partida razonado, no un valor validado — igual que los umbrales del modo DOMINANTE, se calibra con casos reales.

### Regla general de presentación

En los 4 casos, lo que se muestra nunca es un número puntual — es un rango (mínimo con `grado_temprano`, máximo con `grado_tardio`) con una nota explícita de que es una proyección, no un hallazgo. **Esto también corrige algo que quedó inconsistente en el boceto de B**: la pantalla de Intervención mostraba "+18% / +34% / +45%" como cifras categóricas por horizonte — deberían mostrarse como rangos con la misma nota de "sin validar" que ya aplicamos en A.

---

## Mapeo a Resultado / Intervención (motor de intervención)

| Fenómeno dominante | Resultado | Intervención EC |
|---|---|---|
| Mandos medios | A | Diagnóstico de conducción |
| Clima/conflicto | B | Intervención de clima y vínculos |
| Desgaste | C | Programa de recuperación de capacidad |
| Transición | D | Intervención de duelo organizacional |
| Estructural | E | Consultoría organizacional |

Esta tabla aplica al **Caso 1 (dominante)**. Para los Casos 2-4 (co-dominancia, circuito hipotético, circuito confirmado), ver "Mapeo diagnóstico → estrategia de intervención" arriba. La decisión final de cómo combinar o secuenciar queda a criterio del Counselor, no de la IA.

---

## Pendiente a definir juntos

- Los rangos de "reversibilidad esperada" de cada fenómeno son una primera propuesta razonada, no datos validados — habría que ajustarlos con casos reales de EC a medida que se usen.
- ¿El modificador de reversibilidad reemplaza el 0.40 flat directamente, o convive como un "rango de confianza" (ej: reducción estimada entre 30% y 50%) que se muestra en el dashboard del Counselor?
- ¿Cómo se pondera la reversibilidad en Casos 2-4 (co-dominancia/circuito)? ¿Promedio, el más lento manda el plazo, o el circuito tiene lógica propia distinta a la suma de sus nodos?
- Falta definir cómo se ve visualmente el Mapa EC en cada uno de los 4 casos (¿grafo simple con nodos y flechas para circuitos? ¿lista con conectores `⊥` `→` `⇄` para co-dominancia?). Conecta directo con el boceto de UI pendiente.
- **Nuevo, anotado como roadmap**: el Caso 3 (circuito hipotético) requiere poder re-evaluar la intervención pasado un tiempo para confirmar o descartar el circuito. Eso es un mecanismo de seguimiento post-intervención que no existe todavía en el diseño — no es parte de V1, pero hay que tenerlo presente para no diseñar el Mapa EC como si el diagnóstico terminara en el momento de la intervención.
- **Decisión de scope pendiente**: ¿V1 implementa los 4 casos completos desde el día uno, o se lanza primero solo con el Caso 1 (dominante) — que es el más simple de validar con datos reales — y se suman co-dominancia/circuito en una V1.1 una vez que haya casos reales para calibrar los criterios de accesibilidad y reversibilidad?
