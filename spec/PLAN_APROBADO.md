# Espacio Crítico — App de Tablet (Versión B, copiloto del Counselor)

## Context

Espacio Crítico (EC) es la consultora organizacional B2B del ecosistema (la marca hermana de
Newen, B2C). Hoy EC ya tiene, dentro del repo `newen/`, un módulo comercial `app/(empresa)`
(tablas `organization_*`, ciclo de 6 fases, derivaciones a counselors, campus). Lo que **no**
existe todavía es el **instrumento de diagnóstico** descrito en los 8 MD: un motor que detecta 5
fenómenos organizacionales mediante 4 condiciones de cierre, los traduce a un mecanismo de
pérdida económica y a una intervención con reversibilidad estimada.

Los MD definen dos versiones de ese instrumento:
- **Versión A**: autodiagnóstico web público (la IA le habla al usuario).
- **Versión B**: copiloto de IA para el Counselor durante una entrevista real, en una tablet.

Este plan cubre **solo la Versión B** (decisión del usuario). La app de tablet corre el motor de
turno + el motor de síntesis, muestra el Mapa EC en construcción y la propuesta de intervención,
y publica los resultados hacia el dashboard de Newen.

**Decisiones tomadas con el usuario:**
1. Alcance v1: **solo Versión B** (la tablet). El modelo de datos deja lugar para A.
2. Base de datos: **proyecto Supabase propio de EC** + `Wrappers`/`postgres_fdw` de solo lectura
   desde el proyecto Newen (como dicen `arquitectura-tecnica-b.md` y `system-prompts-b.md`).
3. **STT en tiempo real es requisito de la v1** (no arrancamos con captura manual).
4. Cada diagnóstico se ancla a una **entidad `EMPRESA` propia de EC** (modelo de los MD); el
   vínculo con `organization_clients` de Newen es un FK opcional y posterior.

Este documento tiene dos partes: **(1)** análisis de los 8 MD — errores, inconsistencias y
mejoras — y **(2)** el plan de la app.

---

# PARTE 1 — Análisis de los 8 MD

## 1.A — Bloqueantes (resolver antes de escribir código)

| # | Problema | Dónde | Propuesta de resolución |
|---|---|---|---|
| B1 | **El "factor de fricción" no tiene fuente de datos.** El motor económico (`matriz-diagnostica-ec.md`) lo calcula desde "respuestas de los 3 ejes (promedio)" y `modelo-datos` lo lista como obligatorio en `DATOS_ECONÓMICOS`. Pero ni A ni B recolectan esos 3 ejes: el intro de B pide sólo Nombre/Sector/N/S/R. El `boceto-version-a.html` lo esquiva con `factor = 0.75` hardcodeado. | matriz §Motor Económico, modelo-datos §DATOS_ECONÓMICOS, ambos bocetos | **Derivar el factor de los fenómenos confirmados**, no preguntarlo. La propia matriz lo insinúa en "Modelo de lenguaje EC → codificación": *"desgaste confirmado → sube el factor de fricción"*. Definir una tabla fenómeno→Δfactor y calcular el económico **al cierre** (ver B4). Alternativa mínima: 3 sliders opcionales en la pantalla de datos. |
| B2 | **La normalización de `score` está indefinida y es load-bearing.** `score = intensidad_normalizada × confianza_normalizada`, con umbrales 0.60 / 0.15. Pero `intensidad` tiene 4 niveles (`leve/moderado/severo/crítico`) y `confianza` 3 (`baja/media/alta`); el mapeo a 0–1 no está en ningún MD. Con un mapeo ingenuo (`moderado`=0.5, `media`=0.66) el score nunca llega a 0.60. | system-prompts-a §2a, arquitectura-tecnica-a, matriz §Motor Económico Ajustado Caso 2 (`peso_i`) | Fijar tabla explícita, p. ej. `leve/moderado/severo/crítico → 0.25/0.55/0.8/1.0` y `baja/media/alta → 0.4/0.7/1.0`, y **recalibrar 0.60/0.15 sobre esa escala**. Guardar la tabla y los umbrales en un archivo de config versionado. |
| B3 | **`DOMINANTE` deja un caso sin clasificar.** En `system-prompts-a §2a`: si hay **un solo** fenómeno confirmado con `score < 0.60`, no cae en `DOMINANTE_CONFIRMED` (score bajo), ni en `DOMINANTE_AMBIGUOUS` (requiere 2+), ni en `SIN_EVIDENCIA_SUFICIENTE` (sí hay 1 confirmado). Resultado indefinido. | system-prompts-a §2a, arquitectura-tecnica-a | Agregar 4.ª rama: 1 confirmado con score < umbral → `DOMINANTE_CONFIRMED` con `confianza=baja` **o** un nuevo `resultado_tipo = DOMINANTE_DEBIL`. Aplica a B también (el "Caso 1" con evidencia floja). |
| B4 | **Disparador del motor de turno en B no está definido.** `arquitectura-tecnica-b.md` insiste en STT **continuo** ("no es un loop que bloquea"), pero el motor de turno "se ejecuta después de cada respuesta nueva". En un stream continuo, ¿quién marca dónde termina una respuesta del entrevistado? | arquitectura-tecnica-b §Flujo por turno, system-prompts-b §1 | La tablet necesita un control explícito del Counselor: **"respuesta lista → analizar"** (botón / gesto), complementado con detección de silencio (~2–3 s) como sugerencia. El turno se dispara con ese evento, sobre el texto acumulado desde el último disparo. |
| B5 | **Reconciliación con el modelo B2B ya existente en Newen.** El repo `newen/` ya modela EC como una `organization` (slug `espacio-critico`) con `organization_clients` (las empresas diagnosticadas), ciclo de 6 fases (`Diagnóstico→…→Mantenimiento`), `organization_derivaciones`, `organization_tasks`. El modelo de los MD (`EMPRESA → DIAGNÓSTICO → FENÓMENO_DETECTADO → …`) es otro esquema. | modelo-datos-ec-v1.md vs `newen/spec/init_v0.27.0_empresas.sql`, `newen/app/(empresa)/empresa/page.tsx` | Con la decisión tomada (EMPRESA propia de EC): el diagnóstico vive 100 % en el proyecto EC. El puente a Newen es (a) FDW de solo lectura + (b) un FK opcional `EMPRESA.organization_client_id` que un admin de Newen setea cuando el prospecto se vuelve cliente. El resultado de EC alimenta la **Fase 1 (Diagnóstico)** del ciclo de 6 fases de Newen, no lo reemplaza. |

