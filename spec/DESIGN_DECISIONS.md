# DESIGN DECISIONS — KY

Cada decisión: contexto · alternativas · elección · impacto. Las 4 primeras las tomó el usuario
al aprobar el plan.

## DD-01 — Alcance v1: sólo Versión B

- **Contexto**: el método define A (web) y B (tablet). El pedido es una app de tablet.
- **Alternativas**: (a) sólo B; (b) B + A juntas; (c) sólo el motor sin UI.
- **Elección**: **(a) sólo B**. El modelo de datos deja A prevista (`version`, `resultado_tipo`,
  `diagnostico_origen_id`).
- **Impacto**: menos superficie; A se suma después sin migración.

## DD-02 — Base de datos: proyecto Supabase propio de EC + FDW

- **Contexto**: EC ya tiene módulo B2B en el repo de Newen (`organization_*`). El método pide DB
  propia de EC.
- **Alternativas**: (a) mismo proyecto que Newen, tablas `ec_*`; (b) proyecto propio + FDW;
  (c) DB propia + webhook n8n a Newen.
- **Elección**: **(b)**. Aislamiento de datos sensibles; Newen lee vistas de solo lectura.
- **Impacto**: segundo proyecto Supabase free (vigilar pausa a 7 días); auth propia de EC;
  el control de qué ve Newen es por rol + vista, no por RLS.

## DD-03 — STT en tiempo real es requisito de la v1

- **Contexto**: `arquitectura-tecnica-b.md` lo marca como central desde el día uno.
- **Alternativas**: (a) arrancar con captura manual, STT en v1.1; (b) STT en v1.
- **Elección**: **(b)**. El modo manual queda como fallback.
- **Impacto**: decisión de proveedor + patrón de token efímero + manejo offline entran al
  camino crítico (Fase 6). El motor de turno trabaja sobre texto igual, así que se puede
  desarrollar y evaluar antes del STT (Fase 4 en modo texto).

## DD-04 — Anclaje: entidad EMPRESA propia de EC

- **Contexto**: podríamos anclar a un `organization_client` de Newen o tener EMPRESA propia.
- **Elección**: **EMPRESA propia de EC**; `empresa.organization_client_id` es un FK lógico
  opcional que un admin completa cuando el prospecto se vuelve cliente.
- **Impacto**: el diagnóstico vive 100 % en EC; el vínculo con Newen es posterior y no bloquea.

## DD-05 — El económico se calcula al cierre, con el factor derivado de los fenómenos

- **Contexto**: el `factor de fricción` del motor económico no tiene fuente de datos en A ni B
  (los "3 ejes" nunca se preguntan). El boceto A lo hardcodea en 0.75.
- **Elección**: derivar `factor_friccion_derivado` de los fenómenos confirmados (la matriz lo
  insinúa: "desgaste confirmado → sube el factor"). Los 3 ejes quedan como input opcional.
- **Impacto**: el económico se corre una sola vez, al cerrar. Tabla `fenómeno → Δfactor` en
  `matriz.config`.

## DD-06 — Tabla explícita de normalización + `DOMINANTE_DEBIL`

- **Contexto**: `score = intensidad_norm × confianza_norm` con umbrales 0.60/0.15, pero el
  mapeo a 0–1 no estaba definido y el caso "1 confirmado con score bajo" quedaba sin clasificar.
- **Elección**: tabla explícita en `matriz.config` (punto de partida:
  `leve/moderado/severo/critico → 0.25/0.55/0.8/1.0`, `baja/media/alta → 0.4/0.7/1.0`), a
  recalibrar; y `resultado_tipo` gana `DOMINANTE_DEBIL`.
- **Impacto**: función de clasificación pura, testeable, con config versionada.

## DD-07 — Mapa de Indagación de 3 niveles (fenómeno → mecanismo/hilo → condición)

- **Contexto**: ~4 preguntas-plantilla por fenómeno aplanan la entrevista. El objetivo real de
  EC es la capa de mandos intermedios (Alemany).
- **Elección**: `mapa-indagacion.config` con 6–12 hilos por fenómeno (señales, preguntas-semilla
  multi-registro, ángulos de laddering, ramas de desambiguación). La IA **compone** la pregunta,
  no la elige de una lista. Mecanismos de profundidad y anti-patrones en el prompt.
- **Impacto**: prompt de turno más largo (lleva la Mapa como referencia); `fenomeno_detectado`
  gana `mecanismos jsonb` y `perfil_mando`; `mapa_indagacion_version` sellado por diagnóstico.

## DD-08 — Modelos: turno = Haiku, síntesis = Opus

- **Contexto**: el turno corre 8–15×/diagnóstico y necesita baja latencia; la síntesis corre 1×
  y necesita razonamiento pesado.
- **Elección**: `claude-haiku-4-5` (turno + mensaje de cierre), `claude-opus-5` (síntesis).
  Adaptive thinking. `output_config.format` con JSON schema — sin parsing manual.
- **Impacto**: costo acotado; `claude-opus-5` vs `claude-sonnet-5` para síntesis queda como
  decisión abierta.

## DD-09 — pgcrypto sobre la evidencia cruda

- **Contexto**: los MD no mencionan cifrado; el Protocolo Maestro lo exige para datos clínicos y
  la evidencia B tiene personas nombradas.
- **Elección**: `pgcrypto` (`pgp_sym_encrypt`) sobre `respuesta_cruda.texto` / `.transcripcion`;
  cifrado/descifrado sólo en el backend con `EC_PGCRYPTO_KEY`.
- **Impacto**: columnas `bytea`; el motor descifra server-side antes de mandar al modelo.

## DD-10 — Sin librerías de gráficos

- Heredado de Etherea DS. El Mapa EC (barras, grafo de casos) se dibuja con SVG y divs.
