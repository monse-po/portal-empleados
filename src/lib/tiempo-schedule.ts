import {
  getJornadaLimiteFromSistema,
  type TiempoJornadaSource,
} from "@/src/lib/tiempo-config";
import { eachIsoDateInclusive, isoToDate } from "@/src/lib/date-picker-utils";
import { FESTIVOS_2026 } from "@/src/lib/mi-tiempo-mock";
import {
  etiquetaFestivo,
  etiquetaFinSemana,
} from "@/src/lib/ifs/schedule-day-color";
import { isAusenciaExcepcionNoLaborable } from "@/src/lib/tiempo-ausencias";

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

export type IfsDiaTipoRef = { dayType?: string | null };

export type CalendarioDayType = "WEEKDAY" | "WEEKEND" | "HOLIDAY";

/**
 * Calendario de días (regla 1). No usa horas.
 * GetHoursSummary a veces omite DayType si ScheduleHours va en 0 (HORAS-COL).
 * No sustituye WEEKDAY/WEEKEND/HOLIDAY si IFS sí los trajo.
 */
export function inferDayTypeFromCalendar(iso: string): CalendarioDayType {
  if (FESTIVOS_2026.includes(iso)) return "HOLIDAY";
  const date = isoToDate(iso);
  if (date) {
    const dow = date.getDay();
    if (dow === 0 || dow === 6) return "WEEKEND";
  }
  return "WEEKDAY";
}

function isIfsDiaNoLaborable(
  iso: string,
  specialDays?: Record<string, IfsDiaTipoRef> | null,
): boolean {
  const type = (specialDays?.[iso]?.dayType ?? "").trim().toUpperCase();
  if (type === "WEEKDAY") return false;
  if (type === "HOLIDAY" || type === "WEEKEND") return true;
  return inferDayTypeFromCalendar(iso) !== "WEEKDAY";
}

/** CREPSCHEXT002: fin/festivo vs hábil con tope 0 (HORAS-COL). */
export function mensajeRegistroDiaNoLaborable(fechas: string[]): string {
  const isos = fechas.map((fecha) => fecha.slice(0, 10)).filter(Boolean);
  const todosHabiles =
    isos.length > 0 &&
    isos.every((iso) => inferDayTypeFromCalendar(iso) === "WEEKDAY");
  if (todosHabiles) {
    return "IFS rechazó un día hábil. El calendario de días sí aplica; las horas van en 0 a propósito (sin tope mensual). Eso hay que corregirlo en IFS, no programando horas.";
  }
  return "Ese día no es laborable en tu programa. Elige un día hábil.";
}

/** Resuelve tope diario: IFS gana si trae valor (0 = sin tope, p. ej. HORAS-COL). */
export function resolveScheduleHoursLimit(input: {
  ifsScheduleHours?: number;
  companyId?: string;
}): ScheduleHoursResolved {
  if (
    typeof input.ifsScheduleHours === "number" &&
    Number.isFinite(input.ifsScheduleHours)
  ) {
    if (input.ifsScheduleHours > 0) {
      return {
        scheduleHours: input.ifsScheduleHours,
        source: "ifs",
      };
    }
    return { scheduleHours: 0, source: "ifs" };
  }

  const sistema = getJornadaLimiteFromSistema(input.companyId);
  return {
    scheduleHours: sistema.maxNormalHours,
    source: "sistema",
  };
}

/**
 * Día hábil (regla 1: calendario). No mira ScheduleHours.
 * 0 h programadas no significa “no laborable” (HORAS-COL).
 * `hoursByDate` se ignora a propósito: el tope es otra regla.
 */
export function isDiaConJornadaNormal(
  iso: string,
  _hoursByDate?: Record<string, number> | null,
  specialDays?: Record<string, IfsDiaTipoRef> | null,
): boolean {
  return !isIfsDiaNoLaborable(iso, specialDays);
}

/** @deprecated Usar isDiaConJornadaNormal */
export const isDiaLaborablePrograma = isDiaConJornadaNormal;

function roundHoras(x: number): number {
  return Math.round(x * 10) / 10;
}

/** Suma ScheduleHours del programa en [min, max]. */
export function sumScheduleHoursInRange(
  hoursByDate: Record<string, number> | null | undefined,
  min: string,
  max: string,
): number {
  if (!hoursByDate) return 0;
  let total = 0;
  for (const [iso, hours] of Object.entries(hoursByDate)) {
    if (iso < min || iso > max) continue;
    if (typeof hours === "number" && Number.isFinite(hours) && hours > 0) {
      total += hours;
    }
  }
  return total;
}

