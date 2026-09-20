/**
 * cierre - orquestacion del cierre del diagnostico: sintesis + motor economico + mensaje.
 *
 * Puro salvo por el `ClienteModelo` inyectado. NO toca Supabase ni HTTP: el Route Handler
 * `/api/diagnostico/[id]/cerrar` carga el estado, llama a `ejecutarCierre` y persiste.
 *
 * Reglas duras (el modelo propone, el codigo dispone):
 *  - DD-11: con menos de N turnos no hay diagnostico (bloqueado, o cierre forzado SIN evidencia).
 *  - el `caso` lo calcula `clasificarCaso(relaciones)`, no el modelo.
 *  - relaciones e intervenciones solo sobre fenomenos CONFIRMADOS; maximo 2 frentes.
 *  - la reversibilidad se recorta a [0.20, 0.55] y se ordena (temprano <= tardio): el modelo
 *    no puede inflar las proyecciones.
 *  - si el modelo no devuelve una intervencion valida, se usa la de la matriz.
 */

import { clasificarCaso, clasificarDominante } from "../diagnostico/clasificador.ts";
import {
  CIRCUITO_ALCANCE_DEFAULT,
  FENOMENOS_DEF,
  MAX_FRENTES_INTERVENCION,
  REVERSIBILIDAD_LIMITES,
} from "../diagnostico/matriz.config.ts";
import { motorEconomico } from "../diagnostico/motor-economico.ts";
import {
  construirSystemPromptMensajeCierre,
  construirUserMessageMensajeCierre,
} from "../diagnostico/prompts/mensaje-cierre.ts";
import {
  construirSystemPromptSintesis,
  construirUserMessageSintesis,
} from "../diagnostico/prompts/motor-sintesis.ts";
import { evaluarCierre } from "../diagnostico/suficiencia.ts";
import type { EvaluacionCierre } from "../diagnostico/suficiencia.ts";
import type {
  CasoDiagnostico,
  ClasificacionDominante,
  DatosEconomicos,
  FenomenoDetectado,
  FenomenoTipo,
  HorizonteProyeccion,
  PlazoEfecto,
  RelacionFenomeno,
  ResultadoEconomico,
} from "../diagnostico/types.ts";
import type { ClienteModelo, UsoModelo } from "./tipos.ts";
import type { SintesisSalida } from "./validar.ts";

export interface EntradaCierre {
  /** Respuestas analizadas (filas de respuesta_cruda). */
  turnos: number;
  /** Estado final de los 5 fenomenos (con `mecanismos`). */
  fenomenos: FenomenoDetectado[];
  datos: DatosEconomicos;
  contexto_empresa: { nombre: string; sector: string | null; n: number | null };
  /** El Counselor acepta cerrar SIN diagnostico aunque falten turnos. */
  forzar_sin_diagnostico: boolean;
}

export interface ReversibilidadCierre {
  aplica_a: string; // `fenomeno:<tipo>` | `circuito`
  grado_temprano: number;
  grado_tardio: number;
  plazo_aparicion_efecto: PlazoEfecto;
  justificacion: string;
}

export interface IntervencionCierre {
  fenomenos_objetivo: FenomenoTipo[];
  descripcion: string;
  traduccion_humana: string;
  reversibilidad: ReversibilidadCierre;
  horizonte_proyeccion: HorizonteProyeccion;
  origen: "modelo" | "matriz";
}

export interface LlamadaCierre {
  tipo: "sintesis" | "mensaje";
  uso: UsoModelo;
}

export type ResultadoCierre =
  | { tipo: "bloqueado"; evaluacion: EvaluacionCierre }
  | {
      tipo: "sin_diagnostico";
      resultado_tipo: "SIN_EVIDENCIA_SUFICIENTE";
      motivo: "pocos_turnos" | "sin_fenomenos_confirmados";
      mensaje_cierre: string | null;
      llamadas: LlamadaCierre[];
    }
  | {
      tipo: "completo";
      clasificacion: ClasificacionDominante;
      caso: CasoDiagnostico;
      relaciones: RelacionFenomeno[];
      intervenciones: IntervencionCierre[];
      punto_accesibilidad: string | null;
      economico: ResultadoEconomico;
      mensaje_cierre: string | null;
      /** Ajustes que el codigo hizo sobre lo que devolvio el modelo (auditoria). */
      ajustes: string[];
      llamadas: LlamadaCierre[];
    };

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Recorta al rango creible de la matriz y ordena para que el rango no quede invertido. */
export function normalizarReversibilidad(temprano: number, tardio: number) {
  const a = clamp(temprano, REVERSIBILIDAD_LIMITES.min, REVERSIBILIDAD_LIMITES.max);
  const b = clamp(tardio, REVERSIBILIDAD_LIMITES.min, REVERSIBILIDAD_LIMITES.max);
  return { grado_temprano: Math.min(a, b), grado_tardio: Math.max(a, b) };
}

