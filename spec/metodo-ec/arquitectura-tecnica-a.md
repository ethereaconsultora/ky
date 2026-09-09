# Arquitectura Técnica — Versión A (Autodiagnóstico conversacional)

> En paralelo a la arquitectura de B, pero con una diferencia estructural importante: acá **no hay Counselor filtrando** — el motor de decisión le habla directamente al usuario. Es la única pieza del sistema donde la IA sí "pregunta" en el sentido literal.

---

## Roles

| Actor | Qué hace | Qué NO hace |
|---|---|---|
| **Entrevistado** (usuario de la landing) | Responde directamente a las preguntas que le hace la app | No interactúa con un Counselor — está solo frente a la herramienta |
| **App (landing, web)** | Muestra una pregunta a pantalla completa por vez, campo de texto, indicador de fase (Apertura→Exploración→Profundización→Cierre), botón de pausa | No usa audio/STT — es texto siempre. No muestra Mapa EC con intensidad/confianza (esas se calculan pero no se exponen) |
| **Motor de decisión** | Igual lógica de 4 condiciones que en B (evidencia/recurrencia/consecuencia/hipótesis). Genera la siguiente pregunta y **se la hace directamente al usuario** — no hay nadie que la filtre | Opera en **modo DOMINANTE**, no en "Caso 1" fijo — no compara cadenas explicativas ni busca relaciones entre fenómenos (eso es exclusivo de B) |
| **Motor económico** | Mismo cálculo que en B | Siempre usa `reducción_estimada_base` (40% flat) — nunca se ajusta por reversibilidad, porque eso requiere el análisis de B |

---

## Flujo por turno

A diferencia de B, acá el flujo **sí puede ser bloqueante** — no hay una conversación hablada en tiempo real que romper, es un intercambio de texto donde una pausa de uno o dos segundos entre pregunta y pregunta no molesta (de hecho, ya la habíamos diseñado a propósito como una microtransición: *"Registrando esto..."*).

```
1. Motor genera y muestra la pregunta (pantalla completa, una por vez)
        ↓
2. Usuario escribe su respuesta
        ↓
3. Se guarda como RESPUESTA_CRUDA (modalidad=texto, siempre)
        ↓
4. Motor extrae evidencia → actualiza condiciones/intensidad/confianza
   del fenómeno en curso
        ↓
5. Motor decide: ¿cerrar este fenómeno? ¿profundizar? ¿saltar a otro?
        ↓
6. Si quedan fenómenos por evaluar → vuelve al paso 1
   Si los 5 quedaron resueltos (confirmado/descartado) → cierre
```

---

## Por qué A no necesita un "motor de síntesis" separado — pero sí una mini-síntesis

En B, al cerrar, se dispara una llamada de síntesis que compara cadenas explicativas y arma `RELACIÓN_FENÓMENO`. A no necesita ese motor relacional, porque no busca relaciones — busca una **señal dominante**, y solo la declara cuando la evidencia realmente la sostiene.

**A no "es Caso 1" — A opera en modo DOMINANTE**, y ese modo tiene tres resultados posibles, no uno:

```
De los fenómenos en estado "confirmado":
  calcular score = intensidad_normalizada × confianza_normalizada  (0–1 cada una)

  si el fenómeno con mayor score:
    score ≥ 0.60  Y  supera al segundo score en ≥ 0.15
      → DOMINANTE_CONFIRMED (ese fenómeno alimenta INTERVENCIÓN_PROPUESTA caso=1)

  si hay 2+ fenómenos confirmados pero ninguno cumple el umbral/separación
      → DOMINANTE_AMBIGUOUS (no se fuerza un ganador)

  si ningún fenómeno llegó a "confirmado"
      → SIN_EVIDENCIA_SUFICIENTE
```

Los valores 0.60 y 0.15 son un punto de partida razonado, no una verdad matemática — se calibran con diagnósticos reales, igual que los rangos de reversibilidad de la matriz. Lo importante es el principio: **una fórmula no decide sola algo que es, en el fondo, un juicio diagnóstico** — decide solo cuándo hay evidencia suficiente para que valga la pena declarar un dominante.

No hace falta programar un motor de síntesis relacional para esto. Alcanza con una función descriptiva simple:

```
GENERAR_RESULTADO_A(fenómeno_dominante, evidencias)
  → arma el cierre tipo "La principal señal detectada está relacionada con..."
```

A diferencia de B, que necesita **síntesis relacional** (reconstruir A→B, A⊥B, A⇄B), A solo necesita **síntesis descriptiva**: convertir evidencia en una frase de cierre.

---

## El resultado DOMINANTE_AMBIGUOUS: aprovecharlo, no ocultarlo