/**
 * Tope mensual (regla 2: horas). Independiente de si el día es hábil.
 * 0 de IFS es válido (HORAS-COL): no inventar 8.5 × hábiles / 161.
 * Si se inventara tope, el job de fin de mes los trataría como planta.
 */
export function horasMesDesdePrograma(
  hoursByDate: Record<string, number> | null | undefined,
  bounds: { min: string; max: string },
  fallbackScheduleHours?: number | null,
  fromIfs = false,
): number {
  if (hoursByDate && Object.keys(hoursByDate).length > 0) {
    const hasDaysInRange = Object.keys(hoursByDate).some(
      (iso) => iso >= bounds.min && iso <= bounds.max,
    );
    if (hasDaysInRange) {
      return roundHoras(
        sumScheduleHoursInRange(hoursByDate, bounds.min, bounds.max),
      );
    }
  }

  if (
    typeof fallbackScheduleHours === "number" &&
    Number.isFinite(fallbackScheduleHours)
  ) {
    return roundHoras(Math.max(0, fallbackScheduleHours));
  }

  if (fromIfs) return 0;

  const sistema = getJornadaLimiteFromSistema().maxNormalHours;
  let total = 0;
  for (const fecha of eachIsoDateInclusive(bounds.min, bounds.max)) {
    if (isDiaConJornadaNormal(fecha, hoursByDate)) total += sistema;
  }
  return roundHoras(total);
}

/** Filtra a días hábiles del programa (WEEKDAY, con o sin tope). */
export function filterFechasConJornadaNormal(
  fechas: string[],
  hoursByDate: Record<string, number> | null | undefined,
  specialDays?: Record<string, IfsDiaTipoRef> | null,
): string[] {
  return fechas.filter((fecha) =>
    isDiaConJornadaNormal(fecha, hoursByDate, specialDays),
  );
}

/** @deprecated Usar filterFechasConJornadaNormal */
export const filterFechasLaborables = filterFechasConJornadaNormal;

export type TipoHoraCat = "normal" | "extra" | "otro";

/**
 * Tope diario (regla 2: horas). No decide si el día es hábil.
 * ScheduleHours > 0 → ese tope. 0 en un hábil (HORAS-COL) → sin tope.
 */
export function topeNormalesDelDia(
  iso: string,
  hoursByDate: Record<string, number> | null | undefined,
  fallbackMax: number,
  specialDays?: Record<string, IfsDiaTipoRef> | null,
): number {
  if (!isDiaConJornadaNormal(iso, hoursByDate, specialDays)) return 0;
  if (hoursByDate && Object.keys(hoursByDate).length > 0) {
    const hours = hoursByDate[iso];
    if (typeof hours === "number" && hours > 0) return hours;
    return 0;
  }
  return fallbackMax > 0 ? fallbackMax : 0;
}

/**
 * True cuando todos los días con tope de jornada ya tienen
 * diurnas normales en el tope. Días hábiles sin tope (HORAS-COL) no cuentan.
 */
export function isJornadaNormalCompleta(
  fechas: string[],
  hoursByDate: Record<string, number> | null | undefined,
  maxHours: number,
  horasNormalesPorFecha: (fecha: string) => number,
  specialDays?: Record<string, IfsDiaTipoRef> | null,
): boolean {
  if (!fechas.length) return false;
  const diasConTope = fechas.filter(
    (fecha) => topeNormalesDelDia(fecha, hoursByDate, maxHours, specialDays) > 0,
  );
  if (!diasConTope.length) return false;
  return diasConTope.every((fecha) => {
    const tope = topeNormalesDelDia(fecha, hoursByDate, maxHours, specialDays);
    return atNormalLimit(horasNormalesPorFecha(fecha), tope);
  });
}

/** Horas normales que aún caben (mínimo entre los días con tope del rango). */
export function restantesNormalesMin(
  fechas: string[],
  hoursByDate: Record<string, number> | null | undefined,
  maxHours: number,
  horasNormalesPorFecha: (fecha: string) => number,
  specialDays?: Record<string, IfsDiaTipoRef> | null,
): number {
  const diasConTope = fechas.filter(
    (fecha) => topeNormalesDelDia(fecha, hoursByDate, maxHours, specialDays) > 0,
  );
  if (!diasConTope.length) return 0;
  const min = Math.min(
    ...diasConTope.map((fecha) => {
      const tope = topeNormalesDelDia(fecha, hoursByDate, maxHours, specialDays);
      return Math.max(0, tope - horasNormalesPorFecha(fecha));
    }),
  );
  return Math.round(min * 100) / 100;
}

