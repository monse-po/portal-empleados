/** ColorName IFS (hex): tinta en número/etiqueta, pastel en fondo. */

export const ETIQUETA_FESTIVO = "Festivo";

/** DayTypeDesc de IFS. Ignora el código (WEEKEND / HOLIDAY). */
export function etiquetaDesdeIfs(dayTypeDesc?: string | null): string | undefined {
  const raw = dayTypeDesc?.trim();
  if (!raw) return undefined;
  const code = raw.toUpperCase();
  if (code === "WEEKEND" || code === "HOLIDAY" || code === "WEEKDAY") {
    return undefined;
  }
  return raw;
}

export function etiquetaFestivo(dayTypeDesc?: string | null): string {
  return etiquetaDesdeIfs(dayTypeDesc) || ETIQUETA_FESTIVO;
}

/** Solo el texto IFS. Sin fallback local («Descanso»). */
export function etiquetaFinSemana(dayTypeDesc?: string | null): string | undefined {
  return etiquetaDesdeIfs(dayTypeDesc);
}

export function resolveSpecialDayLabel(
  specialDays:
    | Record<string, { dayType: string; dayTypeDesc: string }>
    | null
    | undefined,
  iso: string,
  kind: "festivo" | "fin_semana",
): string | undefined {
  const mine = etiquetaDesdeIfs(specialDays?.[iso]?.dayTypeDesc);
  if (mine) return mine;
  const want = kind === "festivo" ? "HOLIDAY" : "WEEKEND";
  for (const day of Object.values(specialDays ?? {})) {
    if (day.dayType.toUpperCase() !== want) continue;
    const label = etiquetaDesdeIfs(day.dayTypeDesc);
    if (label) return label;
  }
  return kind === "festivo" ? ETIQUETA_FESTIVO : undefined;
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim();
  const m3 = raw.match(/^#([0-9a-f]{3})$/i);
  if (m3) {
    const [r, g, b] = m3[1].split("").map((c) => parseInt(c + c, 16));
    return { r, g, b };
  }
  const m6 = raw.match(/^#([0-9a-f]{6})$/i);
  if (!m6) return null;
  const n = m6[1];
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function toHex(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, "0");
}

/** % del ColorName sobre blanco. 6% = un suspiro de color, sin saturación rara. */
const PASTEL_TINT = 0.06;

/**
 * Pastel = el mismo ColorName mezclado con blanco.
 * #D26393 → #FCF6F9 · #A977AE → #FAF7FA
 */
export function ifsColorPastel(css: string): string {
  const rgb = parseHexRgb(css);
  if (!rgb) return `color-mix(in srgb, ${css} ${Math.round(PASTEL_TINT * 100)}%, white)`;
  const mix = (c: number) => c * PASTEL_TINT + 255 * (1 - PASTEL_TINT);
  return `#${toHex(mix(rgb.r))}${toHex(mix(rgb.g))}${toHex(mix(rgb.b))}`;
}

export function ifsDayAccent(colorName?: string | null): {
  ink?: string;
  wash?: string;
} {
  const ink = colorName?.trim();
  if (!ink) return {};
  return { ink, wash: ifsColorPastel(ink) };
}

/** @deprecated Usar ifsDayAccent — mismo pastel + tinta. */
export const festivoAccent = ifsDayAccent;

export function pickScheduleColors(
  specialDays?: Record<
    string,
    { dayType: string; dayTypeDesc?: string; colorName: string }
  > | null,
): {
  holidayColor?: string;
  weekendColor?: string;
  holidayLabel?: string;
  weekendLabel?: string;
  holidayDates: string[];
} {
  let holidayColor: string | undefined;
  let weekendColor: string | undefined;
  let holidayLabel: string | undefined;
  let weekendLabel: string | undefined;
  const holidayDates: string[] = [];
  for (const [iso, day] of Object.entries(specialDays ?? {})) {
    const type = day.dayType.toUpperCase();
    const label = etiquetaDesdeIfs(day.dayTypeDesc);
    if (type === "HOLIDAY") {
      holidayDates.push(iso);
      if (!holidayColor && day.colorName) holidayColor = day.colorName;
      if (!holidayLabel && label) holidayLabel = label;
    } else if (type === "WEEKEND") {
      if (!weekendColor && day.colorName) weekendColor = day.colorName;
      if (!weekendLabel && label) weekendLabel = label;
    }
  }
  return {
    holidayColor,
    weekendColor,
    holidayLabel,
    weekendLabel,
    holidayDates,
  };
}

/** Variables CSS del date picker (festivo y fin de semana). */
export function schedulePickerCssVars(opts: {
  holidayColor?: string | null;
  weekendColor?: string | null;
  weekdayColor?: string | null;
}): Record<string, string> | undefined {
  const holiday = ifsDayAccent(opts.holidayColor);
  const weekend = ifsDayAccent(opts.weekendColor);
  const weekdayWash = opts.weekdayColor
    ? ifsColorPastel(opts.weekdayColor)
    : undefined;
  const vars: Record<string, string> = {};
  if (holiday.ink && holiday.wash) {
    vars["--ds-festivo-bg"] = holiday.wash;
    vars["--ds-festivo-ink"] = holiday.ink;
  }
  if (weekend.ink && weekend.wash) {
    vars["--ds-finsemana-bg"] = weekend.wash;
    vars["--ds-finsemana-ink"] = weekend.ink;
  }
  if (weekdayWash) vars["--ds-weekday-hover"] = weekdayWash;
  return Object.keys(vars).length ? vars : undefined;
}
