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

/** Valor de horas para UI (decimal con punto, sin sufijo «h»). */
export function formatHorasValor(hours: number): string {
  if (!Number.isFinite(hours)) return "0";
  const rounded = Math.round(hours * 100) / 100;
  return String(rounded);
}

/**
 * Horas decimales para IFS (`DayHours`).
 * Acepta coma o punto. Rechaza h:mm y texto raro (devuelve NaN).
 */
export function parseHorasInput(raw: string): number {
  const t = raw.trim().replace(",", ".");
  if (!t) return Number.NaN;
  if (t.includes(":")) return Number.NaN;
  if (!/^\d+(\.\d+)?$/.test(t)) return Number.NaN;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Texto del campo Horas en UI: punto decimal. Deja el raw si no es número. */
export function formatHorasCampo(raw: string): string {
  const n = parseHorasInput(raw);
  return Number.isNaN(n) ? raw : formatHorasValor(n);
}

/** Error de formato del campo Horas (null = ok o vacío — el vacío lo marca “Requerido”). */
export function horasInputFormatError(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.includes(":")) {
    return "Usa decimales, no horas:minutos (ej. 0.5 = 30 min)";
  }
  if (/[a-zA-Záéíóúüñ]/i.test(t) || /\s/.test(t)) {
    return "Solo un número (ej. 8 o 0.5)";
  }
  if (!/^\d+([.,]\d+)?$/.test(t)) {
    return "Solo un número (ej. 8 o 0.5)";
  }
  const n = parseHorasInput(t);
  if (Number.isNaN(n) || n <= 0) return "Debe ser mayor que 0";
  if (n > 24) return "Máximo 24";
  return null;
}

export function formatScheduleHoursLabel(hours: number): string {
  return formatHorasValor(hours);
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
  return `Tope de ${formatScheduleHoursLabel(max)} normales por día (ya tienes ${formatHorasValor(horasExistentes)})`;
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
 * Festivos de calendario → nunca jornada normal (solo extras), aunque IFS traiga horas.
 * Sin mapa IFS: lun–vie y no festivo (fallback).
 */
export function isDiaConJornadaNormal(
  iso: string,
  hoursByDate: Record<string, number> | null | undefined,
): boolean {
  // Festivo HQ: no DN aunque ScheduleHours venga > 0
  if (FESTIVOS_2026.includes(iso)) return false;

  if (hoursByDate && Object.keys(hoursByDate).length > 0) {
    const hours = hoursByDate[iso];
    if (typeof hours === "number") return hours > 0;
    // Día ausente del summary → sin jornada programada
    return false;
  }
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
 * Tope de diurnas normales del día:
 * - Con programa IFS → ScheduleHours de ese día
 * - Sin mapa IFS → fallback de compañía (ej. 8.5) en días con jornada
 */
export function topeNormalesDelDia(
  iso: string,
  hoursByDate: Record<string, number> | null | undefined,
  fallbackMax: number,
): number {
  if (!isDiaConJornadaNormal(iso, hoursByDate)) return 0;
  if (hoursByDate && Object.keys(hoursByDate).length > 0) {
    const hours = hoursByDate[iso];
    if (typeof hours === "number" && hours > 0) return hours;
    return 0;
  }
  return fallbackMax > 0 ? fallbackMax : 0;
}

/**
 * True cuando todos los días con jornada del programa ya tienen
 * diurnas normales en el tope (ej. 8.5 h). En ese caso solo caben extras.
 * Días sin jornada no cuentan aquí (ya fuerzan extras por programa).
 */
export function isJornadaNormalCompleta(
  fechas: string[],
  hoursByDate: Record<string, number> | null | undefined,
  maxHours: number,
  horasNormalesPorFecha: (fecha: string) => number,
): boolean {
  if (!fechas.length) return false;
  const diasConJornada = fechas.filter(
    (fecha) => topeNormalesDelDia(fecha, hoursByDate, maxHours) > 0,
  );
  if (!diasConJornada.length) return false;
  return diasConJornada.every((fecha) => {
    const tope = topeNormalesDelDia(fecha, hoursByDate, maxHours);
    return atNormalLimit(horasNormalesPorFecha(fecha), tope);
  });
}

/** Horas normales que aún caben (mínimo entre los días con jornada del rango). */
export function restantesNormalesMin(
  fechas: string[],
  hoursByDate: Record<string, number> | null | undefined,
  maxHours: number,
  horasNormalesPorFecha: (fecha: string) => number,
): number {
  const diasConJornada = fechas.filter(
    (fecha) => topeNormalesDelDia(fecha, hoursByDate, maxHours) > 0,
  );
  if (!diasConJornada.length) return 0;
  const min = Math.min(
    ...diasConJornada.map((fecha) => {
      const tope = topeNormalesDelDia(fecha, hoursByDate, maxHours);
      return Math.max(0, tope - horasNormalesPorFecha(fecha));
    }),
  );
  return Math.round(min * 100) / 100;
}

/**
 * Filtro mínimo sobre el LOV IFS (no inventa tipos).
 * - Días sin jornada → quita no-extras (respeta lo que IFS mandó)
 * - opts.soloExtras → idem
 * - Con jornada y cupo → el LOV tal cual (prioridad IFS)
 */
export function filterTiposPorPrograma<T extends { cat: TipoHoraCat }>(
  tipos: T[],
  fechas: string[],
  hoursByDate: Record<string, number> | null | undefined,
  opts?: { soloExtras?: boolean },
): T[] {
  if (!fechas.length) return tipos;
  if (opts?.soloExtras) {
    return tipos.filter((tipo) => tipo.cat === "extra");
  }
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

/** Aviso cuando ya se llenó el tope de diurnas normales del programa. */
export function mensajeSoloExtrasJornadaCompleta(maxHours: number): string {
  return `Ya completaste tu jornada (${formatScheduleHoursLabel(maxHours)} h). Solo puedes registrar horas extras`;
}
