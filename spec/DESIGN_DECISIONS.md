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

## DD-11 — Guardarraíles de suficiencia: nunca concluir con poca evidencia

- **Contexto**: en la prueba real con un modelo gratuito, UNA sola respuesta del entrevistado bastó
  para que el modelo marcara las 4 condiciones, `confirmado`, `severo` y confianza `alta`. Un
  diagnóstico así de apresurado dejaría la app obsoleta. Pedirle al prompt que "no lo haga" no alcanza:
  depende del modelo. Decisión de Ari: piso de 10 preguntas; se completó con un piso por fenómeno.
- **Elección**: reglas determinísticas que aplica el **código** sobre la salida del modelo
  (`lib/diagnostico/suficiencia.ts` + `lib/ia/guardarrailes.ts`; números en `GUARDARRAILES`):
  - **R1 — piso global**: antes del turno **10** ningún fenómeno queda `confirmado`, `fin_diagnostico`
    es `false`, y el cierre sólo puede dar `SIN_EVIDENCIA_SUFICIENTE` (sin económico ni intervención).
  - **R2 — piso por fenómeno**: su primer turno puede dar por cumplidas hasta **2** condiciones y cada
    turno propio siguiente **1** más ⇒ confirmar exige **≥ 3 turnos propios** y las 4 condiciones. Cae
    primero la hipótesis (la valida el entrevistado en un turno propio). Sin R2, R1 solo permitiría
    confirmar en el turno 10 con una única respuesta sobre ese fenómeno.
  - **R3 — confianza `alta`** sólo con **≥ 4** turnos propios; antes se baja a `media`.
  - Lo retenido conserva lo observado (`mecanismos`, condiciones recortadas) pero borra las
    conclusiones (`intensidad`, `confianza`, `mecanismo_organizacional`, `consecuencia_operativa`,
    indicador). Si la acción era `cerrar`, pasa a `profundizar`.
  - Doble defensa: `clasificarDominante(fenomenos, { turnos })` devuelve `SIN_EVIDENCIA_SUFICIENTE`
    con menos de 10 turnos aunque algún fenómeno figure como confirmado.
  - El prompt del turno declara las reglas y el user message informa `TURNO ACTUAL n (mínimo 10…)`,
    para que el modelo no las fuerce; el código las hace cumplir igual.
- **Alternativa descartada**: sólo el piso global. Insuficiente (ver R2).
- **Límite conocido**: los "turnos propios" se cuentan por `respuesta_cruda.fenomeno_asociado`, que guarda
  UN fenómeno por turno (el principal). Subcuenta los secundarios ⇒ el error es hacia el lado seguro
  (confirma menos). Se puede afinar con una columna `fenomenos_tocados text[]` si Ari lo pide.
- **Impacto**: `MATRIZ_VERSION` v0.2.0; `PRESUPUESTO.blando_min` pasa de 8 a 10 (los MD decían 8–15);
  `/api/turno` devuelve `progreso` y `avisos`; el endpoint de cierre DEBE usar `evaluarCierre()`.

## DD-12 — Integración con Newen: filtrar en origen, vincular en destino

- **Contexto**: Newen (B2C, producción) debe mostrar el resultado del diagnóstico por cliente sin exponer nunca lo que dijo la
  persona entrevistada, y sin poder ver borradores que el Counselor todavía no aprobó.
- **Elección**:
  - EC decide qué sale: las vistas `ec_publico.v_*` sólo devuelven diagnósticos cerrados con la propuesta **aprobada** (o
    cerrados sin evidencia). Sin `respuesta_cruda`, sin transcripciones, sin evidencia por hilo.
  - Conexión `postgres_fdw` con un rol de sólo lectura (`newen_reader`), por el **pooler en modo sesión**.
  - El vínculo cliente ↔ diagnóstico se guarda en **Newen** (`organization_client_ec`): la FDW es de sólo lectura.
  - En Newen las tablas foráneas viven en un esquema **privado** y sólo se leen por funciones `security definer` para
    `service_role`, porque las tablas foráneas **no soportan RLS**.
