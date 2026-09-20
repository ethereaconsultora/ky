/**
 * guardarrailes - aplica las reglas de suficiencia (DD-11) a la salida del modelo.
 *
 * Es la barrera que garantiza que la app NUNCA concluya con poca evidencia, sin
 * importar el modelo ni el prompt: el modelo propone, el codigo dispone.
 *
 *   R1  antes del turno `min_turnos_diagnostico` no hay fenomenos "confirmados" ni fin de diagnostico
 *   R2  las condiciones cumplidas de un fenomeno se recortan segun sus turnos propios
 *       (=> confirmar exige >= 3 turnos propios y las 4 condiciones)
 *   R3  confianza "alta" solo con >= 4 turnos propios
 *
 * Puro: sin IA ni IO. Las reglas y los numeros viven en `lib/diagnostico/suficiencia.ts`.
 */

import { FENOMENOS_DEF } from "../diagnostico/matriz.config.ts";
import {
  confianzaMaxima,
  puedeConcluir,
  recortarCondiciones,
  turnosFaltantes,
  turnosMinimosParaConfirmar,
} from "../diagnostico/suficiencia.ts";
import { FENOMENOS } from "../diagnostico/types.ts";
import type { FenomenoTipo } from "../diagnostico/types.ts";
import { GUARDARRAILES } from "../diagnostico/matriz.config.ts";
import type { FenomenoActualizado, TurnoSalida } from "./validar.ts";

export type ReglaGuardarrail = "R1" | "R2" | "R3";

export interface Correccion {
  regla: ReglaGuardarrail;
  fenomeno: FenomenoTipo | null;
  detalle: string;
}

export interface Progreso {
  /** Turnos analizados incluyendo el actual. */
  turnos: number;
  minimo: number;
  faltan: number;
  puede_concluir: boolean;
}

export interface ContextoGuardarrailes {
  /** Turno actual, contado desde 1 (= respuestas previas + 1). */
  turnos: number;
  /** Turnos propios previos de cada fenomeno (respuestas en las que fue el fenomeno principal). */
  turnosPropiosPrevios: Partial<Record<FenomenoTipo, number>>;
}

export interface ResultadoGuardarrailes {
  salida: TurnoSalida;
  correcciones: Correccion[];
  /** Mensajes para el Counselor (uno por correccion relevante). */
  avisos: string[];
  progreso: Progreso;
}

const NOTA_RETENIDA = " [guardarraíl: conclusión retenida hasta reunir más evidencia]";

/** Un fenomeno "se toco" en este turno si el modelo le registro evidencia o alguna condicion. */
function seToco(f: FenomenoActualizado): boolean {
  return f.mecanismos.length > 0 || Object.values(f.condiciones).some(Boolean);
}

function degradar(f: FenomenoActualizado): FenomenoActualizado {
  return {
    ...f,
    estado: "en_observacion",
    intensidad: null,
    confianza: null,
    mecanismo_organizacional: null,
    consecuencia_operativa: null,
    indicador_economico_afectado: null,
    razonamiento: f.razonamiento ? f.razonamiento + NOTA_RETENIDA : NOTA_RETENIDA.trim(),
  };
}

