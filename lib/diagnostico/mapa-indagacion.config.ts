/**
 * mapa-indagacion.config — El espacio de indagación del motor de turno (Versión B).
 *
 * 3 niveles: fenómeno → mecanismo/hilo → condición (spec/PLAN_APROBADO.md §1.E, DD-07).
 * Base: Jordi Alemany, "La posición más jodida del organigrama" + psicología
 * organizacional. Los otros 4 fenómenos reciben el mismo tratamiento de hilos.
 *
 * La IA NO elige de esta lista: la usa como material de referencia para COMPONER
 * la próxima pregunta, en el vocabulario del entrevistado, apuntando a
 * {mecanismo × condición faltante}.
 *
 * BORRADOR v0.1.0 — redactar y calibrar con Ari + casos reales. Sellado por
 * diagnóstico como `mapa_indagacion_version` (KY_MAPA_INDAGACION_VERSION).
 */

import type { FenomenoTipo, RegistroPregunta } from "./types.ts";

export const MAPA_INDAGACION_VERSION = "v0.1.0";

// ── Mecanismos de profundidad (van al system prompt del motor de turno) ────
export const MECANISMOS_PROFUNDIDAD: { nombre: string; instruccion: string }[] = [
  {
    nombre: "Laddering means-end",
    instruccion:
      'Tras un hecho concreto, subí ("¿y eso qué te impide hacer?", "¿qué se pone en juego ahí?") hasta el mecanismo, o bajá ("dame un ejemplo de esta semana") hasta la evidencia. Nunca te quedes en el nivel intermedio.',
  },
  {
    nombre: "Contraste temporal",
    instruccion:
      '"Comparado con hace un año", "¿cuándo empezó a cambiar?", "¿en qué momento se nota más?" — alimenta recurrencia y detección de circuitos (la evidencia temporal es la cronología narrada, no el reloj de las respuestas).',
  },
  {
    nombre: "Cambio de perspectiva",
    instruccion:
      '"¿Cómo lo contaría tu equipo?", "¿y dirección cómo lo ve?" — hace aflorar el sándwich y el doble vínculo del mando intermedio.',
  },
  {
    nombre: "Forzar especificidad",
    instruccion:
      "Nunca marques la condición 'evidencia' con una generalidad. Exigí un caso reciente y concreto: quién, cuándo, dónde, con qué frecuencia.",
  },
  {
    nombre: "Reformular y confirmar",
    instruccion:
      "Para confirmar la condición 'hipótesis' sin inducirla, proponé una reformulación de una línea para que el Counselor la diga en voz alta y el entrevistado la valide o corrija.",
  },
];

// ── Anti-patrones — reglas "Nunca" (van al system prompt) ─────────────────
export const ANTI_PATRONES: string[] = [
  "Nunca hagas preguntas inductoras (que sugieran la respuesta o el diagnóstico).",
  "Nunca uses jerga diagnóstica ni términos técnicos internos (intensidad, confianza, score, fenómeno, mecanismo).",
  "Nunca metas más de una idea o más de un mecanismo en una misma pregunta.",
  "Nunca preguntes por la relación entre fenómenos — eso es trabajo de la síntesis, no de la entrevista.",
  "Nunca aceptes una opinión general donde hace falta un hecho concreto.",
  "Nunca re-preguntes algo que ya está evidenciado.",
  "Nunca generes una pregunta abierta como primer contacto con un fenómeno nuevo (empezá por la de detección).",
  "Las 2–3 sugerencias que devolvés deben perseguir hilos o ángulos DISTINTOS entre sí, no ser paráfrasis.",
];

// ── Hilo de indagación (nivel 2) ─────────────────────────────────────────
export interface HiloIndagacion {
  id: string;
  nombre: string;
  /** El mecanismo organizacional que este hilo busca. */
  descripcion: string;
  /** Frases / hechos del relato del entrevistado que activan este hilo. */
  senales: string[];
  /** Material para componer preguntas — NO para leer literal. Por registro. */
  preguntas_semilla: Partial<Record<RegistroPregunta, string[]>>;
  /** Cómo profundizar (laddering) una vez que hay señal. */
  angulos_profundizacion: string[];
  /** Ramas: si el entrevistado responde X, seguir por Y. */
  desambiguacion: { si: string; entonces: string }[];
}

