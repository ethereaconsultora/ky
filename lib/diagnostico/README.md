# lib/diagnostico — Núcleo de dominio (Fase 1)

Código **puro, sin IO** que implementa el método EC (`../../spec/metodo-ec/`). Testeable con
`node --test`. Ningún archivo de acá importa `next`, `@supabase/*` ni el SDK de Claude.

## Archivos previstos

| Archivo | Qué hace | Estado |
|---|---|---|
| `types.ts` | Tipos compartidos (Fenomeno, Condiciones, EstadoDiagnostico, ...) | ⬜ |
| `matriz.config.ts` | Los 5 fenómenos, las 4 condiciones, tabla `intensidad/confianza → 0–1`, umbrales `0.60/0.15`, tabla `fenómeno → Δfactor_fricción`. Fuente única de verdad para el clasificador y el `[CONTEXTO COMÚN]` | ⬜ |
| `mapa-indagacion.config.ts` | 6–12 hilos por fenómeno (señales, preguntas-semilla multi-registro, ángulos de laddering, ramas de desambiguación). Base: Alemany + psicología organizacional. Ver `PLAN_APROBADO.md` Parte 1.E | ⬜ |
| `contexto-comun.ts` | Genera el bloque `[CONTEXTO COMÚN]` de los system prompts desde `matriz.config` | ⬜ |
| `clasificador.ts` | `clasificarDominante(fenomenos)` → `resultado_tipo` + dominante. `clasificarCaso(relaciones)` → 1–4. Funciones puras | ⬜ |
| `motor-economico.ts` | `motorEconomico(datos, fenomenos, reversibilidad, caso)` → pérdida + reducción **como rango** + ROI. Deriva el factor de fricción | ⬜ |
| `schemas.ts` | JSON schemas de salida de cada motor (para `output_config.format`) | ⬜ |
| `prompts/motor-turno.ts` | Arma el system prompt del motor de turno (contexto común + Mapa de Indagación + instrucciones generativas + mecanismos de profundidad + anti-patrones) | ⬜ |
| `prompts/motor-sintesis.ts` | System prompt de la síntesis | ⬜ |
| `prompts/mensaje-cierre.ts` | System prompt de la redacción del mensaje de cierre | ⬜ |
| `*.test.ts` | Tests de `clasificador` y `motor-economico` (ver `spec/TEST_PLAN.md`) | ⬜ |

## Regla

Cualquier cambio al método se hace **primero** en `spec/metodo-ec/` (o se anota en
`spec/PLAN_APROBADO.md`), y **después** acá. `prompt_version` y `mapa_indagacion_version` se
sellan en cada diagnóstico para poder calibrar con casos reales.
