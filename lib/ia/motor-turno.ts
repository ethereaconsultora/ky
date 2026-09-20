/**
 * motor-turno - orquestacion del Motor de Turno (Version B).
 *
 * Puro salvo por el `ClienteModelo` inyectado y `process.env` (versiones).
 * NO toca Supabase, HTTP ni el SDK de Claude. El Route Handler `/api/turno`
 * (Fase 4) lo envuelve: auth, rate limit, persistencia de `respuesta_cruda` /
 * `fenomeno_detectado` / `llamada_ia`.
 */

import {
  construirSystemPromptTurno,
  construirUserMessageTurno,
  type EntradaTurno,
} from "../diagnostico/prompts/motor-turno.ts";
import { MAPA_INDAGACION_VERSION } from "../diagnostico/mapa-indagacion.config.ts";
import { MATRIZ_VERSION } from "../diagnostico/matriz.config.ts";
import type { FenomenoTipo } from "../diagnostico/types.ts";
import { aplicarGuardarrailes } from "./guardarrailes.ts";
import type { Correccion, Progreso } from "./guardarrailes.ts";
import { normalizarTranscripcion, sanearSugerencias } from "./normalizar.ts";
import { ErrorIA, type ClienteModelo } from "./tipos.ts";
import type { TurnoSalida } from "./validar.ts";

export interface EntradaMotorTurno extends Omit<EntradaTurno, "respuesta_nueva"> {
  /** Transcripcion cruda del ultimo turno del entrevistado (se normaliza aca). */
  respuesta_cruda: string;
}

export interface MetaLlamadaTurno {
  tipo: "turno";
  modelo: string;
  prompt_version: string;
  mapa_indagacion_version: string;
  tokens_in: number | null;
  tokens_out: number | null;
  latencia_ms: number;
  transcripcion_truncada: boolean;
  /** Cuantas correcciones de guardarrailes (DD-11) se aplicaron a la salida del modelo. */
  correcciones_guardarrailes: number;
}

export interface ResultadoMotorTurno {
  /** Salida del modelo YA pasada por los guardarrailes de suficiencia (DD-11). */
  salida: TurnoSalida;
  meta: MetaLlamadaTurno;
  /** Avance hacia el minimo de preguntas para poder concluir. */
  progreso: Progreso;
  /** Mensajes para el Counselor cuando se retuvo o recorto una conclusion. */
  avisos: string[];
  correcciones: Correccion[];
}

/** Version del prompt: fija por env para auditar; cae a la de la matriz. */
export function promptVersionTurno(): string {
  return process.env.KY_PROMPT_VERSION?.trim() || `matriz-${MATRIZ_VERSION}`;
}

export async function ejecutarTurno(
  entrada: EntradaMotorTurno,
  cliente: ClienteModelo,
): Promise<ResultadoMotorTurno> {
  const norm = normalizarTranscripcion(entrada.respuesta_cruda);
  if (norm.vacia) {
    throw new ErrorIA(
      "entrada_invalida",
      "La transcripcion del turno quedo vacia despues de normalizar.",
    );
  }

  const system = construirSystemPromptTurno();
  const user = construirUserMessageTurno({
    respuesta_nueva: norm.texto,
    fenomeno_en_curso: entrada.fenomeno_en_curso,
    estado_fenomenos: entrada.estado_fenomenos,
    preguntas_totales: entrada.preguntas_totales,
    contexto_empresa: entrada.contexto_empresa,
  });

  const { datos, uso } = await cliente.turno(system, user);

  // PSAI B4 - saneo de lo que vuelve al cliente.
  const sugerencias = sanearSugerencias(datos.sugerencias_pregunta);
  if (sugerencias.length < 2) {
    throw new ErrorIA(
      "salida_invalida",
      "El modelo devolvio menos de 2 sugerencias utiles tras el saneo.",
    );
  }

  // DD-11 - guardarrailes de suficiencia: el modelo propone, el codigo dispone.
  const turnosPropiosPrevios: Partial<Record<FenomenoTipo, number>> = {};
  for (const f of entrada.estado_fenomenos) turnosPropiosPrevios[f.fenomeno] = f.preguntas_hechas;
  const g = aplicarGuardarrailes(
    { ...datos, sugerencias_pregunta: sugerencias },
    { turnos: entrada.preguntas_totales + 1, turnosPropiosPrevios },
  );
  const salida: TurnoSalida = g.salida;

  return {
    salida,
    meta: {
      tipo: "turno",
      modelo: uso.modelo,
      prompt_version: promptVersionTurno(),
      mapa_indagacion_version: MAPA_INDAGACION_VERSION,
      tokens_in: uso.tokens_in,
      tokens_out: uso.tokens_out,
      latencia_ms: uso.latencia_ms,
      transcripcion_truncada: norm.truncada,
      correcciones_guardarrailes: g.correcciones.length,
    },
    progreso: g.progreso,
    avisos: g.avisos,
    correcciones: g.correcciones,
  };
}