/**
 * Filtro mínimo sobre el LOV IFS (no inventa tipos).
 * - Días sin jornada → extras + INMED (excepción no laborable)
 * - opts.soloExtras → idem
 * - Con jornada y cupo → el LOV tal cual (prioridad IFS)
 */
export function filterTiposPorPrograma<
  T extends { cat: TipoHoraCat; code?: string; groupId?: string },
>(
  tipos: T[],
  fechas: string[],
  hoursByDate: Record<string, number> | null | undefined,
  opts?: {
    soloExtras?: boolean;
    specialDays?: Record<string, IfsDiaTipoRef> | null;
  },
): T[] {
  if (!fechas.length) return tipos;
  if (opts?.soloExtras) {
    return tipos.filter(
      (tipo) =>
        tipo.cat === "extra" ||
        isAusenciaExcepcionNoLaborable(tipo.code, tipo.groupId),
    );
  }
  const todosSinJornada = fechas.every(
    (fecha) => !isDiaConJornadaNormal(fecha, hoursByDate, opts?.specialDays),
  );
  if (todosSinJornada) {
    return tipos.filter(
      (tipo) =>
        tipo.cat === "extra" ||
        isAusenciaExcepcionNoLaborable(tipo.code, tipo.groupId),
    );
  }
  return tipos;
}

/**
 * Días a registrar según tipo:
 * - extra e INMED → todos los días del rango (festivos/fines incluidos)
 * - normal/otro → solo días con jornada
 */
export function fechasRegistroSegunTipo(
  fechasCalendario: string[],
  cat: TipoHoraCat | undefined,
  hoursByDate: Record<string, number> | null | undefined,
  tipoCode?: string,
  groupId?: string,
  specialDays?: Record<string, IfsDiaTipoRef> | null,
): string[] {
  if (!fechasCalendario.length) return [];
  if (cat === "extra" || isAusenciaExcepcionNoLaborable(tipoCode, groupId)) {
    return fechasCalendario;
  }
  if (cat === "normal" || cat === "otro") {
    return filterFechasConJornadaNormal(
      fechasCalendario,
      hoursByDate,
      specialDays,
    );
  }
  return fechasCalendario;
}

export type DiaCalendarioKind = "festivo" | "fin_semana" | "sin_jornada";

/** Clasifica un día sin jornada para copy/UI (festivo > fin de semana). */
export function getDiaSinJornadaKind(
  iso: string,
  ifsDayType?: string | null,
): DiaCalendarioKind {
  const type = (ifsDayType ?? "").trim().toUpperCase();
  if (type === "HOLIDAY" || FESTIVOS_2026.includes(iso)) return "festivo";
  if (type === "WEEKEND") return "fin_semana";
  const date = isoToDate(iso);
  if (date) {
    const dow = date.getDay();
    if (dow === 0 || dow === 6) return "fin_semana";
  }
  return "sin_jornada";
}

export function mensajeSoloExtrasSinJornada(
  iso?: string,
  dayTypeDesc?: string | null,
): string {
  if (iso) {
    const kind = getDiaSinJornadaKind(iso);
    if (kind === "festivo") {
      return `${etiquetaFestivo(dayTypeDesc)}: solo puedes registrar horas extras`;
    }
    if (kind === "fin_semana") {
      const label = etiquetaFinSemana(dayTypeDesc);
      return label
        ? `${label}: solo puedes registrar horas extras`
        : "Este día no tiene jornada en tu programa: solo puedes registrar horas extras";
    }
  }
  return "Este día no tiene jornada en tu programa: solo puedes registrar horas extras";
}

/** Aviso cuando ya se llenó el tope de diurnas normales del programa. */
export function mensajeSoloExtrasJornadaCompleta(maxHours: number): string {
  return `Ya completaste tu jornada (${formatScheduleHoursLabel(maxHours)} h). Solo puedes registrar horas extras`;
}

/** IFS no acepta extras hasta completar las diurnas normales del día. */
export function mensajeExtrasAntesDeCompletarJornada(restantes: number): string {
  return `Completa primero las ${formatScheduleHoursLabel(restantes)} h de jornada normal (DN). Después puedes registrar extras.`;
}