// ── HILOS por fenómeno ───────────────────────────────────────────────────
export const HILOS: Record<FenomenoTipo, HiloIndagacion[]> = {
  mandos_medios: [
    {
      id: "decodificacion_estrategia",
      nombre: "Decodificación de la estrategia",
      descripcion:
        "La decisión llega al piso sin el porqué; el mando tiene que reconstruir el sentido con información incompleta.",
      senales: [
        "se pierde en el camino",
        "llega distinto a como salió",
        "no sabemos bien para qué",
        "cada uno lo entiende a su manera",
      ],
      preguntas_semilla: {
        directo: [
          "Cuando baja una decisión de dirección, ¿llega con el motivo o solo la instrucción?",
        ],
        narrativo: [
          "Contame la última vez que tuviste que bajar una decisión que no terminabas de entender vos mismo.",
        ],
        contrafactico: [
          "Si esa decisión hubiera llegado con el porqué, ¿qué habría cambiado en cómo la ejecutaron?",
        ],
        contraste_temporal: [
          "¿Esto de que llegue sin contexto es nuevo o siempre fue así?",
        ],
      },
      angulos_profundizacion: [
        "¿En qué escalón puntual se pierde el porqué?",
        "¿Qué hacés cuando no lo entendés: preguntás, asumís, o lo bajás igual?",
      ],
      desambiguacion: [
        {
          si: "dice que sí llega el porqué pero no lo comparte hacia abajo",
          entonces: "explorar si es una decisión propia del mando (retención de información) o falta de tiempo/espacio",
        },
        {
          si: "dice que la decisión cambia de contenido, no solo de contexto",
          entonces: "profundizar en dónde y por quién se reinterpreta — apunta a la consecuencia (retrabajo)",
        },
      ],
    },
    {
      id: "responsabilidad_sin_autoridad",
      nombre: "Responsabilidad sin autoridad",
      descripcion:
        "Se le pide al mando que responda por resultados sin darle poder real de decisión sobre recursos, personas o prioridades.",
      senales: [
        "tengo que responder pero no puedo decidir",
        "para todo tengo que pedir permiso",
        "me hacen cargo pero no me bancan",
      ],
      preguntas_semilla: {
        directo: [
          "De las cosas por las que te miden, ¿cuántas podés decidir vos sin subir a pedir aval?",
        ],
        narrativo: [
          "Contame una situación reciente en la que tuviste que responder por algo que no dependía de vos.",
        ],
        cambio_perspectiva: [
          "Si le preguntara a tu equipo quién decide acá, ¿qué te parece que dirían?",
        ],
      },
      angulos_profundizacion: [
        "¿Qué recursos concretos (presupuesto, headcount, prioridades) están fuera de tu alcance?",
        "¿Qué te pasa cuando algo sale mal y no fue tu decisión?",
      ],
      desambiguacion: [
        {
          si: "describe que sí tiene autoridad formal pero no la ejerce",
          entonces: "cruzar con soledad_del_rol y micromanagement_defensivo (inseguridad, no falta de poder)",
        },
      ],
    },
    {
      id: "el_sandwich",
      nombre: "El sándwich / doble presión",
      descripcion:
        "El mando absorbe simultáneamente la presión de dirección (resultados) y la del equipo (demandas, protección, moral), sin lugar para procesarlas.",
      senales: [
        "estoy en el medio",
        "tierra de nadie",
        "los de arriba piden y los de abajo también",
        "soy el paragolpes",
      ],
      preguntas_semilla: {
        narrativo: [
          "Un día cualquiera, ¿cómo se reparte tu tiempo entre lo que te pide dirección y lo que te trae el equipo?",
        ],
        directo: [
          "Cuando dirección pide algo que el equipo no puede dar, ¿qué hacés con eso?",
        ],
        cambio_perspectiva: [
          "¿Dirección sabe lo que el equipo te trae a vos todos los días?",
        ],
      },
      angulos_profundizacion: [
        "¿Con quién procesás esa presión? ¿Hay alguien?",
        "¿Qué de lo que absorbés nunca llega a dirección?",
      ],
      desambiguacion: [
        {
          si: "dice que traslada todo hacia arriba sin filtrar",
          entonces: "explorar consecuencia: dirección lo ve como falta de gestión → tensión con doble_vinculo_direccion",
        },
        {
          si: "dice que contiene todo y no traslada nada",
          entonces: "cruzar con desgaste (amortiguador que se está agotando)",
        },
      ],
    },
    {
      id: "promocion_sin_formacion",
      nombre: "Promoción sin formación (el mejor técnico pasa a jefe)",
      descripcion:
        "Se ascendió por excelencia técnica, sin desarrollo en liderazgo; el rol de conducción se aprende sobre la marcha y a costa del equipo.",
      senales: [
        "me pusieron de jefe de un día para el otro",
        "nadie me explicó cómo se hace esto",
        "yo era el que mejor lo hacía",
        "aprendí a los golpes",
      ],
      preguntas_semilla: {
        directo: [
          "Cuando pasaste a conducir, ¿hubo algún tipo de acompañamiento o formación?",
        ],
        narrativo: [
          "¿Cómo fue el paso de hacer el trabajo a que otros lo hagan?",
        ],
        contrafactico: [
          "¿Qué te habría servido tener en ese momento que no tuviste?",
        ],
      },
      angulos_profundizacion: [
        "¿Qué parte del rol te sigue costando hoy?",
        "¿A quién le preguntás cuando no sabés cómo manejar una situación con una persona?",
      ],
      desambiguacion: [
        {
          si: "menciona que extraña hacer el trabajo técnico",
          entonces: "abrir el hilo duelo_rol_tecnico",
        },
        {
          si: "dice que compensa la falta de formación metiéndose en el detalle",
          entonces: "abrir micromanagement_defensivo",
        },
      ],
    },
    {
      id: "duelo_rol_tecnico",
      nombre: "Duelo del rol técnico",
      descripcion:
        "Pérdida de identidad y de la satisfacción del trabajo bien hecho con las propias manos; el rol de gestión no llena ese vacío.",
      senales: [
        "extraño cuando hacía",
        "ahora solo apago incendios",
        "no produzco nada tangible",
        "antes sabía si había hecho un buen día",
      ],
      preguntas_semilla: {
        directo: [
          "¿Qué extrañás del rol anterior, si extrañás algo?",
        ],
        contrafactico: [
          "Si mañana pudieras volver a hacer el trabajo técnico, ¿lo harías?",
        ],
      },
      angulos_profundizacion: [
        "¿Cómo sabés hoy si tuviste un buen día?",
        "¿Ese vacío afecta cómo estás con el equipo?",
      ],
      desambiguacion: [
        {
          si: "el duelo es fuerte y lo lleva a hacer el trabajo del equipo",
          entonces: "cruzar con micromanagement_defensivo y con desgaste",
        },
      ],
    },
    {
      id: "soledad_del_rol",
      nombre: "Soledad del rol / sin pares",
      descripcion:
        "El mando no puede mostrar vulnerabilidad hacia arriba (parecería no dar la talla) ni hacia abajo (bajaría la moral); queda sin espacio de contención.",
      senales: [
        "no tengo con quién hablar de esto",
        "no puedo mostrarme flojo",
        "mis pares son competencia",
        "me lo como solo",
      ],
      preguntas_semilla: {
        directo: [
          "Cuando algo del rol te pesa, ¿con quién lo hablás?",
        ],
        cambio_perspectiva: [
          "¿Tus pares de otras áreas están en la misma que vos, o cada uno rema para su lado?",
        ],
      },
      angulos_profundizacion: [
        "¿Hay algún espacio (formal o informal) de mandos donde se hable de cómo se está llevando el rol?",
        "¿Qué pasaría si le dijeras a tu jefe que estás desbordado?",
      ],
      desambiguacion: [
        {
          si: "dice que sí tiene con quién (un par, un mentor)",
          entonces: "bajar prioridad de este hilo; verificar si ese soporte es real o nominal",
        },
      ],
    },
    {
      id: "fragmentacion_tiempo",
      nombre: "Fragmentación del tiempo / modo reactivo",
      descripcion:
        "Agenda saturada de reuniones e interrupciones; no hay bloques de trabajo profundo; el mando vive apagando fuegos y nunca llega a lo importante.",
      senales: [
        "me la paso en reuniones",
        "no me alcanza el día",
        "lo importante siempre queda para después",
        "contesto mails hasta las 11 de la noche",
      ],
      preguntas_semilla: {
        directo: [
          "En una semana típica, ¿cuántas horas tenés sin reuniones para pensar o planificar?",
        ],
        contraste_temporal: [
          "¿Tu agenda estaba así de partida hace un año?",
        ],
        narrativo: [
          "Contame cómo terminó tu día de ayer respecto de lo que te habías propuesto a la mañana.",
        ],
      },
      angulos_profundizacion: [
        "¿Qué cosa importante no estás haciendo porque no tenés cuándo?",
        "¿Cuánto de tu trabajo real lo hacés fuera del horario?",
      ],
      desambiguacion: [
        {
          si: "la sobrecarga es de todo el equipo, no solo del mando",
          entonces: "abrir el fenómeno desgaste",
        },
        {
          si: "las reuniones son de coordinación por falta de claridad de roles",
          entonces: "cruzar con el fenómeno estructura",
        },
      ],
    },
    {
      id: "micromanagement_defensivo",
      nombre: "Micromanagement como respuesta a la inseguridad",
      descripcion:
        "Ante la inseguridad en el rol o el miedo al error propio, el mando se mete en el detalle del trabajo del equipo, no delega y genera cuello de botella.",
      senales: [
        "reviso todo antes de que salga",
        "si no lo hago yo no queda bien",
        "me cuesta soltar",
        "todo pasa por mí",
      ],
      preguntas_semilla: {
        directo: [
          "¿Qué cosas del trabajo del equipo revisás vos antes de que salgan?",
        ],
        cambio_perspectiva: [
          "Si le preguntara al equipo cuánta autonomía sienten que tienen, ¿qué dirían?",
        ],
        contrafactico: [
          "¿Qué tendría que pasar para que dejaras de revisar tanto?",
        ],
      },
      angulos_profundizacion: [
        "¿Qué te pasa cuando delegás y sale distinto a como lo harías vos?",
        "¿Esto genera demoras porque todo espera tu revisión?",
      ],
      desambiguacion: [
        {
          si: "el control es porque el equipo realmente no tiene la capacidad",
          entonces: "explorar si es un problema de formación del equipo o de selección — no es micromanagement defensivo",
        },
      ],
    },
    {
      id: "doble_vinculo_direccion",
      nombre: "Mensajes contradictorios de dirección (doble vínculo)",
      descripcion:
        "Dirección pide cosas mutuamente incompatibles (empatía y resultados, pensar crítico y no cuestionar, autonomía y control) sin reconocer la contradicción.",
      senales: [
        "me piden una cosa y la contraria",
        "que sea cercano pero que apriete",
        "que opine pero que no cuestione",
        "nunca sé con qué versión quedarme",
      ],
      preguntas_semilla: {
        narrativo: [
          "Contame una vez que dirección te pidió dos cosas que no podían convivir.",
        ],
        directo: [
          "¿Sentís que sabés qué se espera exactamente de vos en el rol?",
        ],
      },
      angulos_profundizacion: [
        "Cuando aparece esa contradicción, ¿podés nombrarla con tu jefe o te la arreglás solo?",
        "¿Qué versión termina ganando, y a costa de qué?",
      ],
      desambiguacion: [
        {
          si: "la contradicción viene de dos jefes distintos, no de uno",
          entonces: "cruzar con el fenómeno estructura (reporte matricial mal resuelto)",
        },
      ],
    },
    {
      id: "amortiguador_disfuncion",
      nombre: "El mando como amortiguador de la disfunción del sistema",
      descripcion:
        "Fallas estructurales, de procesos o de dotación se compensan con el esfuerzo personal del mando, que sostiene la operación a pulmón y oculta el problema de fondo.",
      senales: [
        "si no estoy yo se cae",
        "lo tapo con horas",
        "el sistema no da pero yo lo hago funcionar",
        "nadie ve lo que hay que hacer para que salga",
      ],
      preguntas_semilla: {
        contrafactico: [
          "Si te tomaras dos semanas de vacaciones sin contacto, ¿qué se rompería?",
        ],
        directo: [
          "¿Qué cosas hacés vos personalmente que en rigor debería resolver un proceso o un sistema?",
        ],
      },
      angulos_profundizacion: [
        "¿Dirección sabe cuánto de la operación depende de tu esfuerzo personal?",
        "¿Hace cuánto que esto es así?",
      ],
      desambiguacion: [
        {
          si: "lo que compensa es falta de claridad de roles",
          entonces: "abrir el fenómeno estructura",
        },
        {
          si: "lo que compensa es falta de dotación / carga excesiva",
          entonces: "abrir el fenómeno desgaste",
        },
      ],
    },
    {
      id: "seguridad_psicologica_cascada",
      nombre: "Erosión de la seguridad psicológica que cascadea al equipo",
      descripcion:
        "Si el mando no se siente seguro (para equivocarse, para plantear un problema), el equipo tampoco: se deja de avisar de los errores y los problemas aparecen tarde.",
      senales: [
        "acá los errores se ocultan",
        "nadie te avisa hasta que ya explotó",
        "mejor no plantear nada",
        "en la reunión nadie dice lo que piensa",
      ],
      preguntas_semilla: {
        directo: [
          "Cuando alguien de tu equipo comete un error, ¿te enterás a tiempo?",
        ],
        cambio_perspectiva: [
          "¿Tu equipo siente que puede decirte que algo no va a llegar sin que sea un problema?",
        ],
      },
      angulos_profundizacion: [
        "¿Y vos podés decirle a tu jefe que algo no va a llegar?",
        "¿Qué pasa la última vez que un problema apareció tarde?",
      ],
      desambiguacion: [
        {
          si: "el silencio del equipo viene de un conflicto interpersonal concreto",
          entonces: "abrir el fenómeno clima_vinculos",
        },
      ],
    },
    {
      id: "techo_carrera",
      nombre: "Techo de carrera / sin horizonte",
      descripcion:
        "El rol se aceptó como reconocimiento pero no abre camino; más presión y más horas a cambio de poco; se percibe como un 'regalo envenenado'.",
      senales: [
        "esto no lleva a ningún lado",
        "más quilombo por poca plata más",
        "acepté pensando que era un paso y me quedé acá",
        "ya no sé si quiero seguir de jefe",
      ],
      preguntas_semilla: {
        directo: [
          "¿Cómo ves tu recorrido de acá a dos o tres años en la empresa?",
        ],
        contrafactico: [
          "Sabiendo lo que sabés hoy, ¿aceptarías de nuevo el rol?",
        ],
      },
      angulos_profundizacion: [
        "¿Esa sensación afecta cuánto te involucrás hoy?",
        "¿Se lo planteaste a alguien?",
      ],
      desambiguacion: [
        {
          si: "la desmotivación es por el rol en sí, no por el horizonte",
          entonces: "revisar duelo_rol_tecnico y doble_vinculo_direccion",
        },
      ],
    },
  ],

  clima_vinculos: [
    {
      id: "conflicto_personalizado",
      nombre: "Conflicto personalizado (una persona/área recurrente)",
      descripcion:
        "El roce se concentra en una relación puntual que aparece una y otra vez en el relato.",
      senales: ["siempre es con", "el tema es fulano", "con esa área no va"],
      preguntas_semilla: {
        directo: ["¿Con qué persona o área aparece más seguido la fricción?"],
        narrativo: ["Contame la última vez que ese roce se puso en el medio de algo."],
      },
      angulos_profundizacion: [
        "¿Desde cuándo es así?",
        "¿Es con la persona o con el rol que ocupa?",
      ],
      desambiguacion: [
        {
          si: "el problema es el rol, no la persona (a cualquiera que lo ocupara le pasaría)",
          entonces: "abrir el fenómeno estructura",
        },
      ],
    },
    {
      id: "evitacion_de_contacto",
      nombre: "Evitación de contacto",
      descripcion:
        "Las partes dejan de hablarse directamente; todo pasa por mail, por un tercero o no pasa.",
      senales: ["ya ni nos hablamos", "todo por mail", "mando a otro a que hable"],
      preguntas_semilla: {
        directo: ["Cuando hay que coordinar con esa área, ¿cómo se hace hoy?"],
        contraste_temporal: ["¿Antes se hablaban distinto?"],
      },
      angulos_profundizacion: [
        "¿Qué se demora o se rompe por esa falta de contacto?",
      ],
      desambiguacion: [],
    },
    {
      id: "triangulacion",
      nombre: "Triangulación",
      descripcion:
        "Se habla del otro con terceros en vez de con el otro; el conflicto circula sin resolverse.",
      senales: ["todos lo comentan", "me lo dijo por atrás", "en el pasillo se dice otra cosa"],
      preguntas_semilla: {
        directo: ["Cuando alguien tiene un problema con otro, ¿lo habla de frente o lo comenta con vos?"],
      },
      angulos_profundizacion: ["¿Qué rol te toca a vos en esas conversaciones?"],
      desambiguacion: [],
    },
    {
      id: "herida_historica",
      nombre: "Herida histórica",
      descripcion:
        "Un hecho puntual del pasado (una promesa incumplida, una decisión vivida como traición) sigue condicionando la relación.",
      senales: ["desde aquella vez", "quedó picado de cuando", "nunca lo perdonó"],
      preguntas_semilla: {
        directo: ["¿Hay algo puntual que pasó y que todavía condiciona esa relación?"],
        narrativo: ["Contame qué fue lo que pasó."],
      },
      angulos_profundizacion: ["¿Alguna vez se habló de eso abiertamente?"],
      desambiguacion: [],
    },
    {
      id: "clima_de_silencio",
      nombre: "Clima de silencio",
      descripcion:
        "En las reuniones no se dicen las cosas; las discusiones reales ocurren en el pasillo.",
      senales: ["en la reunión nadie dice nada", "después en el pasillo sí", "todos se callan"],
      preguntas_semilla: {
        cambio_perspectiva: ["Si grabáramos una reunión y la comparáramos con lo que se dice después, ¿serían la misma conversación?"],
      },
      angulos_profundizacion: ["¿Qué pasa cuando alguien sí dice algo incómodo en la reunión?"],
      desambiguacion: [
        {
          si: "el silencio es transversal y viene de arriba",
          entonces: "cruzar con mandos_medios/seguridad_psicologica_cascada",
        },
      ],
    },
  ],

  desgaste: [
    {
      id: "erosion_progresiva",
      nombre: "Erosión progresiva",
      descripcion:
        "El deterioro es gradual y solo se nota al comparar con un punto anterior en el tiempo.",
      senales: ["cada vez peor", "no es de un día", "se fue acumulando"],
      preguntas_semilla: {
        contraste_temporal: ["¿Cómo llega la gente a un viernes hoy, comparado con hace un año?"],
      },
      angulos_profundizacion: ["¿En qué momento del año pasado empezaste a notar el cambio?"],
      desambiguacion: [],
    },
    {
      id: "licencias_ausentismo",
      nombre: "Licencias y ausentismo",
      descripcion: "Señal dura: aumento de licencias, sobre todo por salud, que antes no se veían.",
      senales: ["varias licencias", "carpetas médicas", "se enferman más", "pide días seguido"],
      preguntas_semilla: {
        directo: ["¿Cambió la cantidad de licencias en el último tiempo?"],
      },
      angulos_profundizacion: [
        "¿Se concentran en algún equipo o son parejas?",
        "¿Cómo cubren esas ausencias?",
      ],
      desambiguacion: [
        {
          si: "las licencias se concentran en un equipo con un jefe puntual",
          entonces: "cruzar con mandos_medios",
        },
      ],
    },
    {
      id: "presentismo_rinde_menos",
      nombre: "Presentismo (están pero no rinden)",
      descripcion: "La gente viene a trabajar pero la energía y la calidad bajaron.",
      senales: ["están de cuerpo presente", "rinden la mitad", "más errores que antes"],
      preguntas_semilla: {
        directo: ["Cuando la gente está cansada pero igual viene, ¿qué se nota en el trabajo?"],
      },
      angulos_profundizacion: ["¿Qué tipo de errores aparecieron que antes no?"],
      desambiguacion: [],
    },
    {
      id: "ironia_resignacion",
      nombre: "Ironía / resignación",
      descripcion: "El tono del relato (chistes amargos, 'es lo que hay') señala desgaste emocional.",
      senales: ["ya ni te enojás", "es lo que hay", "risa de costado", "para qué vas a decir nada"],
      preguntas_semilla: {
        cambio_perspectiva: ["¿Cómo hablan los del equipo de la carga cuando están entre ellos?"],
      },
      angulos_profundizacion: ["¿Esa resignación es nueva?"],
      desambiguacion: [],
    },
    {
      id: "carga_que_cambio",
      nombre: "Qué cambió en la carga",
      descripcion: "Identificar la fuente concreta del aumento: demanda, bajas no repuestas, procesos, alcance.",
      senales: ["nos sacaron gente", "el doble de trabajo", "sumaron clientes sin sumar gente"],
      preguntas_semilla: {
        directo: ["¿Qué cambió en la carga de trabajo en el último año?"],
      },
      angulos_profundizacion: [
        "¿Se repuso la gente que se fue?",
        "¿La demanda subió, o es la misma con menos manos?",
      ],
      desambiguacion: [],
    },
    {
      id: "recuperacion_ausente",
      nombre: "Recuperación ausente",
      descripcion: "No hay espacios reales de recuperación; el 'bienestar' es discurso sin descarga concreta.",
      senales: ["nos mandan un mail de bienestar y seguimos igual", "no hay respiro", "vacaciones que no cortás"],
      preguntas_semilla: {
        directo: ["¿Hay algún momento en el que el equipo realmente descansa de la presión?"],
      },
      angulos_profundizacion: ["¿Las vacaciones se toman y se cortan de verdad?"],
      desambiguacion: [],
    },
  ],

  transicion: [
    {
      id: "cambio_no_nombrado",
      nombre: "Cambio no nombrado",
      descripcion: "'Antes era distinto' — hay un antes y un después que la gente marca sin que nadie lo haya procesado.",
      senales: ["antes era otra cosa", "desde que cambió", "ya no es la empresa que era"],
      preguntas_semilla: {
        directo: ["¿Qué cambió en la organización en los últimos dos años que la gente todavía menciona?"],
      },
      angulos_profundizacion: ["¿Cómo se comunicó ese cambio en el momento?"],
      desambiguacion: [],
    },
    {
      id: "salida_de_referente",
      nombre: "Salida de un referente",
      descripcion: "Se fue alguien clave (un líder, un fundador, un histórico) sin un cierre y su ausencia sigue pesando.",
      senales: ["desde que se fue fulano", "quedó un vacío", "él sabía cómo se hacían las cosas"],
      preguntas_semilla: {
        narrativo: ["Contame cómo fue cuando esa persona se fue."],
      },
      angulos_profundizacion: [
        "¿Hubo algún momento de cierre, o un día simplemente no estaba más?",
        "¿Qué se llevó con ella que todavía falta?",
      ],
      desambiguacion: [
        {
          si: "lo que falta es conocimiento operativo concreto",
          entonces: "abrir perdida_de_conocimiento",
        },
      ],
    },
    {
      id: "fusion_reestructuracion",
      nombre: "Fusión / reestructuración",
      descripcion: "Un cambio estructural (compra, fusión, cambio de dueños, reorganización) no fue procesado colectivamente.",
      senales: ["cuando nos compró", "desde la fusión", "la reestructuración"],
      preguntas_semilla: {
        directo: ["¿Cómo se vivió ese cambio en el momento en que ocurrió?"],
      },
      angulos_profundizacion: ["¿Qué se esperaba que pasara y no pasó (o al revés)?"],
      desambiguacion: [],
    },
    {
      id: "perdida_de_conocimiento",
      nombre: "Pérdida de conocimiento",
      descripcion: "Con las personas que se fueron sin cierre se fue know-how que nadie documentó ni traspasó.",
      senales: ["nadie sabe cómo se hacía", "se fue con la persona", "reinventamos la rueda"],
      preguntas_semilla: {
        directo: ["¿Hay cosas que hoy cuestan más porque la persona que sabía ya no está?"],
      },
      angulos_profundizacion: ["¿Se intentó recuperar ese conocimiento de alguna forma?"],
      desambiguacion: [],
    },
    {
      id: "resistencia_sin_razon_operativa",
      nombre: "Resistencia sin razón operativa",
      descripcion: "Rechazo a lo nuevo que no se explica por eficiencia — es apego a lo que se perdió.",
      senales: ["no lo quieren usar", "siguen haciéndolo como antes", "resisten sin motivo claro"],
      preguntas_semilla: {
        directo: ["Cuando se propone una forma nueva de trabajar, ¿qué reacción aparece?"],
        contrafactico: ["Si lo nuevo fuera claramente mejor, ¿por qué te parece que igual cuesta?"],
      },
      angulos_profundizacion: ["¿Qué tenía lo de antes que lo nuevo no tiene?"],
      desambiguacion: [
        {
          si: "la resistencia es porque lo nuevo efectivamente funciona peor",
          entonces: "no es transición — es un problema de diseño del cambio",
        },
      ],
    },
  ],

  estructura: [
    {
      id: "ambiguedad_de_decision",
      nombre: "Ambigüedad de decisión",
      descripcion: "'¿Quién decide?' recibe respuestas distintas según a quién se le pregunte.",
      senales: ["depende", "no está claro", "cada uno te dice una cosa"],
      preguntas_semilla: {
        directo: ["¿Quién decide qué, cuando dos áreas necesitan lo mismo al mismo tiempo?"],
        narrativo: ["Contame la última vez que hubo que decidir algo y no estaba claro a quién le tocaba."],
      },
      angulos_profundizacion: ["¿Qué pasa mientras no está claro quién decide?"],
      desambiguacion: [
        {
          si: "la ambigüedad es entre dos jefes de un mismo mando",
          entonces: "cruzar con mandos_medios/doble_vinculo_direccion",
        },
      ],
    },
    {
      id: "duplicacion_de_trabajo",
      nombre: "Duplicación de trabajo",
      descripcion: "Dos áreas o personas hacen lo mismo sin saberlo, por límites de rol difusos.",
      senales: ["lo estábamos haciendo los dos", "nadie sabía que el otro también", "trabajo repetido"],
      preguntas_semilla: {
        directo: ["¿Pasa que dos áreas terminan haciendo lo mismo?"],
      },
      angulos_profundizacion: ["¿Cuánto tiempo se pierde por eso, aproximadamente?"],
      desambiguacion: [],
    },
    {
      id: "responsabilidad_diluida",
      nombre: "Responsabilidad diluida",
      descripcion: "Cuando algo sale mal, nadie se hace cargo porque no está claro de quién era.",
      senales: ["nadie se hace cargo", "era de todos y de nadie", "se tiran la pelota"],
      preguntas_semilla: {
        directo: ["Cuando algo falla y cruza dos áreas, ¿qué pasa después?"],
      },
      angulos_profundizacion: ["¿Se resuelve el problema o se discute de quién era?"],
      desambiguacion: [],
    },
    {
      id: "estructura_no_revisada",
      nombre: "Estructura no revisada",
      descripcion: "El organigrama y los roles no se tocan formalmente desde hace años, aunque la empresa cambió.",
      senales: ["hace años que es así", "nunca se revisó", "el organigrama es de otra época"],
      preguntas_semilla: {
        directo: ["¿Hace cuánto que la estructura no se revisa formalmente?"],
        contraste_temporal: ["¿La empresa de hoy es del mismo tamaño y forma que cuando se armó esa estructura?"],
      },
      angulos_profundizacion: ["¿Qué parte de la estructura quedó más desactualizada?"],
      desambiguacion: [],
    },
    {
      id: "roles_por_persona",
      nombre: "Roles diseñados alrededor de personas, no de funciones",
      descripcion: "El puesto se moldeó según quién lo ocupa; si esa persona se va, nadie sabe qué era el rol.",
      senales: ["ese puesto lo hizo fulano a su medida", "hace de todo un poco", "nadie más podría"],
      preguntas_semilla: {
        directo: ["¿Hay puestos que están definidos más por la persona que los ocupa que por la función?"],
      },
      angulos_profundizacion: ["¿Qué pasaría con ese rol si la persona se fuera mañana?"],
      desambiguacion: [
        {
          si: "esa persona es un mando que sostiene todo a pulmón",
          entonces: "cruzar con mandos_medios/amortiguador_disfuncion",
        },
      ],
    },
    {
      id: "cuellos_de_botella_decision",
      nombre: "Cuellos de botella de decisión",
      descripcion: "Todo sube a la misma persona para decidir; la organización se frena esperando su disponibilidad.",
      senales: ["todo pasa por", "hay que esperar a que esté", "sin su ok no se mueve nada"],
      preguntas_semilla: {
        directo: ["¿Hay decisiones que se frenan porque tienen que esperar a una sola persona?"],
      },
      angulos_profundizacion: ["¿Cuánto se demora en promedio esperando esa decisión?"],
      desambiguacion: [],
    },
  ],
};