## 1.B — Inconsistencias entre documentos

| # | Inconsistencia | Detalle |
|---|---|---|
| I1 | `condición_*`: **3 valores vs booleano.** `matriz-diagnostica-ec.md` dice "se registra como bandera (sí/no/parcial)"; `modelo-datos` y ambos `system-prompts` las tratan como `booleano`. | Elegir uno. Recomendado: `boolean` + un campo `notas_condicion` para el "parcial". Si se quiere `parcial` real, el motor de decisión lo necesita para "profundizar". |
| I2 | `boceto-version-a.html` **calcula y muestra el económico a mitad del flujo** con `factor=0.75` fijo, contra la idea (matriz) de que el económico se arma con los fenómenos ya confirmados. | El cálculo debe ser el último paso. En B esto es más claro (hay pantalla de Resultado), pero conviene dejarlo escrito en `arquitectura-tecnica-*`. |
| I3 | `boceto-version-a.html`: la regla de salto dispara con `"Muy clara"` **y** `"Bastante clara"`. `matriz` menciona sólo `"Muy clara"` / `"Nunca"`. | `"Bastante clara"` es evidencia débil, no ausencia de evidencia. Descartarlo es demasiado agresivo. Calibrar (afecta a A, pero el criterio es compartido). |
| I4 | **ROI dimensionalmente inconsistente.** `reducción = pérdida_total × 0.40` es anual; `costo_intervención = N × S × 0.06` no está anualizado (sin `×12`). `ROI = ((reducción − costo)/costo) × 100` compara una magnitud anual con una mensual/puntual. | Decidir si el costo es puntual (una intervención) o anual, y anotarlo explícito. Si es puntual, el ROI está OK pero hay que decirlo; si no, falta `×12` o un factor. |
| I5 | **Presupuesto de preguntas: blando (8–15) vs duro (4/fenómeno × 5 = 20).** No está definido qué pasa al llegar a 15 con fenómenos aún "en observación". | Regla: el tope blando puede excederse para **cerrar** un fenómeno en curso, pero **no se abre** un fenómeno nuevo pasadas N preguntas. Escribirlo en `system-prompts-b §1` paso 3. |
| I6 | `REVERSIBILIDAD.plazo_esperado` (enum `inmediato/corto/medio/largo`) vs `INTERVENCIÓN_PROPUESTA.horizonte_temporal` (enum `6/12/24 meses`): dos ejes temporales que se pisan. | Aclarar: `plazo_esperado` = cuándo aparece el efecto; `horizonte_temporal` = ventana de la proyección que se muestra. Renombrar a `plazo_aparicion_efecto` y `horizonte_proyeccion`. |
| I7 | Las **4 fases UX de A** (`Apertura/Exploración/Profundización/Cierre`, en `boceto-version-a.html` y `arquitectura-tecnica-a.md`) no mapean al recorrido por fenómenos (que es un salto dinámico, no lineal). | Es una decisión de A, no bloquea B. Si se hace A: mapear Apertura=datos, Exploración=preguntas de detección/evidencia, Profundización=consecuencia/hipótesis, Cierre=última. |
| I8 | `RESPUESTA_CRUDA.consentimiento_audio` "registrado por respuesta" vs realidad de un STT continuo: no hay consentimiento pregunta a pregunta en una charla. | Modelar **un evento de consentimiento al inicio** del diagnóstico (texto + versión + timestamp + firma/tap del entrevistado) y **sellar su id en cada `RESPUESTA_CRUDA`**. Sigue siendo auditable sin fingir un consentimiento por turno. |
| I9 | "Evidencia de **más de un momento temporal**" para circuito confirmado (`matriz` y `system-prompts-b`) se confunde con `RESPUESTA_CRUDA.timestamp`. | Aclarar en el prompt: la evidencia temporal es la **cronología narrada** por el entrevistado (“primero pasó X, después eso hizo que Y”), no el reloj de las respuestas. |

## 1.C — Gaps de diseño (faltan, no contradicen)

