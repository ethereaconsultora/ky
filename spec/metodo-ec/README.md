# Método EC — documentos fuente ("el cerebro")

Los 8 documentos de diseño del método de diagnóstico de Espacio Crítico, redactados con Ari.
KY (Versión B) implementa lo que estos documentos definen. Cualquier ajuste al método se hace
**acá primero**, y después en el código (`lib/diagnostico/`).

| Documento | Qué define |
|---|---|
| `matriz-diagnostica-ec.md` | Los 5 fenómenos, las 4 condiciones de cierre, el árbol de preguntas, el motor económico (base y ajustado), la matriz de relación entre fenómenos, la separación "sabemos / estimamos / proyectamos" |
| `modelo-datos-ec-v1.md` | Entidades y campos compartidos por A y B: EMPRESA, DIAGNÓSTICO, RESPUESTA_CRUDA, FENÓMENO_DETECTADO, RELACIÓN_FENÓMENO, REVERSIBILIDAD, PÉRDIDA_ECONÓMICA, INTERVENCIÓN_PROPUESTA |
| `arquitectura-tecnica-a.md` | Versión A (autodiagnóstico web) — modo DOMINANTE, 3 resultados posibles. **No se construye en la v1 de KY**, pero el modelo de datos la contempla |
| `arquitectura-tecnica-b.md` | Versión B (copiloto del Counselor) — roles, flujo por turno, dos llamadas de IA, disparador de la síntesis, integración con Newen por FDW. **Esto es lo que construye KY** |
| `system-prompts-a.md` | Prompts de A (motor de turno + motor de cierre 2a/2b) |
| `system-prompts-b.md` | Prompts de B (motor de turno + motor de síntesis) — borrador, se calibra con casos reales |
| `boceto-version-a.html` | Mockup de la landing A |
| `boceto-version-b.html` | Mockup de la tablet B — 4 pantallas (Inicio → Conversación → Resultado → Intervención) |

## Ajustes ya acordados sobre estos documentos

Ver `spec/PLAN_APROBADO.md` Parte 1 (análisis de los 8 MD: bloqueantes, inconsistencias, gaps,
mejoras) y Parte 1.E (motor de preguntas adaptativas basado en Jordi Alemany,
*La posición más jodida del organigrama*). Los cambios concretos al modelo de datos están en
`spec/PLAN_APROBADO.md` Parte 3 y en `spec/DATA_MODEL.md`.