- **Alternativa considerada**: endpoint HTTP de KY consumido por Newen (más simple de operar: sin red de base de datos ni rol
  compartido). Se mantiene la FDW por la decisión inicial del plan; si la conexión entre proyectos resulta frágil, el cambio
  es acotado (las funciones de Newen devolverían lo que hoy leen de las tablas foráneas).
- **Impacto**: `0009`; el diagnóstico aparece en Newen recién cuando el Counselor aprueba la propuesta.

## DD-13 — Acceso con email + contraseña sobre una lista de habilitados que maneja el admin

- **Contexto**: el ingreso por código de un solo uso dependía del envío de mails de Supabase; el usuario pidió el patrón de Anima /
  LEX-AR (email + contraseña, con «crear cuenta»). Pero KY no puede tener registro abierto (cualquiera usaría la app, gastaría el crédito
  de IA y cargaría entrevistas; la anon key de Supabase es pública, así que esconder el botón no alcanza). Pidió además: **sin código de
  invitación; sólo los usuarios que el admin habilite con su mail corporativo en Supabase**.
- **Elección**:
  - **Lista de habilitados** = tabla `public.usuarios_habilitados` (email, nombre, rol, activo), editable desde el Table Editor. Es la
    ÚNICA fuente de verdad de quién entra y con qué rol (migración `0010`).
  - **Candado en la base**: un trigger `BEFORE INSERT` sobre `auth.users` rechaza crear cualquier usuario cuyo email no esté habilitado
    (por cualquier vía: la app, el dashboard o el registro público de Supabase) y le pone `app_metadata.ky_activo = true`
    (lo único que habilita el uso; `user_metadata`, que el usuario puede editar, NO sirve). Middleware y todas las rutas de escritura
    exigen la marca. Desactivar o borrar la fila la baja (la cuenta no se borra) y rige en el siguiente request. Rol y nombre de la lista
    se copian a `public.users`.
  - **«Crear cuenta» = pedir un link a la casilla**: `POST /api/acceso/enlace`. Si el email está habilitado, se crea la cuenta con una
    contraseña aleatoria que nadie conoce y Supabase manda a su casilla el link para elegir la suya (`/reset-password`). Sólo el dueño del
    mail puede fijar la contraseña ⇒ nadie puede «anotarse primero» con un email ajeno. Una cuenta previa SIN confirmar (p. ej. creada
    por fuera con contraseña de un atacante) se borra y se recrea. «Olvidé mi contraseña» es el mismo flujo.
  - Nunca se revela si un email está habilitado (respuesta única); límites: 8 pedidos/hora por IP y 3 links/hora por email.
  - Contraseña 8–72 caracteres (bcrypt ignora lo que pasa de 72 bytes).
  - **El link del mail NO usa `{{ .ConfirmationURL }}`** sino `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` (plantilla
    «Reset Password»). Motivos: (1) `ConfirmationURL` gasta el código en el primer GET y los escáneres de links de los servidores de mail
    (Zoho, Gmail, antivirus) lo abren antes que la persona; (2) devuelve la sesión en el `#hash` de la URL, que el cliente de navegador
    de `@supabase/ssr` (flujo PKCE) rechaza. `/reset-password` canjea el código con `verifyOtp` recién cuando la persona toca «Continuar»,
    y funciona desde cualquier dispositivo.
- **Alternativa descartada**: código de invitación compartido (primera versión de este DD): un secreto único para todos, sin
  trazabilidad por persona, y no prueba que el mail sea de quien se anota.
- **Recomendación operativa**: desactivar «Allow new users to sign up» en Supabase (ya no abre la app, pero evita ruido) y editar la
  plantilla «Reset Password» (asunto «Creá tu contraseña — KY»; el cuerpo, con el link de arriba, está en `supabase/plantilla-reset-password.html`).
- **Cómo habilitar a alguien**: `insert into public.usuarios_habilitados (email, nombre, rol) values ('ana@empresa.com','Lic. Ana Ferrer','counselor');`
  y esa persona entra a `/registro`. Reemplaza el OTP por mail (decisión abierta #5 cerrada).
- **Impacto**: cambia el login, el middleware y las 6 rutas de escritura; los scripts de prueba habilitan el email antes de crear el usuario.