export function aplicarGuardarrailes(
  salida: TurnoSalida,
  ctx: ContextoGuardarrailes,
): ResultadoGuardarrailes {
  const correcciones: Correccion[] = [];
  const avisos: string[] = [];
  const concluye = puedeConcluir(ctx.turnos);
  const faltan = turnosFaltantes(ctx.turnos);
  const minTurnosFen = turnosMinimosParaConfirmar();
  const degradados: FenomenoTipo[] = [];

  const fenomenos = salida.fenomenos_actualizados.map((original) => {
    const nombre = FENOMENOS_DEF[original.fenomeno].nombre;
    const turnosFen = (ctx.turnosPropiosPrevios[original.fenomeno] ?? 0) + (seToco(original) ? 1 : 0);
    let f: FenomenoActualizado = { ...original, condiciones: { ...original.condiciones } };

    // R2 - recorte de condiciones por turnos propios
    const rec = recortarCondiciones(f.condiciones, turnosFen);
    if (rec.recortadas > 0) {
      f.condiciones = rec.condiciones;
      correcciones.push({
        regla: "R2",
        fenomeno: f.fenomeno,
        detalle: `${rec.recortadas} condición(es) recortada(s): ${turnosFen} turno(s) propio(s) no alcanzan para darlas por cumplidas.`,
      });
    }

    // Confirmar exige R1 + las 4 condiciones
    if (f.estado === "confirmado") {
      const cuatro = Object.values(f.condiciones).every(Boolean);
      if (!concluye) {
        f = degradar(f);
        degradados.push(f.fenomeno);
        correcciones.push({
          regla: "R1",
          fenomeno: f.fenomeno,
          detalle: `confirmación retenida: turno ${ctx.turnos} < mínimo ${GUARDARRAILES.min_turnos_diagnostico}.`,
        });
        avisos.push(
          `${nombre}: todavía no se puede dar por confirmado — van ${ctx.turnos} de un mínimo de ` +
            `${GUARDARRAILES.min_turnos_diagnostico} preguntas (faltan ${faltan}).`,
        );
      } else if (!cuatro) {
        f = degradar(f);
        degradados.push(f.fenomeno);
        correcciones.push({
          regla: "R2",
          fenomeno: f.fenomeno,
          detalle: `confirmación retenida: con ${turnosFen} turno(s) propio(s) no se cumplen las 4 condiciones.`,
        });
        avisos.push(
          `${nombre}: una respuesta sola no alcanza para darlo por confirmado; necesita al menos ` +
            `${minTurnosFen} turnos sobre ese fenómeno (lleva ${turnosFen}).`,
        );
      }
    }

    // R3 - confianza alta solo con suficientes turnos propios
    if (f.estado === "confirmado" && f.confianza === "alta" && confianzaMaxima(turnosFen) !== "alta") {
      f = { ...f, confianza: "media" };
      correcciones.push({
        regla: "R3",
        fenomeno: f.fenomeno,
        detalle: `confianza alta → media: ${turnosFen} turno(s) propio(s) < ${GUARDARRAILES.confianza_alta_min_turnos}.`,
      });
      avisos.push(
        `${nombre}: la confianza queda en "media" hasta tener ${GUARDARRAILES.confianza_alta_min_turnos} turnos sobre el fenómeno.`,
      );
    }

    return f;
  });

  let { accion, fenomeno_siguiente_prioridad, fin_diagnostico } = salida;

  // R1 - no se cierra el diagnostico antes del piso
  if (!concluye && fin_diagnostico) {
    fin_diagnostico = false;
    correcciones.push({
      regla: "R1",
      fenomeno: null,
      detalle: `fin_diagnostico retenido: turno ${ctx.turnos} < mínimo ${GUARDARRAILES.min_turnos_diagnostico}.`,
    });
    avisos.push(
      `No se puede cerrar el diagnóstico todavía: van ${ctx.turnos} de un mínimo de ` +
        `${GUARDARRAILES.min_turnos_diagnostico} preguntas (faltan ${faltan}).`,
    );
    if (fenomeno_siguiente_prioridad === null) {
      // el modelo no tenia "siguiente": indagar el fenomeno con menos turnos propios que no este confirmado
      const confirmados = new Set(
        fenomenos.filter((f) => f.estado === "confirmado").map((f) => f.fenomeno),
      );
      const candidatos = FENOMENOS.filter((f) => !confirmados.has(f));
      candidatos.sort(
        (a, b) => (ctx.turnosPropiosPrevios[a] ?? 0) - (ctx.turnosPropiosPrevios[b] ?? 0),
      );
      fenomeno_siguiente_prioridad = candidatos[0] ?? null;
    }
  }

  // Si se retuvo una conclusion, el fenomeno sigue abierto: no puede figurar como "cerrado".
  if (degradados.length > 0 && accion === "cerrar") {
    accion = "profundizar";
    fenomeno_siguiente_prioridad = degradados[0];
    avisos.push(
      "Las sugerencias pueden apuntar a otro fenómeno: conviene seguir profundizando " +
        `${FENOMENOS_DEF[degradados[0]].nombre} antes de avanzar.`,
    );
  }

  return {
    salida: { ...salida, fenomenos_actualizados: fenomenos, accion, fenomeno_siguiente_prioridad, fin_diagnostico },
    correcciones,
    avisos,
    progreso: {
      turnos: ctx.turnos,
      minimo: GUARDARRAILES.min_turnos_diagnostico,
      faltan,
      puede_concluir: concluye,
    },
  };
}
