# UX FLOW — KY

Target: **tablet en horizontal**. 4 pantallas + overlays. Basado en `metodo-ec/boceto-version-b.html`
con las correcciones de `PLAN_APROBADO.md` Parte 4. Estilos en `../DESIGN_SYSTEM.md`.

```
Login (email + OTP)
   │
   ▼
[1] INICIO / DATOS + CONSENTIMIENTO
   │  - Datos empresa: nombre, sector, N, S, R  (+ 3 ejes de fricción, opcionales)
   │  - Pantalla de consentimiento de audio (texto versionado; tap del entrevistado)
   │     · si no consiente → modo_captura = manual
   ▼
[2] CONVERSACIÓN (el copiloto en vivo)
   ┌───────────────────────────┬──────────────────────────────┐
   │ Transcripción en vivo     │ Mapa EC en construcción       │
   │ (STT)                     │ - 5 chips: estado / intensidad │
   │ [ Respuesta lista →       │   / confianza                 │
   │   analizar ]  (+ silencio)│ - indicador conexión / cola    │
   ├───────────────────────────┴──────────────────────────────┤
   │ Sugerencias de próxima pregunta (2–3 pills, hilos distintos)│
   ├──────────────────────────────────────────────────────────┤
   │ [ Cerrar diagnóstico ]         (banner de alerta_seguridad │
   │                                 si el motor la marca)      │
   └──────────────────────────────────────────────────────────┘
   │  (se repite 8–15 veces; el motor puede sugerir cerrar)
   ▼
[3] RESULTADO — Mapa EC final
   │  - Fenómenos confirmados: mecanismo → consecuencia → indicador
   │  - Relación entre fenómenos (visual según caso 1/2/3/4)
   │  - Pérdida económica en 3 capas:
   │      · Lo que SABEMOS   (fenómenos + N/S/R)          — afirmación
   │      · Lo que ESTIMAMOS (presentismo/rotación/total) — cifra firme
   │      · Lo que PROYECTAMOS (reducción/ROI)            — RANGO, borde dashed, "sin validar"
   ▼
[4] INTERVENCIÓN PROPUESTA
   │  - 1 frente (caso 1) / 2 frentes (caso 2) / punto de accesibilidad (caso 3–4)
   │  - Traducción humana + reversibilidad (rango grado_temprano–grado_tardio)
   │  - Horizonte 6/12/24 meses (rangos, no cifras categóricas)
   │  [ Editar propuesta ]  [ Aprobar ]  [ Enviar a la empresa ]
   ▼
  (fin) → visible en el dashboard de Newen vía ec_publico.v_* (si hay organization_client_id)
```

## Estados y microcopys clave

| Situación | Qué muestra la UI |
|---|---|
| STT conectado | punto verde + "Escuchando" |
| Cola offline pendiente | Mapa EC con badge "desactualizado" + contador de items sin sincronizar |
| `alerta_seguridad` | banner discreto color `--warn` para el Counselor: "El entrevistado mencionó algo que puede requerir atención. Revisá antes de seguir." — sin repetir el contenido |
| Rate limit en `/api/turno` | toast: "Procesando el turno anterior — seguí la charla, en unos segundos actualizo el mapa" |
| `fin_diagnostico` | CTA destacada: "El motor no encuentra más señales por indagar. ¿Cerramos?" |
| Motor económico sin fenómenos confirmados | pantalla Resultado en modo `SIN_EVIDENCIA_SUFICIENTE`: sin cifras de reducción, mensaje honesto |

## Fase (microtransición)

Entre "respuesta lista" y la actualización del Mapa: *"Registrando esto…"* (~1 s), como en el
boceto A. No bloquea la charla — es feedback, no un gate.

## Fuera de v1

- Migración A → B en vivo. Pantalla de SEGUIMIENTO. Multi-idioma.
