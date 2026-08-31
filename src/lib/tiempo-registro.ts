import type { IconName } from "@/src/components/ui/Icon";

/** Registro de horas en UI (IFS + borradores locales en Prisma). */
export type RegistroEstado =
  | "Borrador"
  | "Registrado"
  | "Aprobado"
  | "Rechazado";

export type RegistroTiempo = {
  id: string;
  codigo?: string;
  proy: string;
  subproy?: string;
  act: string;
  tipo: string;
  horas: number;
  fecha: string;
  comentario: string;
  comentarioRechazo?: string;
  aprobador?: string;
  estado: RegistroEstado;
};

/** @deprecated Alias histórico — preferir RegistroTiempo */
export type RegistroMock = RegistroTiempo;

export const HORAS_OPTIONS: { value: number; label: string }[] = [
  { value: 0.5, label: "0:30 h" },
  { value: 1, label: "1:00 h" },
  { value: 1.5, label: "1:30 h" },
  { value: 2, label: "2:00 h" },
  { value: 2.5, label: "2:30 h" },
  { value: 3, label: "3:00 h" },
  { value: 3.5, label: "3:30 h" },
  { value: 4, label: "4:00 h" },
  { value: 4.5, label: "4:30 h" },
  { value: 5, label: "5:00 h" },
  { value: 5.5, label: "5:30 h" },
  { value: 6, label: "6:00 h" },
  { value: 6.5, label: "6:30 h" },
  { value: 7, label: "7:00 h" },
  { value: 7.5, label: "7:30 h" },
  { value: 8, label: "8:00 h" },
  { value: 8.5, label: "8:30 h" },
];

export const META_HORAS_MES = 161.5;

export const FESTIVOS_2026 = [
  "2026-01-01",
  "2026-01-12",
  "2026-03-23",
  "2026-04-02",
  "2026-04-03",
  "2026-05-01",
  "2026-05-18",
  "2026-06-08",
  "2026-06-15",
  "2026-06-29",
  "2026-07-20",
  "2026-08-07",
  "2026-08-17",
  "2026-10-12",
  "2026-11-02",
  "2026-11-16",
  "2026-12-08",
  "2026-12-25",
];

