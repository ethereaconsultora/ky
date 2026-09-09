# Carpeta de Logs — KY

## Propósito
Registrar todo el proceso de desarrollo: avances, bugs, decisiones y soluciones.

## Archivos
- `CHANGELOG_DEV.md` — Bitácora día a día del desarrollo.
- `BUGS.md` — Bugs encontrados, causa raíz y solución aplicada.
- `YYYY-MM-DD-tipo-vX.Y.Z.md` — Log detallado de cada sesión de trabajo.

## Reglas de oro
1. Se escribe ANTES de ejecutar, no después.
2. Cada entrada tiene fecha, acción, resultado y archivos tocados.
3. Los bugs de seguridad se marcan `[SEGURIDAD]`.
4. Los commits de Git referencian entradas de estos logs.
5. Para cambios que tocan SQL / Edge Functions / estructura: dejar el resultado de la
   Auto-Auditoría (Protocolo Maestro Bloque 0) en el log del día.

## Audiencia
- Clr. Ari Mangini (Founder & Project Owner)
- Ingeniero (Claude Code / otro)
- Cualquier auditor futuro
