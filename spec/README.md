# Especificación SDD — KY

## Estructura de `spec/`

| Archivo | Propósito | Estado |
|---|---|---|
| `README.md` | Este archivo — mapa de artefactos | ✅ |
| `SPEC_MATRIX.md` | Matriz de trazabilidad de artefactos | ✅ |
| `PLAN_APROBADO.md` | Plan de construcción + análisis de los 8 MD + Parte 1.E (preguntas adaptativas) | ✅ |
| `USER_STORIES.md` | Historias de usuario | ✅ |
| `USE_CASES.md` | Casos de uso detallados | ✅ |
| `API_CONTRACTS.md` | Contratos de endpoints | ✅ |
| `openapi.yaml` | Especificación OpenAPI 3.0 | ✅ (borrador) |
| `DATA_MODEL.md` | Modelo de datos (ajustes sobre `metodo-ec/modelo-datos-ec-v1.md`) | ✅ |
| `init_schema.sql` | Script SQL para Supabase (borrador, revisar a mano antes de correr) | ✅ (borrador) |
| `ACCEPTANCE_CRITERIA.md` | Criterios de aceptación | ✅ |
| `DESIGN_DECISIONS.md` | Decisiones de diseño y su rationale | ✅ |
| `DEPLOYMENT.md` | Guía de despliegue + configuración del FDW hacia Newen | ✅ |
| `DEPLOYMENT_CHECKLIST.md` | Checklist pre-deploy | ✅ |
| `TEST_PLAN.md` | Plan de testing | ✅ |
| `UX_FLOW.md` | Flujos de UX (4 pantallas) | ✅ |
| `DATA_PRIVACY.md` | Privacidad y retención de datos | ✅ |
| `metodo-ec/` | Los 8 documentos fuente del método EC | ✅ |

## Reglas
- Cada artefacto se actualiza cuando cambia el requisito.
- `SPEC_MATRIX.md` es el índice maestro de estado.
- El método vive en `metodo-ec/`; los ajustes acordados están en `PLAN_APROBADO.md`.
- Los commits referencian artefactos cuando corresponde.

## Audiencia
- Clr. Ari Mangini (Founder)
- Ingeniero
- Futuros colaboradores / auditores