export function hoyReferencia(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export type TipoHoraMeta = {
  s: string;
  n: string;
  c: string;
  b: string;
  cat: "normal" | "extra" | "otro";
  icon: IconName;
};

export const TIPO_HORA: Record<string, TipoHoraMeta> = {
  DN: {
    s: "Diurna Normal",
    n: "Diurno Normal (100%)",
    c: "#014783",
    b: "#eef3f9",
    cat: "normal",
    icon: "clock",
  },
  HA: {
    s: "Adicional",
    n: "Hora Adicional (100%) - Colombia",
    c: "#6d28d9",
    b: "#ede9fe",
    cat: "extra",
    icon: "star",
  },
  HED: {
    s: "Extra Diurna",
    n: "Hora Extra Diurna (125%) - Colombia",
    c: "#b45309",
    b: "#fef3c7",
    cat: "extra",
    icon: "plusCircle",
  },
  HEN: {
    s: "Extra Nocturna",
    n: "Hora Extra Nocturna (175%) - Colombia",
    c: "#b45309",
    b: "#fef3c7",
    cat: "extra",
    icon: "moon",
  },
  HEFD: {
    s: "Extra Fest. Diurna",
    n: "Hora Extra Festiva Diurna (205%) - Colombia",
    c: "#b91c1c",
    b: "#fee2e2",
    cat: "extra",
    icon: "plusCircle",
  },
  HEFN: {
    s: "Extra Fest. Nocturna",
    n: "Hora Extra Festiva Nocturna (255%) - Colombia",
    c: "#b91c1c",
    b: "#fee2e2",
    cat: "extra",
    icon: "moon",
  },
  INMED: {
    s: "Incapacidad",
    n: "Incapacidades Médicas",
    c: "#475569",
    b: "#f1f5f9",
    cat: "otro",
    icon: "incapacidad",
  },
};

const TIPO_HORA_DEFAULT: TipoHoraMeta = {
  s: "",
  n: "",
  c: "#475569",
  b: "#f1f5f9",
  cat: "normal",
  icon: "clock",
};

export function getTipoHoraMeta(tipo: string): TipoHoraMeta {
  return TIPO_HORA[tipo] ?? TIPO_HORA_DEFAULT;
}

export function tipoCat(tipo: string): TipoHoraMeta["cat"] {
  return getTipoHoraMeta(tipo).cat;
}

export function findRegistroById(
  registros: Record<string, RegistroTiempo[]>,
  id: string,
): RegistroTiempo | null {
  for (const arr of Object.values(registros)) {
    const found = arr.find((r) => r.id === id);
    if (found) return found;
  }
  return null;
}

export function getMesActualBounds(hoy: Date = hoyReferencia()) {
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(y, m + 1, 0).getDate();
  return {
    min: `${y}-${pad(m + 1)}-01`,
    max: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
    defaultFecha: `${y}-${pad(m + 1)}-${pad(hoy.getDate())}`,
  };
}

export type MesActualBounds = ReturnType<typeof getMesActualBounds>;

export function clampFechaMes(
  fecha: string,
  bounds: MesActualBounds = getMesActualBounds(),
): string {
  if (!fecha) return bounds.defaultFecha;
  if (fecha < bounds.min) return bounds.min;
  if (fecha > bounds.max) return bounds.max;
  return fecha;
}

export function resolveFechaMes(
  fecha: string | undefined,
  bounds: MesActualBounds = getMesActualBounds(),
): string {
  return clampFechaMes(fecha ?? bounds.defaultFecha, bounds);
}

function toIsoDateLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shiftFechaMes(
  fecha: string,
  deltaDays: number,
  bounds: MesActualBounds = getMesActualBounds(),
): string | null {
  const [y, m, d] = fecha.split("-").map(Number);
  const next = new Date(y, m - 1, d);
  next.setDate(next.getDate() + deltaDays);
  const iso = toIsoDateLocal(next);
  if (iso < bounds.min || iso > bounds.max) return null;
  return iso;
}

export function getMesActualPrefix(refDate: Date = hoyReferencia()): string {
  const y = refDate.getFullYear();
  const m = String(refDate.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function horasReportadasParaCuadre(
  registros: Record<string, RegistroTiempo[]>,
  mesPrefix = getMesActualPrefix(),
): number {
  let total = 0;
  for (const [fecha, rows] of Object.entries(registros)) {
    if (!fecha.startsWith(mesPrefix)) continue;
    for (const r of rows) {
      if (r.estado === "Aprobado" || r.estado === "Registrado") {
        total += r.horas || 0;
      }
    }
  }
  return Math.round(total * 10) / 10;
}

export function getResumenHoras(
  registros: Record<string, RegistroTiempo[]>,
  refDate: Date = hoyReferencia(),
) {
  const mesPrefix = getMesActualPrefix(refDate);
  let aprob = 0;
  let rev = 0;
  let borrador = 0;
  let rech = 0;

  for (const [fecha, rows] of Object.entries(registros)) {
    if (!fecha.startsWith(mesPrefix)) continue;
    for (const r of rows) {
      const h = r.horas || 0;
      if (r.estado === "Aprobado") aprob += h;
      else if (r.estado === "Registrado") rev += h;
      else if (r.estado === "Borrador") borrador += h;
      else if (r.estado === "Rechazado") rech += h;
    }
  }

  const round = (x: number) => Math.round(x * 10) / 10;
  const reportadas = round(aprob + rev);
  const pendientesReportar = Math.max(0, round(META_HORAS_MES - reportadas));

  return {
    horasMes: META_HORAS_MES,
    pendientesReportar,
    reportadas,
    aprobadas: round(aprob),
    pendAprobacion: round(rev),
    borrador: round(borrador),
    rechazadas: round(rech),
  };
}

export type LineaDia = {
  tipo: string;
  horas: number;
};

export type DiaResumen = {
  total: number;
  estadoDia: RegistroEstado;
  lineas: LineaDia[];
};

export function getEstadoDia(diaRegs: RegistroTiempo[]): RegistroEstado {
  const estados = diaRegs.map((r) => r.estado);
  if (estados.includes("Rechazado")) return "Rechazado";
  if (estados.some((e) => e === "Borrador")) return "Borrador";
  if (estados.every((e) => e === "Aprobado")) return "Aprobado";
  if (estados.includes("Registrado")) return "Registrado";
  return "Borrador";
}

export function getRegistrosDia(
  registros: Record<string, RegistroTiempo[]>,
  fechaStr: string,
): RegistroTiempo[] {
  return registros[fechaStr] ?? [];
}

function getLineasDia(
  registros: Record<string, RegistroTiempo[]>,
  fechaStr: string,
): LineaDia[] {
  const lin: Record<string, LineaDia> = {};
  getRegistrosDia(registros, fechaStr).forEach((r) => {
    if (!lin[r.tipo]) lin[r.tipo] = { tipo: r.tipo, horas: 0 };
    lin[r.tipo].horas += r.horas;
  });
  const order = (t: string) =>
    tipoCat(t) === "normal" ? 0 : 1 + Object.keys(TIPO_HORA).indexOf(t);
  return Object.values(lin).sort((a, b) => order(a.tipo) - order(b.tipo));
}

export function getResumenDia(
  registros: Record<string, RegistroTiempo[]>,
  fechaStr: string,
): DiaResumen | null {
  const diaRegs = getRegistrosDia(registros, fechaStr);
  if (!diaRegs.length) return null;

  return {
    total: diaRegs.reduce((a, r) => a + r.horas, 0),
    estadoDia: getEstadoDia(diaRegs),
    lineas: getLineasDia(registros, fechaStr),
  };
}

export function formatFechaLegible(fechaStr: string, capitalize = true) {
  const [y, m, d] = fechaStr.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  const label = fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label;
}

export function getHorasNormales(
  registros: Record<string, RegistroTiempo[]>,
  fechaStr: string,
  excludeId?: string,
): number {
  return getRegistrosDia(registros, fechaStr)
    .filter((r) => r.id !== excludeId && tipoCat(r.tipo) === "normal")
    .reduce((s, r) => s + r.horas, 0);
}

export function getMesLabel(date: Date) {
  return `${MESES[date.getMonth()]} de ${date.getFullYear()}`;
}

export type CalendarioCelda =
  | { tipo: "vacio"; bg: string }
  | {
      tipo: "dia";
      fechaStr: string;
      dia: number;
      bg: string;
      esHoy: boolean;
      esFestivo: boolean;
      esFinSemana: boolean;
      bloqueado: boolean;
      resumen: DiaResumen | null;
    };

export function buildCalendarioGrid(
  mesRef: Date,
  registros: Record<string, RegistroTiempo[]>,
  hoy: Date = hoyReferencia(),
): CalendarioCelda[] {
  const año = mesRef.getFullYear();
  const mes = mesRef.getMonth();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  let startDow = new Date(año, mes, 1).getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const diasMes = new Date(año, mes + 1, 0).getDate();

  const celdas: CalendarioCelda[] = [];

  for (let i = 0; i < startDow; i++) {
    celdas.push({ tipo: "vacio", bg: "#fafafa" });
  }

  for (let d = 1; d <= diasMes; d++) {
    const fecha = new Date(año, mes, d);
    const dow = fecha.getDay();
    const esFinSemana = dow === 0 || dow === 6;
    const fechaStr = `${año}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const esFestivo = FESTIVOS_2026.includes(fechaStr);
    const esHoy = fechaStr === hoyStr;
    const resumen = getResumenDia(registros, fechaStr);

    let bg = "white";
    if (esHoy) bg = "#eef3fb";
    else if (esFestivo) bg = "#fff7ed";
    else if (esFinSemana) bg = "#f8fafc";

    celdas.push({
      tipo: "dia",
      fechaStr,
      dia: d,
      bg,
      esHoy,
      esFestivo,
      esFinSemana,
      bloqueado: esFestivo,
      resumen,
    });
  }

  const total = startDow + diasMes;
  const resto = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 0; i < resto; i++) {
    celdas.push({ tipo: "vacio", bg: "#fafafa" });
  }

  return celdas;
}