/** Intervencion de respaldo tomada de la matriz (cuando el modelo no aporta una valida). */
function intervencionDeMatriz(f: FenomenoTipo): IntervencionCierre {
  const d = FENOMENOS_DEF[f];
  return {
    fenomenos_objetivo: [f],
    descripcion: d.intervencion_ec,
    traduccion_humana: d.traduccion_humana_intervencion,
    reversibilidad: {
      aplica_a: `fenomeno:${f}`,
      grado_temprano: d.reversibilidad.grado_temprano,
      grado_tardio: d.reversibilidad.grado_tardio,
      plazo_aparicion_efecto: d.reversibilidad.plazo_aparicion_efecto,
      justificacion: d.reversibilidad.nota,
    },
    horizonte_proyeccion: "12m",
    origen: "matriz",
  };
}

async function mensaje(
  cliente: ClienteModelo,
  clasificacion: ClasificacionDominante,
  fenomenos: FenomenoDetectado[],
  llamadas: LlamadaCierre[],
): Promise<string | null> {
  try {
    const r = await cliente.mensajeCierre(
      construirSystemPromptMensajeCierre(),
      construirUserMessageMensajeCierre(clasificacion, fenomenos),
    );
    llamadas.push({ tipo: "mensaje", uso: r.uso });
    return r.datos.mensaje_cierre;
  } catch {
    return null; // el mensaje es accesorio: no debe impedir el cierre
  }
}

