export type RegistroEstado =
  | "Aprobado"
  | "Rechazado"
  | "Registrado"
  | "En revisión"
  | "Nuevo";

export type RegistroMock = {
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

export type ProyectoMock = {
  id: string;
  nombre: string;
  sub: string;
};

export const PROYECTOS: ProyectoMock[] = [
  { id: "PRY-2024-001", nombre: "Construcción Planta Norte", sub: "Ecopetrol" },
  { id: "PRY-2024-003", nombre: "Mantenimiento Subestación 115kV", sub: "ISA" },
  { id: "PRY-2025-002", nombre: "Ingeniería de Detalle Refinería", sub: "Reficar" },
];

export type JerTiempoEntry = {
  aprobador: string;
  subs: Record<string, string[]>;
};

export const JER_TIEMPO: Record<string, JerTiempoEntry> = {
  "PRY-2024-001": {
    aprobador: "Carlos Méndez Rojas",
    subs: {
      "SUB-101 · Obra civil": ["Diseño estructural", "Supervisión en campo"],
      "SUB-102 · Documentación": ["Informes técnicos", "Reuniones cliente"],
    },
  },
  "PRY-2024-003": {
    aprobador: "Carlos Méndez Rojas",
    subs: {
      "SUB-201 · Inspección": ["Inspección eléctrica", "Pruebas de equipos"],
      "SUB-202 · Gestión": ["Documentación", "Coordinación"],
    },
  },
  "PRY-2025-002": {
    aprobador: "Laura Gómez Díaz",
    subs: {
      "SUB-301 · Ingeniería": ["Ingeniería de proceso", "Modelado 3D"],
      "SUB-302 · Planos": ["Revisión planos", "Gestión cambios"],
    },
  },
};

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

export const REGISTROS_MOCK: Record<string, RegistroMock[]> = {
  "2026-03-17": [
    {
      id: "r1",
      proy: "PRY-2024-001",
      act: "Diseño estructural",
      tipo: "DN",
      horas: 6,
      fecha: "2026-03-17",
      comentario: "Revisión cálculos fundaciones bloque A",
      comentarioRechazo: "",
      aprobador: "Carlos Méndez",
      estado: "Aprobado",
    },
    {
      id: "r2",
      proy: "PRY-2024-003",
      act: "Inspección eléctrica",
      tipo: "DN",
      horas: 1,
      fecha: "2026-03-17",
      comentario: "Verificación tableros principales",
      estado: "Aprobado",
    },
    {
      id: "r2b",
      proy: "PRY-2024-003",
      act: "Coordinación",
      tipo: "HED",
      horas: 1.5,
      fecha: "2026-03-17",
      comentario: "Cierre urgente documentación ISA",
      comentarioRechazo: "",
      aprobador: "Carlos Méndez",
      estado: "Aprobado",
    },
  ],
  "2026-03-18": [
    {
      id: "r3",
      proy: "PRY-2025-002",
      act: "Ingeniería de proceso",
      tipo: "DN",
      horas: 4,
      fecha: "2026-03-18",
      comentario: "Modelado P&ID unidad 3",
      estado: "Registrado",
    },
    {
      id: "r4",
      proy: "PRY-2024-001",
      act: "Reuniones cliente",
      tipo: "DN",
      horas: 3,
      fecha: "2026-03-18",
      comentario: "Call semanal Ecopetrol",
      estado: "Registrado",
    },
    {
      id: "r5",
      proy: "PRY-2024-003",
      act: "Coordinación",
      tipo: "HED",
      horas: 1.5,
      fecha: "2026-03-18",
      comentario: "Gestión urgente materiales",
      comentarioRechazo: "Horas extra requieren pre-autorización",
      estado: "Rechazado",
    },
  ],
  "2026-03-16": [
    {
      id: "r6",
      proy: "PRY-2025-002",
      act: "Revisión planos",
      tipo: "DN",
      horas: 7,
      fecha: "2026-03-16",
      comentario: "Revisión isométricos líneas vapor",
      estado: "Registrado",
    },
    {
      id: "r7",
      proy: "PRY-2024-001",
      act: "Informes técnicos",
      tipo: "HA",
      horas: 1.5,
      fecha: "2026-03-16",
      comentario: "Informe ejecutivo Q1",
      estado: "Registrado",
    },
  ],
  "2026-03-12": [
    {
      id: "r8",
      proy: "PRY-2024-001",
      act: "Supervisión en campo",
      tipo: "DN",
      horas: 8.5,
      fecha: "2026-03-12",
      comentario: "Supervisión instalación estructura metálica",
      aprobador: "Carlos Méndez",
      estado: "Aprobado",
    },
  ],
  "2026-03-09": [
    {
      id: "r9",
      proy: "PRY-2024-001",
      act: "Diseño estructural",
      tipo: "DN",
      horas: 8,
      fecha: "2026-03-09",
      comentario: "Modelado estructura metálica nivel 2",
      aprobador: "Carlos Méndez Rojas",
      estado: "Aprobado",
    },
  ],
  "2026-03-10": [
    {
      id: "r10",
      proy: "PRY-2024-001",
      act: "Supervisión en campo",
      tipo: "HFDT",
      horas: 6.5,
      fecha: "2026-03-10",
      comentario: "Inspección avance de obra",
      aprobador: "Carlos Méndez Rojas",
      estado: "Aprobado",
    },
    {
      id: "r11",
      proy: "PRY-2024-001",
      act: "Informes técnicos",
      tipo: "HED",
      horas: 2,
      fecha: "2026-03-10",
      comentario: "Cierre informe mensual",
      aprobador: "Carlos Méndez Rojas",
      estado: "Aprobado",
    },
  ],
  "2026-03-11": [
    {
      id: "r12",
      proy: "PRY-2024-003",
      act: "Inspección eléctrica",
      tipo: "HA",
      horas: 7,
      fecha: "2026-03-11",
      comentario: "Pruebas tableros zona norte",
      aprobador: "Carlos Méndez Rojas",
      estado: "Aprobado",
    },
    {
      id: "r13",
      proy: "PRY-2024-003",
      act: "Pruebas de equipos",
      tipo: "HA",
      horas: 1.5,
      fecha: "2026-03-11",
      comentario: "Ensayo adicional solicitado",
      comentarioRechazo: "Sin soporte de autorización",
      estado: "Rechazado",
    },
  ],
  "2026-03-13": [
    {
      id: "r14",
      proy: "PRY-2025-002",
      act: "Ingeniería de proceso",
      tipo: "RF",
      horas: 5,
      fecha: "2026-03-13",
      comentario: "Balance de masa unidad 2",
      estado: "Registrado",
    },
    {
      id: "r15",
      proy: "PRY-2025-002",
      act: "Modelado 3D",
      tipo: "HED",
      horas: 3,
      fecha: "2026-03-13",
      comentario: "Avance modelo 3D para entrega",
      estado: "Registrado",
    },
  ],
};

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

/** Fecha «hoy» para toda la app demo. Usa el reloj del sistema (no viene de BD). */
function fechaReferenciaHoy(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

export const HOY_MOCK = fechaReferenciaHoy();
export const CALENDARIO_MES = new Date(
  HOY_MOCK.getFullYear(),
  HOY_MOCK.getMonth(),
  1,
);

export function cloneInitialRegistros(): Record<string, RegistroMock[]> {
  return JSON.parse(JSON.stringify(REGISTROS_MOCK)) as Record<
    string,
    RegistroMock[]
  >;
}

export function findRegistroById(
  registros: Record<string, RegistroMock[]>,
  id: string,
): RegistroMock | null {
  for (const arr of Object.values(registros)) {
    const found = arr.find((r) => r.id === id);
    if (found) return found;
  }
  return null;
}

export function getMesActualBounds(hoy: Date = HOY_MOCK) {
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

export function inferSubproyecto(
  proyId: string,
  act: string,
  subproy?: string,
): string {
  if (subproy) return subproy;
  const data = JER_TIEMPO[proyId];
  if (!data) return "";
  for (const [sub, acts] of Object.entries(data.subs)) {
    if (acts.includes(act)) return sub;
  }
  return "";
}

export function getResumenHoras(
  registros: Record<string, RegistroMock[]> = REGISTROS_MOCK,
) {
  let aprob = 0;
  let rev = 0;
  let rech = 0;

  Object.values(registros)
    .flat()
    .forEach((r) => {
      const h = r.horas || 0;
      if (r.estado === "Aprobado") aprob += h;
      else if (
        r.estado === "Registrado" ||
        r.estado === "Nuevo" ||
        r.estado === "En revisión"
      )
        rev += h;
      else if (r.estado === "Rechazado") rech += h;
    });

  const round = (x: number) => Math.round(x * 10) / 10;
  const reportadas = round(aprob + rev + rech);

  return {
    horasMes: META_HORAS_MES,
    pendientesReportar: round(META_HORAS_MES - reportadas),
    reportadas,
    aprobadas: round(aprob),
    pendAprobacion: round(rev),
    rechazadas: round(rech),
  };
}

import type { IconName } from "@/src/components/ui/Icon";

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
    c: "#0f766e",
    b: "#ccfbf1",
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
  HFDT: {
    s: "Festiva Diurna",
    n: "Hora Festiva Diurna Trabajada (180%) - Colombia",
    c: "#c2410c",
    b: "#ffedd5",
    cat: "extra",
    icon: "sun",
  },
  HFNT: {
    s: "Festiva Nocturna",
    n: "Hora Festiva Nocturna Trabajada (215%) - Colombia",
    c: "#c2410c",
    b: "#ffedd5",
    cat: "extra",
    icon: "moon",
  },
  RF: {
    s: "Recargo Festivo",
    n: "Recargo Festivo (80%) HMV",
    c: "#1d4ed8",
    b: "#dbeafe",
    cat: "extra",
    icon: "flag",
  },
  RN: {
    s: "Recargo Nocturno",
    n: "Recargo Nocturno (35%) - Colombia",
    c: "#1d4ed8",
    b: "#dbeafe",
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

export function tipoLabel(tipo: string): string {
  const m = getTipoHoraMeta(tipo);
  return m.s || tipo;
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

export function getEstadoDia(diaRegs: RegistroMock[]): RegistroEstado {
  const estados = diaRegs.map((r) => r.estado);
  if (estados.includes("Rechazado")) return "Rechazado";
  if (estados.some((e) => e === "Registrado" || e === "Nuevo")) return "Registrado";
  if (estados.every((e) => e === "Aprobado")) return "Aprobado";
  if (estados.includes("En revisión")) return "En revisión";
  return "Registrado";
}

export function getRegistrosDia(
  registros: Record<string, RegistroMock[]>,
  fechaStr: string,
): RegistroMock[] {
  return registros[fechaStr] ?? [];
}

function getLineasDia(
  registros: Record<string, RegistroMock[]>,
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
  registros: Record<string, RegistroMock[]>,
  fechaStr: string,
): DiaResumen | null {
  const diaRegs = getRegistrosDia(registros, fechaStr);
  if (!diaRegs.length) return null;

  const total = diaRegs.reduce((a, r) => a + r.horas, 0);

  return {
    total,
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
  registros: Record<string, RegistroMock[]>,
  fechaStr: string,
  excludeId?: string,
): number {
  return getRegistrosDia(registros, fechaStr)
    .filter((r) => r.id !== excludeId && tipoCat(r.tipo) === "normal")
    .reduce((s, r) => s + r.horas, 0);
}

export function isDiaHistorial(
  registros: Record<string, RegistroMock[]>,
  fechaStr: string,
): boolean {
  const regs = getRegistrosDia(registros, fechaStr);
  if (!regs.length) return false;
  return regs.every(
    (r) => r.estado === "Aprobado" || r.estado === "Rechazado",
  );
}

export type HistorialDia = {
  fecha: string;
  registros: RegistroMock[];
  totalHoras: number;
};

export function getHistorialDias(
  registros: Record<string, RegistroMock[]> = REGISTROS_MOCK,
): HistorialDia[] {
  const data = Object.values(registros)
    .flat()
    .filter((r) => r.estado === "Aprobado" || r.estado === "Rechazado");

  const porDia: Record<string, RegistroMock[]> = {};
  data.forEach((r) => {
    if (!porDia[r.fecha]) porDia[r.fecha] = [];
    porDia[r.fecha].push(r);
  });

  return Object.keys(porDia)
    .sort((a, b) => b.localeCompare(a))
    .map((fecha) => {
      const registros = porDia[fecha];

      return {
        fecha,
        registros,
        totalHoras: registros.reduce((s, r) => s + r.horas, 0),
      };
    });
}

export function formatFechaHistorial(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = dt
    .toLocaleDateString("es-ES", { weekday: "short" })
    .replace(".", "");
  const mes = dt
    .toLocaleDateString("es-ES", { month: "short" })
    .replace(".", "");
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return { dia: d, wd: cap(wd), mes: cap(mes), anio: y };
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
  registros: Record<string, RegistroMock[]>,
  hoy: Date = HOY_MOCK,
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
