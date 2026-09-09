# BUGS — KY

Bugs encontrados durante el desarrollo, con causa raíz y solución. Los de seguridad se marcan
`[SEGURIDAD]`.

Formato:

```
### [YYYY-MM-DD] Título — severidad (baja/media/alta/crítica)
**Síntoma**: qué se observó.
**Causa raíz**: por qué pasaba.
**Solución**: qué se cambió.
**Archivos**: paths.
**Commit**: hash / ref.
**Prevención**: test o check agregado para que no vuelva.
```

---

### [2026-09-09] `npm audit`: postcss vía next 15 — alta (superficie de build)
**Síntoma**: `npm audit` reporta 2 vulnerabilidades (1 moderada en `next`, 1 alta en `postcss`:
path traversal / XSS en el stringify de CSS).
**Causa raíz**: `postcss` entra como dependencia transitiva de `next@15.5.25`. Es superficie de
**build**, no runtime de la app desplegada; no hay CSS de terceros ni input de atacante.
**Solución**: diferida. El fix exige `next@16` (`npm audit fix --force`) — la migración de Next
major es su propia tarea. `npm audit fix` (seguro) no alcanza.
**Archivos**: `package.json`, `package-lock.json`.
**Commit**: —
**Prevención**: revisar al planificar el bump a Next 16. Sin CSS de terceros mientras tanto.
