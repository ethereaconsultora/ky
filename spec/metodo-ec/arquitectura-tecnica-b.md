# Arquitectura Técnica — Versión B (Motor Diagnóstico Conversacional)

> Aclaración de partida: "conversacional" describe cómo razona el motor (turno a turno, con estado acumulado), no que la IA hable con el entrevistado. La única conversación humana es Counselor ↔ Entrevistado.

---

## Roles

| Actor | Qué hace | Qué NO hace |
|---|---|---|
| **Entrevistado** | Responde naturalmente a las preguntas del Counselor | No ve la app, no sabe que hay un motor procesando |
| **Counselor** | Conduce la charla, decide qué preguntar de verdad, vuelca respuestas (o las deja transcribir), aprueba la intervención final | No es reemplazado por el motor — el motor nunca decide una pregunta sin su filtro |
| **App (tablet)** | Escucha de forma continua y transcribe en tiempo real (STT) — el Counselor nunca tipea mientras entrevista. Muestra la transcripción viva y el Mapa EC en construcción, y sugerencias del motor | No genera preguntas por su cuenta — solo muestra lo que devuelve el motor. No depende de que el Counselor escriba nada durante la charla |
| **Motor de decisión** (IA, backend) | Recibe cada respuesta nueva, actualiza el estado del fenómeno correspondiente, decide profundizar/saltar/cerrar, sugiere próximas preguntas | No le habla al entrevistado, no decide qué se dice en voz alta |
| **Motor de síntesis** (IA, backend, se activa una sola vez al cerrar) | Compara cadenas explicativas, clasifica relaciones (dominante/co-dominante/circuito), arma la intervención propuesta | No corre en cada turno — sería costoso e innecesario antes de tener todo el cuadro |
| **Motor económico** (backend, determinístico) | Calcula pérdida y ROI a partir de datos económicos + fenómenos confirmados + reversibilidad | No razona ni infiere — son fórmulas fijas |

---

## Flujo por turno (durante la entrevista)

```
1. Counselor pregunta, de forma natural y empática — sin mirar la pantalla
        ↓
2. Entrevistado responde
        ↓
3. La app escucha en continuo → STT en tiempo real → texto
        ↓  (se guarda como RESPUESTA_CRUDA, modalidad=audio, transcripción automática)
4. Motor de decisión recibe: la transcripción de la respuesta + el estado actual
   de todos los FENÓMENO_DETECTADO de este diagnóstico
        ↓
5. Motor extrae evidencia → actualiza condiciones/intensidad/confianza
   del fenómeno correspondiente (o abre uno nuevo si aparece señal
   de un fenómeno todavía no evaluado)
        ↓
6. Motor decide: ¿cerrar este fenómeno? ¿seguir profundizando?
   ¿bajar su prioridad y saltar a otro?
        ↓
7. Motor actualiza en segundo plano: Mapa EC (columna derecha)
   + 2-3 sugerencias de próxima pregunta (franja inferior)
        ↓
8. Counselor sigue la charla con naturalidad, y mira la sugerencia
   solo cuando le sirve (una pausa natural, una duda sobre hacia
   dónde llevar la siguiente pregunta) → vuelve al paso 1
```

**Importante: esto no es un loop que bloquea la conversación.** El Counselor no espera a que el motor responda para seguir preguntando — eso rompería el ritmo natural de la entrevista. La transcripción y el análisis corren en paralelo, de forma continua, mientras la charla sigue su curso. Las sugerencias están ahí para cuando el Counselor decide mirarlas, no para pausar la charla mientras se generan.

**Fallback, no modo principal**: si no hay consentimiento de audio, o falla la conexión/el STT, el Counselor puede marcar chips rápidos o tipear notas cortas entre preguntas — pero esto es la excepción, no cómo está pensado que funcione B normalmente.

Esto se repite entre 8 y 15 veces por diagnóstico (el rango ya acordado en la matriz).

---

## Por qué son dos llamadas de IA distintas, no una

