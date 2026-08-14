export type RegistroEstado =
  | "Borrador"
  | "Lanzado"
  | "Aprobado"
  | "Rechazado";

/** Metadatos IFS para EmpPortalTimeUpdateList / EmpPortalTimeDeleteList. */
export type RegistroIfsMeta = {
  module: string;
  objid: string;
  objversion: string;
  projectTransactionSeq?: number;
};

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
  /** Presente en filas leídas de GetEmployeeTimesheet. */
  ifs?: RegistroIfsMeta;
};

export type ProyectoMock = {
  id: string;
  nombre: string;
  sub: string;
};

export const PROYECTOS: ProyectoMock[] = [
  {
    id: "PRY-2024-001",
    nombre: "Modernización PTF Cusiana – Bloque B",
    sub: "Ecopetrol S.A.",
  },
  {
    id: "PRY-2024-003",
    nombre: "Renovación Subestación La Loma 500 kV",
    sub: "ISA Intercolombia",
  },
  {
    id: "PRY-2025-002",
    nombre: "Obras Civiles Mina Sur – Fase III",
    sub: "Cerrejón",
  },
];

export type JerTiempoEntry = {
  aprobador: string;
  subs: Record<string, string[]>;
};

export const JER_TIEMPO: Record<string, JerTiempoEntry> = {
  "PRY-2024-001": {
    aprobador: "Carlos Méndez Rojas",
    subs: {
      "SUB-101 · Obra civil y estructuras": [
        "Diseño estructural",
        "Supervisión en campo",
      ],
      "SUB-102 · Ingeniería y documentación": [
        "Informes técnicos",
        "Reuniones cliente",
      ],
    },
  },
  "PRY-2024-003": {
    aprobador: "Carlos Méndez Rojas",
    subs: {
      "SUB-201 · Equipos de potencia": [
        "Inspección eléctrica",
        "Pruebas de equipos",
      ],
      "SUB-202 · Protecciones y control": ["Documentación", "Coordinación"],
    },
  },
  "PRY-2025-002": {
    aprobador: "Laura Gómez Díaz",
    subs: {
      "SUB-301 · Movimiento de tierras": [
        "Ingeniería de proceso",
        "Modelado 3D",
      ],
      "SUB-302 · Infraestructura vial mina": [
        "Revisión planos",
        "Gestión cambios",
      ],
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

const MOCK_COMENTARIOS = [
  "Avance conforme al cronograma.",
  "Revisión técnica del entregable.",
  "Coordinación con el cliente.",
  "Trabajo de campo del día.",
  "Cierre de pendientes de la semana.",
  "Ajustes solicitados por interventoría.",
];

function mockActs(proyId: string): string[] {
  const jer = JER_TIEMPO[proyId];
  if (!jer) return ["Actividad general"];
  return Object.values(jer.subs).flat();
}

function mockEstado(monthOffset: number, seed: number): RegistroEstado {
  const roll = seed % 20;
  if (monthOffset <= -1) {
    if (roll === 0) return "Rechazado";
    if (roll < 3) return "Lanzado";
    return "Aprobado";
  }
  if (roll < 5) return "Borrador";
  if (roll < 10) return "Lanzado";
  if (roll === 10) return "Rechazado";
  return "Aprobado";
}

function mockSubproy(proyId: string, act: string): string {
  const data = JER_TIEMPO[proyId];
  if (!data) return "";
  for (const [sub, acts] of Object.entries(data.subs)) {
    if (acts.includes(act)) return sub;
  }
  return "";
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function isoFecha(y: number, m: number, d: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function isDiaLaborable(fecha: string, y: number, m: number, d: number): boolean {
  if (FESTIVOS_2026.includes(fecha)) return false;
  const dow = new Date(y, m, d).getDay();
  return dow !== 0 && dow !== 6;
}

/** Mes actual: como si el empleado hubiera registrado todos los días hábiles hasta hoy. */
function mockEstadoMesActual(d: number, hoyDia: number, seed: number): RegistroEstado {
  if (d === hoyDia) return "Borrador";
  const diasAtras = hoyDia - d;
  if (diasAtras <= 2) return "Lanzado";
  if (diasAtras === 4 && mod(seed, 7) === 0) return "Rechazado";
  return "Aprobado";
}

function horasDelDia(seed: number): { tipo: string; horas: number }[] {
  if (mod(seed, 6) === 0) {
    return [
      { tipo: "DN", horas: 4 },
      { tipo: "DN", horas: 4 },
    ];
  }
  if (mod(seed, 11) === 0) {
    return [
      { tipo: "DN", horas: 6 },
      { tipo: "HED", horas: 2 },
    ];
  }
  return [{ tipo: "DN", horas: 8 }];
}

function appendRegistroRows(
  out: Record<string, RegistroMock[]>,
  fecha: string,
  rows: RegistroMock[],
): void {
  if (rows.length) out[fecha] = rows;
}

function buildRegistroRow(
  seq: { n: number },
  fecha: string,
  seed: number,
  slot: number,
  proyIds: string[],
  estado: RegistroEstado,
  slotHoras: { tipo: string; horas: number },
  overrides?: { proy?: string; act?: string; comentario?: string },
): RegistroMock {
  const seedKey = seed + slot * 17;
  const proy = overrides?.proy ?? proyIds[mod(seedKey, proyIds.length)];
  const acts = mockActs(proy);
  const act = overrides?.act ?? acts[mod(seedKey, acts.length)];
  const jer = JER_TIEMPO[proy];

  const row: RegistroMock = {
    id: `r${seq.n++}`,
    proy,
    subproy: mockSubproy(proy, act) || undefined,
    act,
    tipo: slotHoras.tipo,
    horas: slotHoras.horas,
    fecha,
    comentario:
      overrides?.comentario ??
      MOCK_COMENTARIOS[mod(seedKey, MOCK_COMENTARIOS.length)],
    estado,
  };

  if (estado === "Aprobado" || estado === "Lanzado") {
    row.aprobador = jer?.aprobador;
  }
  if (estado === "Rechazado") {
    row.comentarioRechazo = "Falta documentación de soporte.";
    row.aprobador = jer?.aprobador;
  }

  return row;
}

type DiaVariadoSpec = {
  estado: RegistroEstado;
  comentarioRechazo?: string;
  entries: {
    proy: string;
    act: string;
    tipo: string;
    horas: number;
    comentario?: string;
  }[];
};

/** Últimos N días hábiles (incl. hoy), del más antiguo al más reciente. */
function getUltimosDiasLaborables(hoy: Date, count: number): string[] {
  const fechas: string[] = [];
  const cursor = new Date(hoy);

  while (fechas.length < count) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const d = cursor.getDate();
    const fecha = isoFecha(y, m, d);
    if (isDiaLaborable(fecha, y, m, d)) fechas.unshift(fecha);
    cursor.setDate(cursor.getDate() - 1);
  }

  return fechas;
}

/** Una semana reciente con mix de tipos de hora y estados para demo. */
function applySemanaVariada(
  out: Record<string, RegistroMock[]>,
  hoy: Date,
  seq: { n: number },
  proyIds: string[],
): void {
  const fechas = getUltimosDiasLaborables(hoy, 5);
  if (fechas.length < 5) return;

  const specs: DiaVariadoSpec[] = [
    {
      estado: "Aprobado",
      entries: [
        {
          proy: "PRY-2024-001",
          act: "Supervisión en campo",
          tipo: "DN",
          horas: 6,
          comentario: "Inspección de avance en obra.",
        },
        {
          proy: "PRY-2024-003",
          act: "Inspección eléctrica",
          tipo: "HED",
          horas: 2,
          comentario: "Cierre de jornada con horas extra.",
        },
      ],
    },
    {
      estado: "Aprobado",
      entries: [
        {
          proy: "PRY-2025-002",
          act: "Ingeniería de proceso",
          tipo: "DN",
          horas: 4,
        },
        {
          proy: "PRY-2024-001",
          act: "Reuniones cliente",
          tipo: "HA",
          horas: 2,
          comentario: "Coordinación con interventoría.",
        },
        {
          proy: "PRY-2024-001",
          act: "Informes técnicos",
          tipo: "HEN",
          horas: 2,
          comentario: "Entrega nocturna de informe.",
        },
      ],
    },
    {
      estado: "Lanzado",
      entries: [
        {
          proy: "PRY-2024-003",
          act: "Documentación",
          tipo: "DN",
          horas: 5,
        },
        {
          proy: "PRY-2024-003",
          act: "Pruebas de equipos",
          tipo: "HED",
          horas: 3,
          comentario: "Enviado a aprobación del gerente.",
        },
      ],
    },
    {
      estado: "Rechazado",
      comentarioRechazo: "Adjuntar acta de reunión firmada por el cliente.",
      entries: [
        {
          proy: "PRY-2025-002",
          act: "Modelado 3D",
          tipo: "DN",
          horas: 6,
        },
        {
          proy: "PRY-2025-002",
          act: "Revisión planos",
          tipo: "HEFD",
          horas: 2,
          comentario: "Sábado en campo — falta soporte.",
        },
      ],
    },
    {
      estado: "Borrador",
      entries: [
        {
          proy: "PRY-2024-001",
          act: "Diseño estructural",
          tipo: "DN",
          horas: 4,
          comentario: "Avance parcial del día.",
        },
        {
          proy: "PRY-2024-003",
          act: "Coordinación",
          tipo: "HFDT",
          horas: 2,
        },
        {
          proy: "PRY-2025-002",
          act: "Gestión cambios",
          tipo: "RF",
          horas: 1,
          comentario: "Recargo festivo pendiente de envío.",
        },
        {
          proy: "PRY-2024-001",
          act: "Informes técnicos",
          tipo: "HA",
          horas: 1,
        },
      ],
    },
  ];

  fechas.forEach((fecha, index) => {
    const spec = specs[index];
    if (!spec) return;

    const seed = 9000 + index;
    out[fecha] = spec.entries.map((entry, slot) => {
      const row = buildRegistroRow(
        seq,
        fecha,
        seed,
        slot,
        proyIds,
        spec.estado,
        { tipo: entry.tipo, horas: entry.horas },
        {
          proy: entry.proy,
          act: entry.act,
          comentario: entry.comentario,
        },
      );
      if (spec.estado === "Rechazado" && spec.comentarioRechazo) {
        row.comentarioRechazo = spec.comentarioRechazo;
      }
      return row;
    });
  });
}

/** Últimos 3 meses; mes actual completo (días hábiles hasta hoy). */
function buildRegistrosMock(hoy: Date): Record<string, RegistroMock[]> {
  const out: Record<string, RegistroMock[]> = {};
  const proyIds = PROYECTOS.map((p) => p.id);
  const seq = { n: 1 };

  for (let monthOffset = -2; monthOffset <= 0; monthOffset++) {
    const monthStart = new Date(hoy.getFullYear(), hoy.getMonth() + monthOffset, 1);
    const y = monthStart.getFullYear();
    const m = monthStart.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const mesActual = monthOffset === 0;

    for (let d = 1; d <= daysInMonth; d++) {
      if (mesActual && d > hoy.getDate()) continue;

      const fecha = isoFecha(y, m, d);
      if (!isDiaLaborable(fecha, y, m, d)) continue;

      // Meses anteriores: muestra parcial; mes actual: todos los días hábiles.
      if (!mesActual && (d + m) % 2 !== 0) continue;

      const seed = d + monthOffset * 31;
      const slots = mesActual ? horasDelDia(seed) : d % 5 === 0 ? [{ tipo: "DN", horas: 4 }, { tipo: "DN", horas: 4 }] : [{ tipo: mod(seed, 9) === 0 ? "HED" : "DN", horas: mod(seed, 3) === 0 ? 8 : 4 }];
      const estado = mesActual
        ? mockEstadoMesActual(d, hoy.getDate(), seed)
        : mockEstado(monthOffset, Math.abs(seed));

      const rows = slots.map((slotHoras, i) =>
        buildRegistroRow(
          seq,
          fecha,
          seed,
          i,
          proyIds,
          estado,
          slotHoras,
        ),
      );

      appendRegistroRows(out, fecha, rows);
    }
  }

  applySemanaVariada(out, hoy, seq, proyIds);

  return out;
}

export const REGISTROS_MOCK = buildRegistrosMock(HOY_MOCK);

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

function toIsoDateLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Suma días a una fecha ISO (yyyy-mm-dd) sin salir del mes actual. */
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
      else if (r.estado === "Borrador" || r.estado === "Lanzado") rev += h;
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
  if (TIPO_HORA[tipo]) return TIPO_HORA[tipo];
  const short =
    tipo.length > 14 ? `${tipo.slice(0, 13).trimEnd()}…` : tipo || "—";
  return {
    ...TIPO_HORA_DEFAULT,
    /** Vacío: el pill puede usar `label` IFS corto; si no, cae al code. */
    s: "",
    n: tipo || short,
  };
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
  if (estados.some((e) => e === "Borrador")) return "Borrador";
  if (estados.every((e) => e === "Aprobado")) return "Aprobado";
  if (estados.includes("Lanzado")) return "Lanzado";
  return "Borrador";
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

export type ListaRegistroDia = {
  fecha: string;
  registros: RegistroMock[];
  totalHoras: number;
};

/** @deprecated Usar getListaRegistrosPorDia en tiempo-registro-rules. */
export type HistorialDia = ListaRegistroDia;

/** @deprecated Usar getListaRegistrosPorDia. */
export function getHistorialDias(
  registros: Record<string, RegistroMock[]> = REGISTROS_MOCK,
): ListaRegistroDia[] {
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
      const dayRows = porDia[fecha];
      return {
        fecha,
        registros: dayRows,
        totalHoras: dayRows.reduce((s, r) => s + r.horas, 0),
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