Cuando el resultado es `DOMINANTE_AMBIGUOUS` (dos o más fenómenos confirmados sin separación suficiente), A no fuerza un ganador. Ahí conviene una salida honesta y, de paso, comercialmente útil — pero sin que se note la venta:

> *"Detectamos más de una señal relevante en tu organización y, con esta primera evaluación, no sería responsable reducirla a una sola causa. Para saber cómo se relacionan esas señales y dónde se está produciendo la pérdida, hace falta una evaluación más profunda."*
>
> **Diagnóstico EC con un profesional**

La limitación de A se convierte en una demostración de rigor, no en una falla — no forzamos una conclusión cuando la evidencia no la sostiene, y eso es justamente lo que hace confiable al resto del sistema.

`SIN_EVIDENCIA_SUFICIENTE` es distinto: ahí ningún fenómeno llegó siquiera a "confirmado" (no que dos empaten). El mensaje en ese caso no es "hay más de una señal" sino algo más cercano a "no encontramos suficientes señales con esta información" — matiz a redactar aparte.

---

## Qué usa A del modelo de datos compartido (repaso)

- `RESPUESTA_CRUDA`: siempre modalidad=texto
- `FENÓMENO_DETECTADO`: completo, incluida intensidad/confianza — se calculan siempre, no se muestran
- `RELACIÓN_FENÓMENO`: no se genera nunca en A
- `REVERSIBILIDAD`: no se genera — A no la necesita porque usa la reducción base flat
- `INTERVENCIÓN_PROPUESTA`: siempre asociada a `DOMINANTE_CONFIRMED` (equivalente al caso=1 de B), solo si ese resultado se alcanzó — sin `reversibilidad_id`
- `DIAGNÓSTICO.resultado_tipo`: nuevo campo, enum (`DOMINANTE_CONFIRMED`, `DOMINANTE_AMBIGUOUS`, `SIN_EVIDENCIA_SUFICIENTE`) — a nivel del diagnóstico completo, distinto del `estado` que ya tiene cada fenómeno individual
- `diagnostico_origen_id`: queda vacío en el diagnóstico A original — es lo que un futuro diagnóstico B referencia si la empresa avanza a una entrevista con Counselor

---

## Pausa de diagnóstico

Se permite, con un esquema concreto en `DIAGNÓSTICO`:

| Campo | Propósito |
|---|---|
| `paused_at` | Cuándo se pausó |
| `expires_at` | `paused_at` + 7 días |
| `resume_token` | Identificador seguro para retomar sin reautenticación completa |

**Por qué 7 días y no más**: no es una limitación técnica — es que A es una herramienta de captación, no un expediente permanente. Pasado ese plazo la situación organizacional puede haber cambiado y las respuestas pierden actualidad. Al expirar, el diagnóstico queda cerrado/no retomable y sus datos siguen la política de retención ya definida para A en el modelo de datos.

---

## Transición A → B: hipótesis inicial, no verdad diagnóstica

Si una empresa termina A y avanza a un diagnóstico con Counselor, **B no vuelve a preguntar desde cero, pero tampoco da por cierto lo que A concluyó**:

```
A → hipótesis inicial → B → verificación / corrección / profundización → diagnóstico EC definitivo
```

B recibe de A: fenómenos detectados, intensidad, confianza, evidencias, respuestas originales, datos económicos, estado de cada fenómeno — todo vía `diagnostico_origen_id`. Pero el Counselor y el motor de B tratan eso como punto de partida a confirmar, no como dato cerrado.

---

## Cierre de la arquitectura A

| | |
|---|---|
| Función | Captación + estimación + detección inicial |
| Modalidad | Conversación escrita |
| Alcance diagnóstico | Búsqueda de fenómeno dominante (modo DOMINANTE) |
| No hace | Relaciones entre fenómenos, circuitos, ni reversibilidad |
| Calcula internamente | Intensidad + confianza |
| Expone | Resultado económico + señal detectada, sin puntajes diagnósticos |
| Dominancia | Solo se declara con evidencia suficiente y separación suficiente respecto del segundo fenómeno |
| Ambigüedad | No fuerza un dominante — propone B |
| Pausa | Sí, hasta 7 días |
| Transición A → B | Conserva el diagnóstico A como hipótesis inicial, no como verdad diagnóstica |

**A descubre. B comprende. EC interviene. El Motor Económico cuantifica. El seguimiento demuestra si la comprensión y la intervención fueron correctas.**

---

## Pendiente a definir juntos

- El mensaje exacto de `SIN_EVIDENCIA_SUFICIENTE` (distinto del de `DOMINANTE_AMBIGUOUS`) todavía no está redactado.
- Los valores 0.60 (umbral) y 0.15 (separación mínima) son un punto de partida — se calibran con diagnósticos reales de EC.