1. **Cifrado en reposo.** Ningún MD menciona `pgcrypto`, pero el Protocolo Maestro lo exige para datos clínicos. `RESPUESTA_CRUDA.texto` / `.transcripción` y la evidencia con personas nombradas (`"Sebastián Ríos, Gerente de Operaciones"` en `boceto-version-b.html`) son datos personales sensibles → cifrar esos campos.
2. **Protocolo de crisis / seguridad.** No hay ninguna previsión de qué hace el sistema si en la entrevista (B) o en el texto libre (A) alguien revela autolesión, acoso, violencia o un ilícito. Para una consultora de counseling esto no es opcional. Definir: detección + alerta al Counselor + no persistir ciertos contenidos + guía de derivación.
3. **Proveedor de STT y patrón de credencial.** Sin elegir (anotado como pendiente en `arquitectura-tecnica-b.md`). Para es-AR en tiempo real: Deepgram, AssemblyAI, Azure Speech, Google STT, OpenAI Realtime. El BFF del Protocolo Maestro prohíbe keys en el cliente → patrón de **token efímero** (el backend acuña un token de corta duración; la tablet abre el WebSocket al STT con ese token).
4. **Manejo offline en la tablet.** Entrevista presencial en una fábrica con mala señal. Falta: cola local (IndexedDB), captura de audio local, sync diferido, indicador de estado de conexión.
5. **Rate limiting** en los endpoints que llaman a la API de Claude (Protocolo Maestro Bloque 6). El motor de turno se llama 8–15 veces por diagnóstico; endpoint autenticado + límite por diagnóstico.
6. **Auditoría de prompts.** No se guarda qué versión de la matriz / del system prompt produjo cada resultado. Agregar `prompt_version` + `modelo` + `tokens_in/out` por llamada (turno y síntesis).
7. **Modelo de IA por motor.** Pendiente explícito en `system-prompts-b.md`. Recomendación: turno = `claude-haiku-4-5` (baja latencia, corre 8–15×), síntesis = `claude-opus-5` o `claude-sonnet-5` (razonamiento pesado, corre 1×). Salidas estructuradas vía `output_config.format` (JSON schema), no parsing manual.
8. **Entrega del informe a la empresa.** `boceto-version-b.html` tiene "Aprobar y enviar a la empresa" pero no está modelado: falta `INTERVENCIÓN_PROPUESTA.aprobada_at`, `enviada_at`, destinatario, y el artefacto (PDF/enlace) que recibe el cliente.
9. **Retención concreta de `RESPUESTA_CRUDA`.** `modelo-datos` lo deja como "decisión legal previa a producción". Hay que fijar los días antes del deploy (más corto en A, más largo en B).
10. **3+ co-dominantes.** El modelo económico ajustado (Caso 2) y la intervención bifocal sólo contemplan **dos** fenómenos co-dominantes. Si la síntesis produce A⊥B, B⊥C, A⊥C, no hay regla. Acotar en el prompt (máx. 2 frentes; el 3.º va a observación) o generalizar la fórmula de `peso_i`.
11. **Auth entre dos proyectos Supabase.** Con EC como proyecto propio, el Counselor necesita cuenta en el proyecto EC. Definir: login propio de EC (simple, 3–5 counselors) vs SSO con Newen. Recomendado v1: login propio de EC con Supabase Auth (email + OTP), rol `counselor` / `admin`.
12. **Gestión del texto de consentimiento.** No hay entidad que lo versione. Agregar tabla `consentimiento_textos` (versión, cuerpo, vigencia).

## 1.D — Mejoras sugeridas

- **Calcular el económico sólo al cierre**, derivando el factor de fricción de los fenómenos confirmados (resuelve B1 + I2 de una).
- **Fusionar la clasificación `DOMINANTE` en una sola función pura** compartida por A y por el "Caso 1" de B (misma tabla de normalización, mismos umbrales, mismo archivo de config).
- **Versionar la matriz diagnóstica y los prompts como código**: un único archivo fuente (`matriz.config.ts` / `.json`) del que se genera el bloque `[CONTEXTO COMÚN]` de ambos system prompts. Evita que matriz y prompt se desincronicen (hoy ya hay diferencias menores de redacción entre `matriz-diagnostica-ec.md` y los `system-prompts-*`).
- **Definir las 4 visualizaciones del Mapa EC** (Caso 1 dominante / Caso 2 `⊥` co-dominante / Caso 3–4 circuito con nodos y flechas). Ya está anotado como pendiente en `matriz-diagnostica-ec.md`; conecta con el boceto de UI de la tablet.
- **Guardar el "porqué" de cada clasificación de relación** (`RELACIÓN_FENÓMENO.evidencia_soporte`) ya está en el modelo — bien; extenderlo a un `razonamiento` corto también en `FENÓMENO_DETECTADO` para trazabilidad completa.
- **Control del Counselor sobre el cierre**: además del "el motor detecta que no quedan fenómenos", que el Counselor pueda cerrar en cualquier momento (ya está en `arquitectura-tecnica-b.md` §Disparador — mantenerlo explícito en la UI).

## 1.E — Motor de preguntas adaptativas: amplitud y profundidad (base: Jordi Alemany, *La posición más jodida del organigrama*)

