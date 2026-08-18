import {
  getJornadaLimiteFromSistema,
  type TiempoJornadaSource,
} from "@/src/lib/tiempo-config";
import { isoToDate } from "@/src/lib/date-picker-utils";
import { FESTIVOS_2026 } from "@/src/lib/mi-tiempo-mock";

/** Fallback interno si falta config de compañía (no usar como regla de negocio). */
export const FALLBACK_SCHEDULE_HOURS =
  getJornadaLimiteFromSistema().maxNormalHours;

/** @deprecated Usar getJornadaLimiteFromSistema() o fetchScheduleHoursAction. */
export const DEFAULT_SCHEDULE_HOURS = FALLBACK_SCHEDULE_HOURS;

export function formatScheduleHoursLabel(hours: number): string {
  return `${hours}h`;
}

export function exceedsNormalLimit(normales: number, max: number): boolean {
  return normales > max + 1e-9;
}

export function atNormalLimit(normales: number, max: number): boolean {
  return normales >= max - 1e-9;
}

export function normalLimitErrorMessage(
  max: number,
  horasExistentes: number,
): string {
  return `Tope de ${formatScheduleHoursLabel(max)} normales por día (ya tienes ${horasExistentes}h)`;
}

export type ScheduleHoursResolved = {
  scheduleHours: number;
  source: TiempoJornadaSource;
};

/** Resuelve tope diario: IFS gana si trae valor; si no, configuración de sistema. */
export function resolveScheduleHoursLimit(input: {
  ifsScheduleHours?: number;
  companyId?: string;
}): ScheduleHoursResolved {
  if (
    input.ifsScheduleHours !== undefined &&
    input.ifsScheduleHours > 0
  ) {
    return {
      scheduleHours: input.ifsScheduleHours,
      source: "ifs",
    };
  }

  const sistema = getJornadaLimiteFromSistema(input.companyId);
  return {
    scheduleHours: sistema.maxNormalHours,
    source: "sistema",
  };
}

/**
 * Día con jornada normal según programa IFS (ScheduleHours > 0).
 * Sin mapa IFS: lun–vie y no festivo (fallback).
 *
 * En días sin jornada (0 / festivo / fin de semana) solo se permiten horas extras.
 */
export function isDiaConJornadaNormal(
  iso: string,
  hoursByDate: Record<string, number> | null | undefined,
): boolean {
  if (hoursByDate && Object.keys(hoursByDate).length > 0) {
    const hours = hoursByDate[iso];
    if (typeof hours === "number") return hours > 0;
    // Día ausente del summary → sin jornada programada
    return false;
  }
  if (FESTIVOS_2026.includes(iso)) return false;
  const date = isoToDate(iso);
  if (!date) return false;
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

/** @deprecated Usar isDiaConJornadaNormal */
export const isDiaLaborablePrograma = isDiaConJornadaNormal;

/** Filtra a días con jornada normal (ScheduleHours > 0). */
export function filterFechasConJornadaNormal(
  fechas: string[],
  hoursByDate: Record<string, number> | null | undefined,
): string[] {
  return fechas.filter((fecha) => isDiaConJornadaNormal(fecha, hoursByDate));
}

/** @deprecated Usar filterFechasConJornadaNormal */
export const filterFechasLaborables = filterFechasConJornadaNormal;

export type TipoHoraCat = "normal" | "extra" | "otro";

/**
 * Tipos permitidos según el/los día(s):
 * - Solo días sin jornada → únicamente extras
 * - Con al menos un día de jornada → todos los tipos
 */
export function filterTiposPorPrograma<T extends { cat: TipoHoraCat }>(
  tipos: T[],
  fechas: string[],
  hoursByDate: Record<string, number> | null | undefined,
): T[] {
  if (!fechas.length) return tipos;
  const todosSinJornada = fechas.every(
    (fecha) => !isDiaConJornadaNormal(fecha, hoursByDate),
  );
  if (todosSinJornada) {
    return tipos.filter((tipo) => tipo.cat === "extra");
  }
  return tipos;
}

/**
 * Días a registrar según tipo:
 * - normal/otro → solo días con jornada
 * - extra → todos los días del rango (festivos/fines incluidos)
 */
export function fechasRegistroSegunTipo(
  fechasCalendario: string[],
  cat: TipoHoraCat | undefined,
  hoursByDate: Record<string, number> | null | undefined,
): string[] {
  if (!fechasCalendario.length) return [];
  if (cat === "extra") return fechasCalendario;
  if (cat === "normal" || cat === "otro") {
    return filterFechasConJornadaNormal(fechasCalendario, hoursByDate);
  }
  return fechasCalendario;
}

export type DiaCalendarioKind = "festivo" | "fin_semana" | "sin_jornada";

/** Clasifica un día sin jornada para copy/UI (festivo > fin de semana). */
export function getDiaSinJornadaKind(iso: string): DiaCalendarioKind {
  if (FESTIVOS_2026.includes(iso)) return "festivo";
  const date = isoToDate(iso);
  if (date) {
    const dow = date.getDay();
    if (dow === 0 || dow === 6) return "fin_semana";
  }
  return "sin_jornada";
}

export function mensajeSoloExtrasSinJornada(iso?: string): string {
  if (iso) {
    const kind = getDiaSinJornadaKind(iso);
    if (kind === "festivo") {
      return "Día festivo: solo puedes registrar horas extras";
    }
    if (kind === "fin_semana") {
      return "Fin de semana: solo puedes registrar horas extras";
    }
  }
  return "Este día no tiene jornada en tu programa: solo puedes registrar horas extras";
}
