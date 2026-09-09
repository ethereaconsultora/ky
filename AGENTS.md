<!-- BEGIN:nextjs-agent-rules -->
# Next.js App Router

Proyecto Next.js App Router. Rutas API en `app/api/`, componentes en `components/`, hooks en
`hooks/`, utilidades y dominio en `lib/`.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-reading-order -->
# Orden de lectura del proyecto (economía de tokens)

## Regla de oro
**Si un archivo ya fue leído en esta sesión, NO se vuelve a leer.**

## Etapa 0 — WORKFLOW (leer ANTES de cualquier acción)
0. `WORKFLOW.md` — ciclo diario: registrar → ejecutar → commit → push

## Etapa 1 — Contexto mínimo (leer siempre al iniciar)
1. `PRIMORDIAL.md` — qué es KY, para quién, cómo funciona (<200 líneas)
2. `spec/SPEC_MATRIX.md` — matriz de artefactos y su estado
3. `SECURITY_SUMMARY.md` — seguridad en 1 minuto
4. `BACKLOG.md` — tareas actuales
5. `spec/PLAN_APROBADO.md` — plan de construcción + análisis de los 8 MD del método

## Etapa 2 — Por tipo de tarea (leer SOLO lo que aplica)

| Tarea | Leer |
|---|---|
| Motor de turno / síntesis / prompts | `spec/metodo-ec/` (los 8 MD) + `lib/diagnostico/` |
| Implementar endpoint | `spec/API_CONTRACTS.md` + `spec/openapi.yaml` |
| Diseñar / migrar DB | `spec/DATA_MODEL.md` + `spec/init_schema.sql` |
| Seguridad completa | `SECURITY.md` + `PROTOCOLOS/PSAI_v1.3.md` |
| UX / pantallas | `spec/UX_FLOW.md` + `spec/USER_STORIES.md` |
| Estilos / componentes | `DESIGN_SYSTEM.md` |
| Desplegar | `spec/DEPLOYMENT.md` + `spec/DEPLOYMENT_CHECKLIST.md` |
| Integración con Newen | `spec/DEPLOYMENT.md` §FDW + `spec/DATA_MODEL.md` §vistas |

## Prohibiciones
- NUNCA exponer API keys en código o frontend (`NEXT_PUBLIC_*` sólo para la anon key de Supabase).
- NUNCA que `respuesta_cruda` (transcripciones/evidencia con nombres) salga del proyecto EC.
- NUNCA ejecutar código sin registrar antes en `logs/CHANGELOG_DEV.md` + crear log diario.
- NUNCA hacer commit sin completar los registros (CHANGELOG_DEV + log del día).
- NO leer `SECURITY.md` y `PSAI_v1.3.md` en la misma sesión salvo auditoría formal.
<!-- END:project-reading-order -->