**El problema en los MD actuales.** La matriz da 1 pregunta genérica por condición y ~4 por
fenómeno (≈20 preguntas-plantilla en total). Alcanza para *clasificar*, pero no para un
diagnóstico "ajustado": la IA elige dentro de un puñado de opciones y la entrevista se aplana.
Para los clientes de EC (empresas medianas y grandes) el objetivo real es **la capa de mandos
intermedios**, y ahí hace falta un espacio de indagación mucho más rico.

**Encaje con Alemany.** El libro describe la posición del mando intermedio como estructuralmente
imposible: "bisagra humana" entre el martillo de arriba y el yunque de abajo; toda la
responsabilidad, poca autonomía; el único eslabón que traduce estrategia en resultados "sin
romper a las personas". Causas raíz que nombra: sobrecarga estructural (≈7 reuniones/día, ≈120
mails/día, doble presión), 82 % promovidos a gestión sin formación de liderazgo, demandas
contradictorias (líder + gestor, empatía + resultados, pensar crítico + no cuestionar), soledad
del rol, y que ~70 % del compromiso del equipo depende del mando directo. El test FAUNA cruza
"Ganas" (motivación/energía) × "Canas" (antigüedad/experiencia) → 4 perfiles de riesgo de burnout.
Ese marco mapea casi 1:1 con los 5 fenómenos de EC pero los reordena: **"mandos medios" no es un
fenómeno más — es la capa por la que pasan los otros cuatro** (el clima se hace o se rompe ahí;
la sobrecarga se acumula ahí; la ambigüedad estructural aterriza ahí; las transiciones se
absorben ahí).

**Cambio de diseño: la "Mapa de Indagación EC" — 3 niveles en vez de una lista plana:**

1. **Fenómeno** (los 5 actuales — se mantienen como capa de mapeo a indicador económico e
   intervención EC).