| | Llamada de turno | Llamada de síntesis |
|---|---|---|
| Frecuencia | 8-15 veces por diagnóstico | 1 vez, al cerrar |
| Qué recibe | La respuesta nueva + el fenómeno que está en curso | Todos los fenómenos confirmados + sus cadenas explicativas completas |
| Qué hace | Actualiza un fenómeno puntual, sugiere próxima pregunta | Aplica la matriz de relación (A→B, A⊥B, A↔B, A⇄B, A?B), decide caso 1-4, arma `INTERVENCIÓN_PROPUESTA` |
| Costo/latencia | Debe ser rápida — el Counselor está esperando para seguir preguntando | Puede tomarse más tiempo — ocurre una vez, sin nadie esperando en vivo |

Separarlas evita correr el razonamiento pesado de co-dominancia/circuito en cada respuesta, cuando en la mayoría de los turnos ni siquiera hace falta.

---

## Disparador de la síntesis

No se activa automáticamente al llegar a una cantidad fija de preguntas. Se dispara cuando:
- El Counselor marca "cerrar diagnóstico", o
- El motor de decisión detecta que ya no quedan fenómenos con evidencia pendiente de profundizar (los 5 quedaron en `confirmado` o `descartado`)

---

## Piezas técnicas que quedan para el siguiente paso (no resueltas todavía)

- **STT en tiempo real**: esto ya no es una decisión de "si", es de "con qué proveedor". Es requisito central de B desde el día uno — no una fase 2. Necesita baja latencia (transcripción casi inmediata) para que el Mapa EC se sienta vivo mientras avanza la charla. El modo manual (chips/notas) queda solo como fallback ante falta de consentimiento o falla técnica, no como punto de partida
- **Dónde vive el motor**: API propia llamando a un modelo (patrón similar al de "IA en Artifacts" pero para producción real), o un servicio backend separado
- **Sincronización en tiempo real** entre la tablet del Counselor y el backend (polling simple vs. websockets) — importa para que el Mapa EC se sienta "vivo"
- **Manejo offline**: qué pasa si se corta la conexión en una entrevista presencial en un lugar con mala señal — ¿la app guarda localmente y sincroniza después, o requiere conexión constante?

Estas cuatro son decisiones de implementación, no de método EC — se pueden resolver cuando se defina el stack concreto.

**Consecuencia sobre el modelo de datos**: si audio+transcripción en vivo es el modo por defecto de B (no una opción entre dos), entonces `consentimiento_audio` deja de ser un campo que a veces se completa — se vuelve un paso obligatorio al inicio de prácticamente todos los diagnósticos B. Vale la pena que la pantalla de consentimiento sea rápida y fluida, porque va a aparecer en (casi) cada entrevista, no como excepción.

---

## Integración con Newen

EC ya tiene base de datos propia, en el mismo motor que usa Newen pero en un proyecto distinto — ambos son **Supabase**.

**Mecanismo recomendado**: la extensión `Wrappers` de Supabase (FDW nativo), configurada como `postgres_fdw` desde el proyecto Newen hacia el proyecto EC. En la práctica:

1. En el proyecto **EC**: crear un rol de Postgres de solo lectura, con permisos únicamente sobre un esquema/vistas expuestas a propósito (no sobre las tablas base).
2. En el proyecto **Newen**: habilitar `Wrappers`, configurar la conexión FDW con las credenciales de ese rol, e importar el esquema foráneo — quedan disponibles como tablas foráneas de solo lectura, consultables en tiempo real sin sincronización ni webhook.
3. **Ojo con RLS**: una conexión FDW consulta con los permisos del rol de Postgres que se le dio, no necesariamente respeta Row Level Security del lado EC salvo que se configure explícitamente. Por eso el punto 1 importa tanto — el control de qué ve Newen se hace por rol + vista expuesta, no confiando en que RLS lo filtre solo.

**Qué se expone** (vistas, no tablas base): estado de `DIAGNÓSTICO`, `PÉRDIDA_ECONÓMICA`, `INTERVENCIÓN_PROPUESTA`. **Qué no se expone**: `RESPUESTA_CRUDA` (transcripciones/evidencia) — ahí vive lo más sensible de la entrevista, y Newen no necesita verlo para mostrar resultados.
