# WORKFLOW — KY

> **Basado en**: `ARCH BASE ORIGINALES/` + `newen/WORKFLOW.md`
> **Versión**: 1.0 — 2026-09-08

---

## Regla de oro

**ANTES de ejecutar cualquier tarea de desarrollo, se genera el registro. NUNCA después.**

---

## Ciclo diario (6 pasos)

### Paso 1 — REGISTRAR en `logs/CHANGELOG_DEV.md`
Agregar la entrada **antes de empezar**:
```markdown
### [YYYY-MM-DD] — Título de la sesión

**Prompt**: qué se pide.
**Acción esperada**: qué se va a hacer.
**Archivos previstos**: paths a crear/modificar.
**Resultado**: (COMPLETAR al finalizar)
**Archivos tocados**: (COMPLETAR al finalizar)
**Commit**: (COMPLETAR al finalizar)
**Próximo paso**: (COMPLETAR al finalizar)
```

### Paso 2 — CREAR LOG diario
`logs/YYYY-MM-DD-tipo-vX.Y.Z.md` con: CONTEXTO · PLAN · EJECUCIÓN (tabla de archivos) ·
PROBLEMAS · DECISIONES · QA.

### Paso 3 — EJECUTAR
Respetar `AGENTS.md` (orden de lectura), `spec/SPEC_MATRIX.md`, `SECURITY_SUMMARY.md`.
Para cambios que tocan SQL / Edge Functions / estructura → correr la **Auto-Auditoría
Bloque 0** del Protocolo Maestro y dejar el resultado en el log del día.

### Paso 4 — COMPLETAR registros
Cerrar campos pendientes en `CHANGELOG_DEV.md` y en el log del día. Bugs → `logs/BUGS.md`.

### Paso 5 — COMMIT
```bash
git add . && git commit -m "tipo: descripción breve (ref: logs/YYYY-MM-DD-...)"
```
Tipos: `feat` | `fix` | `refactor` | `docs` | `chore` | `security`.
Todo código nuevo va a `dev`. Merge a `main` sólo con confirmación explícita de Ari.

### Paso 6 — PUSH
```bash
git push
```

---

## Git workflow

```
feature/xxx → dev → (validación Ari + análisis de impacto) → main
```
- Vercel genera Preview URL desde `dev`.
- Nunca push directo a `main`.
- Antes de cada merge a `main`: scanner de secretos (GitGuardian / TruffleHog).

---

## Convenciones

| Elemento | Convención |
|---|---|
| Idioma | Español (logs, commits, docs, código) |
| Encoding | UTF-8 |
| Fechas | YYYY-MM-DD (ISO 8601); fechas relativas → absolutas |
| Severidad bugs | baja / media / alta / crítica |
| Seguridad | `[SEGURIDAD]` en título de bug/commit |
| camelCase JS · snake_case SQL | |

---

## Referencias
- `PRIMORDIAL.md` · `AGENTS.md` · `BACKLOG.md` · `spec/SPEC_MATRIX.md` · `SECURITY_SUMMARY.md`
- `PROTOCOLOS/PSAI_v1.3.md` — protocolo de seguridad canónico
- `PROTOCOLOS/PROTOCOLO_MAESTRO.md` — arquitectura/seguridad/despliegue del stack