2. **Mecanismo / hilo de indagación** (NUEVO — 6 a 12 por fenómeno). Cada hilo trae:
   *señales de evidencia* (qué frases/hechos del entrevistado lo activan); *preguntas-semilla* en
   varios registros (directo, narrativo, contrafáctico, contraste temporal, cambio de
   perspectiva) — no para leer literal, sino como material del que la IA compone; *ángulos de
   profundización* (laddering arriba/abajo); *ramas de desambiguación* ("si responde X → seguir
   por acá; si Y → por allá").
   Hilos bajo "mandos medios" (Alemany + psicología organizacional): decodificación de la
   estrategia (llega la decisión, no el porqué) · responsabilidad sin autoridad · el sándwich /
   doble presión · promoción sin formación (el mejor técnico pasa a jefe) · duelo del rol
   técnico · soledad del rol / sin pares · fragmentación del tiempo y modo reactivo ·
   micromanagement como respuesta a la inseguridad · mensajes contradictorios de dirección (doble
   vínculo) · el mando como amortiguador de disfunción · seguridad psicológica que se erosiona y
   cascadea al equipo · techo de carrera / sin horizonte. (Los otros 4 fenómenos reciben el mismo
   tratamiento de hilos.)
3. **Condición** (evidencia / recurrencia / consecuencia / hipótesis) — ortogonal: define el
   *propósito* de la próxima pregunta, no su contenido.

**La IA compone, no elige de una lista.** El system prompt del motor de turno lleva la Mapa de
Indagación completa como material de referencia + instrucciones generativas:
- redactar la pregunta **nueva**, en el vocabulario del propio entrevistado, apuntando a
  `{mecanismo × condición faltante}`;
- calibrada a sector/tamaño/rol (en manufactura el mando es el jefe de turno; en servicios
  profesionales el team lead; a más capas jerárquicas, más pérdida en la traducción);
- registro EC: cálido, no clínico, sin jerga diagnóstica;
- las 2–3 `sugerencias_pregunta` que devuelve deben perseguir **hilos o ángulos distintos**, no
  ser paráfrasis entre sí → el Counselor tiene elección real.

**Mecanismos de profundidad codificados en el prompt (para que no sea superficial):**
- **Laddering means-end**: tras un hecho concreto, subir ("¿y eso qué te impide hacer?", "¿qué se
  pone en juego?") hasta el mecanismo, o bajar ("un ejemplo de esta semana") hasta la evidencia.
- **Sondas de contraste temporal**: "comparado con hace un año", "¿cuándo empezó a cambiar?" →
  alimenta recurrencia y detección de circuitos.
- **Cambio de perspectiva**: "¿cómo lo contaría tu equipo?", "¿y dirección cómo lo ve?" → hace
  aflorar el sándwich y el doble vínculo.
- **Forzar especificidad**: nunca marcar `evidencia` con una generalidad; exigir un caso reciente
  y concreto (quién/cuándo/dónde/con qué frecuencia).
- **Reformular y confirmar**: la IA propone una reformulación de una línea para que el Counselor
  la diga en voz alta y confirme la `hipótesis` sin inducirla.

**Adaptividad más allá de los 5 fenómenos**: la IA puede etiquetar evidencia a un *mecanismo*
aunque el fenómeno padre no sea el que está en curso, y abrir un hilo nuevo a mitad de entrevista.
Un rasgo tipo FAUNA (mando veterano desmotivado vs mando nuevo desbordado) se captura como
atributo emergente en la evidencia y modula intensidad/confianza y la intervención propuesta.

**Selección del próximo hilo por ganancia de información**, no por orden: elegir el hilo que más
reduce la incertidumbre sobre qué fenómeno/mecanismo domina — así el espacio grande de hilos
convive con la disciplina de 8–15 preguntas.

**Anti-patrones como reglas "Nunca"**: sin preguntas inductoras; sin jerga; una sola idea por
pregunta; un solo mecanismo por pregunta; no preguntar por la relación entre fenómenos (eso es
síntesis); no aceptar opinión donde hace falta un hecho; no re-preguntar lo ya evidenciado.

**Gobernanza**: la Mapa de Indagación es un artefacto de contenido versionado
(`mapa-indagacion.config`), redactado con EC (Ari) y revisado contra el marco de Alemany y
fuentes de psicología organizacional; cada diagnóstico sella `mapa_indagacion_version`. Se amplía
sin tocar código.

**Bucle de calidad**: registrar qué preguntas generadas usó / descartó / reformuló el Counselor
(vía `LLAMADA_IA` + un flag por sugerencia) y usar eso para calibrar la Mapa y el prompt — los MD
ya dicen que los prompts son borrador a ajustar con casos reales.

---

# PARTE 2 — Arquitectura de la app de tablet

## 2.1 — Stack

Consistente con el Protocolo Maestro y con Newen:

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) — PWA instalable en la tablet |
| UI | React 19 + TypeScript 5, Tailwind 4 |
| DB / Auth | **Proyecto Supabase propio de EC** (Postgres + Auth + RLS + `pgcrypto`) |
| IA | API propia (Next.js Route Handlers) → API de Claude, patrón BFF. Turno: `claude-haiku-4-5`. Síntesis: `claude-opus-5`. Salidas estructuradas con `output_config.format`. |
| STT | Proveedor externo (a elegir: Deepgram / AssemblyAI / Azure) vía **token efímero** acuñado por el backend |
| Deploy | Vercel (proyecto separado del de Newen) |
| Integración Newen | Supabase `Wrappers` (`postgres_fdw`) — Newen lee vistas de solo lectura de EC |
| Rate limit | Upstash Redis (free) en los endpoints que llaman a Claude |

## 2.2 — Topología de datos (2 proyectos Supabase)

```
Proyecto EC (nuevo)                          Proyecto Newen (existente)
├── auth.users (counselors EC)               ├── organizations / organization_clients / ...
├── empresa, diagnostico, respuesta_cruda,   │
│   fenomeno_detectado, relacion_fenomeno,   │
│   reversibilidad, perdida_economica,       │
│   intervencion_propuesta, datos_economicos │
├── ROL Postgres de solo lectura  ───────────┤  Wrappers / postgres_fdw
└── esquema `ec_publico` (VISTAS):            │  importa esquema foráneo →
    v_diagnostico, v_perdida_economica,      │  tablas foráneas read-only
    v_intervencion_propuesta         ────────►  consumibles desde app/(empresa)
    (NO expone respuesta_cruda)               │
```

- En EC: rol Postgres `newen_reader` con `SELECT` **sólo** sobre el esquema `ec_publico` (vistas), nunca sobre tablas base. RLS en todas las tablas base desde el minuto 0.
- En Newen: `CREATE EXTENSION wrappers`, servidor FDW con las credenciales de `newen_reader`, `IMPORT FOREIGN SCHEMA ec_publico`. Cuidado con RLS: el FDW consulta con los permisos del rol, no respeta RLS de EC automáticamente → el control es rol + vista, no RLS.
- `respuesta_cruda` (transcripciones, evidencia con nombres) **nunca** sale del proyecto EC.

## 2.3 — Autenticación

- Login propio de EC (Supabase Auth, email + OTP / magic link). Rol en `users.rol`: `counselor` | `admin`.
- Protección de rutas por server layout con `getUser()` (no `getSession()`), igual que Newen.
- La tablet queda logueada; timeout de inactividad configurable (reusar patrón `InactivityTimer` de anima-new / `useAutoLogout` de Newen).

## 2.4 — Captura de audio + STT

```
Tablet (mic, continuo)
  → chunks de audio → WebSocket al proveedor STT (con token efímero del backend)
  → transcripción parcial/final en vivo → se muestra en la columna "Transcripción"
  → se persiste como respuesta_cruda(modalidad='audio', transcripcion=texto,
                                     consentimiento_id=<evento inicial>)
  → Counselor marca "respuesta lista" → dispara POST /api/turno
```

- Endpoint `POST /api/stt/token` → acuña token de corta duración (BFF, key del proveedor server-side).
- Consentimiento: pantalla inicial obligatoria (`modo_captura='audio_transcrito'`), se registra `consentimiento(texto_version, timestamp, aceptado_por)`.
- **Fallback** (sin consentimiento / falla STT): el Counselor tipea notas cortas o marca chips → `respuesta_cruda(modalidad='texto')`. El motor de turno es idéntico (trabaja sobre texto).
- **Offline**: audio y respuestas se encolan en IndexedDB; se sincronizan al recuperar señal. El Mapa EC se marca "desactualizado" mientras haya cola pendiente.

## 2.5 — Motores de IA (BFF)

| Endpoint | Motor | Modelo | Cuándo | Entrada | Salida (JSON schema) |
|---|---|---|---|---|---|
| `POST /api/turno` | Motor de Turno | `claude-haiku-4-5` | tras cada "respuesta lista" (8–15×) | respuesta nueva + estado de los 5 fenómenos + nº de preguntas | `fenomenos_actualizados`, `accion` (cerrar/saltar/profundizar), `fenomeno_siguiente_prioridad`, `sugerencias_pregunta[]` |
| `POST /api/sintesis` | Motor de Síntesis | `claude-opus-5` | 1× al cerrar | todos los fenómenos confirmados + cadenas + evidencia cruda | `relaciones[]`, `caso` (1–4), `intervenciones[]`, `punto_accesibilidad` |
| (código, sin IA) | Motor Económico | — | 1× al cerrar | `datos_economicos` + fenómenos confirmados + reversibilidad | `perdida_economica` (presentismo, rotación, total, reducción ajustada por caso, ROI como **rango**) |
| `POST /api/sintesis/mensaje` | Redacción de cierre | `claude-haiku-4-5` | 1× | `resultado_tipo` + fenómeno dominante | `mensaje_cierre` |

- Prompt del sistema generado desde el archivo `matriz.config` versionado. Se guarda `prompt_version` por llamada.
- `output_config.format` con el JSON schema de cada motor → validación en la capa de la API, el modelo reintenta si no valida.
- Adaptive thinking (`thinking: {type: "adaptive"}`) en síntesis; efforts: turno `low`, síntesis `high`.
- Rate limit por `diagnostico_id` y por counselor.

## 2.6 — Seguridad (checklist Protocolo Maestro, Bloque 0)

- **SECRETOS**: keys de Claude / STT sólo en `process.env` del backend. `NEXT_PUBLIC_*` sólo para la anon key de EC.
- **BFF**: la tablet nunca llama a Claude ni al STT con credencial permanente (token efímero para STT).
- **RLS**: todas las tablas base de EC con política desde la migración inicial. Counselor ve sólo diagnósticos propios / de su organización EC.
- **ENCRIPTACIÓN**: `pgcrypto` sobre `respuesta_cruda.texto`, `respuesta_cruda.transcripcion`, y campos con personas nombradas en `fenomeno_detectado` / `relacion_fenomeno.evidencia_soporte`.
- **POOLING**: pgbouncer (transaction mode) en las Route Handlers serverless.
- **AUTH**: `getUser()` server-side, nunca confiar en el cliente.
- **RATE LIMIT**: Upstash en `/api/turno`, `/api/sintesis`, `/api/stt/token`.
- **Protocolo de crisis**: detección en el motor de turno (bandera `alerta_seguridad`) → aviso al Counselor + no persistir el fragmento sensible en claro.
- **CORS** sólo al dominio de la tablet. **Zod** en el edge antes de tocar DB.

---

# PARTE 3 — Modelo de datos EC (ajustes sobre `modelo-datos-ec-v1.md`)

Se implementa el esquema del MD con estos cambios (derivados de la Parte 1):

- `EMPRESA`: agregar `organization_client_id UUID NULL` (FK lógico al proyecto Newen, se completa después).
- `DIAGNÓSTICO`: agregar `prompt_version TEXT`, `resultado_tipo` amplía enum con `DOMINANTE_DEBIL` (B3).
- `DATOS_ECONÓMICOS`: `respuestas de los 3 ejes` pasa a **opcional**; agregar `factor_friccion_derivado NUMÉRICO` (calculado desde fenómenos confirmados, B1).
- `FENÓMENO_DETECTADO`: `condición_*` = `boolean`; agregar `nota_condicion TEXT` para el "parcial" (I1); agregar `razonamiento TEXT`; agregar `mecanismos JSONB` (lista de mecanismos/hilos detectados con su evidencia — nivel 2 de la Mapa de Indagación, 1.E) y `perfil_mando TEXT` (lectura tipo FAUNA emergente).
- `DIAGNÓSTICO`: agregar `mapa_indagacion_version TEXT` (1.E).
- `RESPUESTA_CRUDA`: agregar `mecanismo_asociado TEXT` (a qué hilo aporta evidencia, además del fenómeno).
- Config versionada (no DB): `mapa-indagacion.config` — fenómenos → mecanismos/hilos (señales, preguntas-semilla, ángulos de profundización, ramas de desambiguación). Es la fuente del bloque de referencia del system prompt del motor de turno (1.E).
- `RESPUESTA_CRUDA`: `consentimiento_audio` deja de ser campo suelto → FK `consentimiento_id` a la nueva tabla `CONSENTIMIENTO`; campos de texto cifrados con `pgcrypto`; agregar `alerta_seguridad BOOLEAN`.
- Nueva tabla `CONSENTIMIENTO` (id, diagnóstico_id, texto_version, cuerpo_hash, aceptado_por, timestamp).
- Nueva tabla `LLAMADA_IA` (diagnóstico_id, tipo `turno|sintesis|mensaje`, modelo, prompt_version, tokens_in, tokens_out, latencia_ms, timestamp) — auditoría y costo.
- `REVERSIBILIDAD`: renombrar `plazo_esperado` → `plazo_aparicion_efecto`; `INTERVENCIÓN_PROPUESTA.horizonte_temporal` → `horizonte_proyeccion` (I6).
- `INTERVENCIÓN_PROPUESTA`: agregar `aprobada_at`, `enviada_at`, `artefacto_url` (gap 8).
- Config versionada (no DB): tabla de normalización `intensidad/confianza → 0–1`, umbrales `0.60/0.15`, tabla `fenómeno → Δfactor_fricción`.
- Vistas `ec_publico.v_*` para el FDW (sólo `diagnostico`, `perdida_economica`, `intervencion_propuesta`).

Migraciones numeradas en `/supabase/migrations`, idempotentes, RLS en la misma migración que crea cada tabla.

---

# PARTE 4 — Pantallas / flujo de la tablet

Basado en `boceto-version-b.html` (4 pantallas: Inicio → Conversación → Resultado → Intervención),
con estas correcciones:

1. **Inicio / datos + consentimiento**
   - Datos de la empresa (crea/selecciona `EMPRESA` de EC): nombre, sector, N, S, R.
   - Los 3 ejes de fricción: opcionales (o se omiten y el factor se deriva al cierre).
   - Pantalla de **consentimiento de audio** (obligatoria si `modo_captura='audio_transcrito'`): texto versionado, tap de aceptación del entrevistado → registra `CONSENTIMIENTO`.

2. **Conversación (el copiloto en vivo)**
   - Columna izquierda: transcripción en vivo (STT). Botón **"Respuesta lista → analizar"**.
   - Columna derecha: **Mapa EC en construcción** — chips de los 5 fenómenos con estado (`confirmado` / `en observación` / `sin evidencia`), intensidad y confianza (B muestra ambas).
   - Franja inferior: 2–3 **sugerencias de próxima pregunta** (el Counselor las usa o las ignora).
   - Indicador de conexión / cola offline. Botón **"Cerrar diagnóstico"** siempre disponible.
   - Si el motor devuelve `alerta_seguridad`: banner discreto para el Counselor.

3. **Resultado (Mapa EC final)**
   - Fenómenos confirmados con mecanismo → consecuencia → indicador económico.
   - **Relación entre fenómenos** con la visualización según `caso`:
     - Caso 1: un nodo dominante.
     - Caso 2: `A ⊥ B` co-dominantes (dos frentes).
     - Caso 3–4: grafo con nodos + flechas (circuito hipotético / confirmado) + punto de accesibilidad.
   - **Pérdida económica**: separar visualmente las 3 capas del MD — *lo que sabemos* (fenómenos + N/S/R), *lo que estimamos* (presentismo/rotación/total, cifra firme), *lo que proyectamos* (reducción/ROI, **siempre como rango** con nota "sin validar").

4. **Intervención propuesta**
   - Uno o dos frentes (o el punto de accesibilidad si es circuito), con traducción humana + reversibilidad (rango `grado_temprano`–`grado_tardio`, no cifras categóricas — corrige lo que `matriz` marca como inconsistente en el boceto de B).
   - Horizonte 6/12/24 meses como **rangos**.
   - Acciones del Counselor: **Editar propuesta** / **Aprobar** / **Enviar a la empresa** (marca `aprobada_at` / `enviada_at`, genera `artefacto_url`).

Diseño visual: paleta EC ya definida (`--ec-ac #c4a87e`, grises `--g0..g5`, serif Cormorant/Georgia) — reutilizar de `espacio-critico-maqueta.html` y `empresa.module.css` de Newen para consistencia (Bloque 9 del Protocolo).

---

# PARTE 5 — Integración con el dashboard de Newen

1. **Lectura en vivo (FDW)**: `app/(empresa)` de Newen gana una sección "Diagnóstico EC" por cliente,
   que lee `ec_publico.v_diagnostico` / `v_perdida_economica` / `v_intervencion_propuesta` mediante
   las tablas foráneas. Match por `EMPRESA.organization_client_id`.
2. **Alimenta la Fase 1**: cuando un diagnóstico EC se cierra y se vincula a un `organization_client`,
   su resultado (fenómeno dominante, pérdida estimada, intervención propuesta) se muestra como el
   contenido de la Fase 1 (Diagnóstico) del ciclo de 6 fases, sin reemplazar ese ciclo.
3. **Derivaciones individuales**: si en la entrevista surge un caso personal, el flujo ya existe en
   Newen (`organization_derivaciones` → counselor). EC no lo re-implementa; a lo sumo deja una nota.
4. **Lo que NO se expone**: `respuesta_cruda` (transcripciones, evidencia con nombres). Newen nunca
   la ve — sólo estado, pérdida e intervención.
5. Alternativa/complemento por webhook (n8n) sólo si se quiere notificar a Newen en el cierre; no es
   necesario para v1 porque el FDW da lectura en tiempo real.

---

# PARTE 6 — Fases de construcción

| Fase | Entregable | Depende de |
|---|---|---|
| 0 | Proyecto Supabase EC + proyecto Vercel EC + repo. Ramas `dev`/`main`. Keep-alive n8n. | decisiones tomadas |
| 1 | `matriz.config` versionada (fenómenos, 4 condiciones, tabla de normalización, umbrales, Δfactor). Generador del `[CONTEXTO COMÚN]`. Resuelve B1, B2, B3, I1. | Fase 0 |
| 1b | **`mapa-indagacion.config`** (1.E): 6–12 hilos por fenómeno con señales, preguntas-semilla multi-registro, ángulos de laddering y ramas de desambiguación. Redactada con Ari + revisada contra Alemany. Prompt del motor de turno reescrito con: material de referencia (la Mapa) + instrucciones generativas + mecanismos de profundidad + anti-patrones "Nunca". | Fase 1 |
| 2 | Migraciones DB (Parte 3) + RLS + `pgcrypto` + vistas `ec_publico`. | Fase 1 |
| 3 | Auth EC + shell de la tablet + pantalla Inicio/datos/consentimiento. | Fase 2 |
| 4 | Motor de Turno (`/api/turno`) con salida estructurada + estado de fenómenos/mecanismos + rate limit. **Eval de amplitud/profundidad**: correr contra 3–4 transcripciones ficticias de mandos intermedios (casos tipo Alemany) y revisar con Ari que las preguntas generadas sean variadas, no inductoras, y que profundicen (laddering, contraste, cambio de perspectiva). Iterar `mapa-indagacion.config` + prompt. Modo texto, sin STT. | Fases 1, 1b |
| 5 | Pantalla Conversación + Mapa EC en construcción + control "respuesta lista" (B4). Modo texto. | Fases 3, 4 |
| 6 | STT en tiempo real: `/api/stt/token`, WebSocket, transcripción viva, persistencia, fallback, offline queue. | Fase 5 |
| 7 | Motor de Síntesis (`/api/sintesis`) + Motor Económico (código) + `resultado_tipo` + las 4 visualizaciones de caso. | Fase 4 |
| 8 | Pantallas Resultado + Intervención + aprobar/enviar + artefacto PDF. | Fase 7 |
| 9 | Integración Newen: FDW en el proyecto Newen + sección "Diagnóstico EC" en `app/(empresa)`. | Fase 2, 8 |
| 10 | Protocolo de crisis, auditoría (`LLAMADA_IA`), retención de `respuesta_cruda`, scanner de secretos, POST-DEPLOY CHECK. | todas |

## Verificación end-to-end

- **Motor de turno**: correr `/api/turno` con 8–15 transcripciones de un caso ficticio (p. ej. el de `boceto-version-b.html`: Manufacturas del Sur, mandos medios + desgaste) y verificar que los fenómenos evolucionan, que salta los sin evidencia, y que respeta el tope de 4/fenómeno.
- **Clasificación DOMINANTE / casos**: casos ficticios que fuercen `DOMINANTE_CONFIRMED`, `DOMINANTE_AMBIGUOUS`, `DOMINANTE_DEBIL`, `SIN_EVIDENCIA_SUFICIENTE`, y Casos 2/3/4 de síntesis. Verificar que la función pura de clasificación da lo esperado con la tabla de normalización elegida.
- **Motor económico**: con N/S/R conocidos, comparar `presentismo`/`rotación`/`total` contra el cálculo a mano de `matriz-diagnostica-ec.md`; verificar que la reducción se muestra como rango.
- **STT**: `browser-automation` skill sobre la tablet en `localhost`, hablar por el mic virtual, verificar transcripción viva y persistencia; cortar la red y verificar la cola offline.
- **RLS**: con dos counselors, verificar que uno no lee el diagnóstico del otro. Verificar que `newen_reader` NO puede `SELECT` sobre `respuesta_cruda`.
- **FDW**: desde el proyecto Newen, `SELECT` sobre `ec_publico.v_diagnostico` y ver el dato en `app/(empresa)`.
- **POST-DEPLOY CHECK** (Protocolo Bloque 8): `vercel curl` a `/login` → 200, framework preset = Next.js, sin errores 500 en logs.
- **Scanner de secretos** (GitGuardian/TruffleHog) antes de cada merge a `main`.

---

# Pendientes para definir con el usuario (no bloquean empezar)

1. **Proveedor de STT** (Deepgram vs AssemblyAI vs Azure Speech) — costo, latencia es-AR, residencia de datos.
2. **Modelo de síntesis**: `claude-opus-5` (mejor razonamiento) vs `claude-sonnet-5` (más barato).
3. **Tabla de normalización `intensidad/confianza → 0–1`** y recalibración de `0.60/0.15` — valores concretos (los del plan son un punto de partida).
4. **Días de retención de `respuesta_cruda`** (política legal previa a producción).
5. **Auth**: login propio de EC (recomendado v1) vs SSO con Newen.
6. **Texto de consentimiento de audio** (contenido legal) y quién lo aprueba.
7. **Costo del ROI**: ¿el `costo_intervención` es puntual o anual? (afecta I4).
8. **Contenido de la Mapa de Indagación** (1.E): sesión de trabajo con Ari para redactar los hilos por fenómeno a partir del libro de Alemany y del método EC; definir si el contexto del prompt de turno incluye la Mapa completa (más tokens, más amplitud) o un subconjunto por fenómeno en curso.
9. **¿Se mantienen los 5 fenómenos como capa top o se promueve "mandos medios" a lente principal** con los otros 4 como mecanismos que atraviesan esa capa? (afecta cómo se presenta el Mapa EC).
