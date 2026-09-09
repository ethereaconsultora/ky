# PROJECT PLAN — KY

> Plan maestro por fases. El detalle (contexto, trade-offs, análisis de los 8 MD) está en
> `PLAN_APROBADO.md`. Este archivo es el índice ejecutable; `../BACKLOG.md` tiene el desglose
> de tareas por sprint.

## Principios

- Priorizar el núcleo de dominio (matriz + mapa de indagación) — bloquea todo lo demás y no
  depende de decisiones externas.
- Seguridad desde la primera migración (RLS + pgcrypto), no al final.
- Cada fase se revisa con Ari antes de avanzar.
- La cifra de proyección económica siempre como rango, nunca como conclusión.

## Fases

| Fase | Entregable | Depende de |
|---|---|---|
| **0** | Proyecto Supabase EC + Vercel `ky` + repo (`dev`/`main`) + keep-alive n8n | decisiones tomadas |
| **1** | `matriz.config` (fenómenos, 4 condiciones, normalización, umbrales, Δfactor). Generador de `[CONTEXTO COMÚN]`. Resuelve B1/B2/B3/I1 | Fase 0 |
| **1b** | `mapa-indagacion.config` (6–12 hilos/fenómeno, base Alemany). Prompt de turno con material de referencia + instrucciones generativas + mecanismos de profundidad + anti-patrones | Fase 1 |
| **2** | Migraciones DB + RLS + pgcrypto + vistas `ec_publico` + rol `newen_reader` | Fase 1 |
| **3** | Auth EC + shell tablet + pantalla Inicio/datos/consentimiento | Fase 2 |
| **4** | Motor de Turno (`/api/turno`) + estado de fenómenos/mecanismos + rate limit + eval de amplitud/profundidad con Ari (modo texto) | Fases 1, 1b |
| **5** | Pantalla Conversación + Mapa EC en construcción + control "respuesta lista" | Fases 3, 4 |
| **6** | STT en tiempo real (`/api/stt/token`, WebSocket, transcripción viva, fallback, cola offline) | Fase 5 |
| **7** | Motor de Síntesis (`/api/sintesis`) + Motor Económico (código) + `resultado_tipo` + 4 visualizaciones de caso | Fase 4 |
| **8** | Pantallas Resultado + Intervención + aprobar/enviar + artefacto PDF | Fase 7 |
| **9** | FDW en el proyecto Newen + sección "Diagnóstico EC" en `app/(empresa)` | Fases 2, 8 |
| **10** | Protocolo de crisis, `llamada_ia`, retención de `respuesta_cruda`, scanner de secretos, POST-DEPLOY CHECK | todas |

## Estado actual

Fase 0/1 — scaffold de docs y SDD completo (`v0.1.0`). Próximo: crear infra externa +
`lib/diagnostico/`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Prompts de turno/síntesis son borrador sin probar | Fase 4 incluye eval contra transcripciones ficticias con Ari; `mapa_indagacion_version` + `prompt_version` sellados por diagnóstico para poder comparar |
| Segundo proyecto Supabase free → pausa a 7 días | Keep-alive n8n; vigilar consumo < 70 % |
| STT latencia / costo / privacidad | Decisión de proveedor antes de la Fase 6; token efímero; fallback a manual |
| FDW no respeta RLS de EC | Control por rol + vista (`newen_reader` sólo sobre `ec_publico`), no por RLS |
| Umbrales 0.60/0.15 sin calibrar | Config versionada; recalibrar con casos reales; función de clasificación pura y testeable |