export async function ejecutarCierre(
  entrada: EntradaCierre,
  cliente: ClienteModelo,
): Promise<ResultadoCierre> {
  const evaluacion = evaluarCierre(entrada.turnos);
  const llamadas: LlamadaCierre[] = [];

  // DD-11: sin el minimo de turnos no hay diagnostico.
  if (!evaluacion.diagnostico_permitido) {
    if (!entrada.forzar_sin_diagnostico) return { tipo: "bloqueado", evaluacion };
    const clasif = clasificarDominante(entrada.fenomenos, { turnos: entrada.turnos });
    return {
      tipo: "sin_diagnostico",
      resultado_tipo: "SIN_EVIDENCIA_SUFICIENTE",
      motivo: "pocos_turnos",
      mensaje_cierre: await mensaje(cliente, clasif, entrada.fenomenos, llamadas),
      llamadas,
    };
  }

  const clasificacion = clasificarDominante(entrada.fenomenos, { turnos: entrada.turnos });
  const confirmados = entrada.fenomenos.filter((f) => f.estado === "confirmado");

  if (clasificacion.resultado_tipo === "SIN_EVIDENCIA_SUFICIENTE" || confirmados.length === 0) {
    return {
      tipo: "sin_diagnostico",
      resultado_tipo: "SIN_EVIDENCIA_SUFICIENTE",
      motivo: "sin_fenomenos_confirmados",
      mensaje_cierre: await mensaje(cliente, clasificacion, entrada.fenomenos, llamadas),
      llamadas,
    };
  }

  // Sintesis (1 llamada) + mensaje de cierre en paralelo: ambos dependen solo del estado.
  const evidencia: Record<string, string[]> = {};
  for (const f of confirmados) evidencia[f.fenomeno] = f.mecanismos.map((m) => `${m.hilo}: ${m.evidencia}`);

  const [sint, msj] = await Promise.all([
    cliente.sintesis(
      construirSystemPromptSintesis(),
      construirUserMessageSintesis({
        confirmados,
        evidencia_por_fenomeno: evidencia,
        contexto_empresa: entrada.contexto_empresa,
      }),
    ),
    mensaje(cliente, clasificacion, entrada.fenomenos, llamadas),
  ]);
  llamadas.push({ tipo: "sintesis", uso: sint.uso });

  const ajustes: string[] = [];
  const s: SintesisSalida = sint.datos;
  const idsConfirmados = new Set<FenomenoTipo>(confirmados.map((f) => f.fenomeno));

  // Relaciones: solo entre fenomenos confirmados y distintos.
  const relaciones: RelacionFenomeno[] = s.relaciones
    .filter((r) => r.fenomeno_a !== r.fenomeno_b && idsConfirmados.has(r.fenomeno_a) && idsConfirmados.has(r.fenomeno_b))
    .map((r) => ({ fenomeno_a: r.fenomeno_a, fenomeno_b: r.fenomeno_b, tipo: r.tipo, evidencia_soporte: r.evidencia_soporte }));
  if (relaciones.length !== s.relaciones.length) {
    ajustes.push(`${s.relaciones.length - relaciones.length} relación(es) descartada(s): involucraban fenómenos no confirmados.`);
  }

  // El caso lo decide el codigo. Con un solo fenomeno confirmado no puede haber relaciones ⇒ Caso 1.
  const caso: CasoDiagnostico = confirmados.length < 2 ? 1 : clasificarCaso(relaciones);
  if (s.caso !== caso) ajustes.push(`El modelo propuso el caso ${s.caso}; las relaciones clasificadas corresponden al caso ${caso}.`);

  // Intervenciones: max 2 frentes (1 en Caso 1 y en circuitos), solo sobre confirmados.
  const maxFrentes = caso === 2 ? MAX_FRENTES_INTERVENCION : 1;
  const dominante = clasificacion.fenomeno_dominante ?? confirmados[0].fenomeno;
  let intervenciones: IntervencionCierre[] = s.intervenciones
    .map((i): IntervencionCierre | null => {
      const objetivo = i.fenomenos_objetivo.filter((f) => idsConfirmados.has(f));
      if (objetivo.length === 0 || !i.descripcion.trim() || !i.traduccion_humana.trim()) return null;
      const rev = normalizarReversibilidad(i.reversibilidad.grado_temprano, i.reversibilidad.grado_tardio);
      if (
        rev.grado_temprano !== i.reversibilidad.grado_temprano ||
        rev.grado_tardio !== i.reversibilidad.grado_tardio
      ) {
        ajustes.push(`Reversibilidad de "${objetivo.join("+")}" recortada a ${REVERSIBILIDAD_LIMITES.min}–${REVERSIBILIDAD_LIMITES.max}.`);
      }
      return {
        fenomenos_objetivo: objetivo,
        descripcion: i.descripcion.trim(),
        traduccion_humana: i.traduccion_humana.trim(),
        reversibilidad: {
          aplica_a: caso >= 3 ? "circuito" : `fenomeno:${objetivo[0]}`,
          ...rev,
          plazo_aparicion_efecto: i.reversibilidad.plazo_aparicion_efecto,
          justificacion: i.reversibilidad.justificacion,
        },
        horizonte_proyeccion: i.horizonte_proyeccion,
        origen: "modelo",
      };
    })
    .filter((x): x is IntervencionCierre => x !== null);

  if (intervenciones.length > maxFrentes) {
    ajustes.push(`Se conservaron ${maxFrentes} frente(s) de intervención de ${intervenciones.length} propuestos.`);
    intervenciones = intervenciones.slice(0, maxFrentes);
  }
  if (intervenciones.length === 0) {
    const objetivos: FenomenoTipo[] = caso === 2 ? confirmados.slice(0, 2).map((f) => f.fenomeno) : [dominante];
    intervenciones = objetivos.map(intervencionDeMatriz);
    ajustes.push("El modelo no aportó una intervención válida: se usó la de la matriz.");
  }

  // Motor economico (codigo puro).
  const reversibilidadPorFenomeno: Partial<Record<FenomenoTipo, { grado_temprano: number; grado_tardio: number }>> = {};
  if (caso <= 2) {
    for (const i of intervenciones) {
      for (const f of i.fenomenos_objetivo) {
        reversibilidadPorFenomeno[f] = {
          grado_temprano: i.reversibilidad.grado_temprano,
          grado_tardio: i.reversibilidad.grado_tardio,
        };
      }
    }
  }
  const primera = intervenciones[0];
  const economico = motorEconomico({
    datos: entrada.datos,
    fenomenos: entrada.fenomenos,
    caso,
    horizonte: primera.horizonte_proyeccion,
    reversibilidadPorFenomeno,
    ...(caso >= 3
      ? {
          circuito: {
            alcance: CIRCUITO_ALCANCE_DEFAULT,
            grado_temprano: primera.reversibilidad.grado_temprano,
            grado_tardio: primera.reversibilidad.grado_tardio,
            hipotetico: caso === 3,
          },
        }
      : {}),
  });

  return {
    tipo: "completo",
    clasificacion,
    caso,
    relaciones,
    intervenciones,
    punto_accesibilidad: caso >= 3 ? s.punto_accesibilidad : null,
    economico,
    mensaje_cierre: msj,
    ajustes,
    llamadas,
  };
}
