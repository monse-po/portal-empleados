import {
  getJornadaLimiteFromSistema,
  type TiempoJornadaSource,
} from "@/src/lib/tiempo-config";

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
