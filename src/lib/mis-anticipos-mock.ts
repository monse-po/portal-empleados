import { HOY_MOCK } from "@/src/lib/mi-tiempo-mock";

/** Estados del flujo empleado (maqueta 04/06/2026) */
export type AnticipoEstado =
  | "Lanzado"
  | "Aprobado"
  | "Pagado"
  | "Rechazado"
  | "Cancelado";

export type AnticipoTipo = "Gasto" | "Viaje";

export type AnticipoTab = "pendientes" | "disponibles";

export type Anticipo = {
  no: string;
  fecha: string;
  proy: string;
  proyN: string;
  tipo: AnticipoTipo;
  monto: number;
  div: string;
  estado: AnticipoEstado;
  /** true = Historial · false = En proceso */
  disponible: boolean;
  motivo: string;
  fechaAprob: string | null;
  aprobador: string | null;
  pago: string;
  solicitante?: string;
  solicitanteId?: string;
  beneficiarioId?: string;
  beneficiarioNombre?: string;
  /** true = solicitante registró a nombre de otro empleado */
  paraOtro?: boolean;
  cedula?: string;
};

export type TimelineItem = {
  accion: string;
  usuario: string;
  fecha: string;
  icon: "send" | "clock" | "check" | "x" | "ban" | "info";
  color: string;
};

export type AnticipoExtra = {
  compania: string;
  empCompania: string;
  empId: string;
  ifsRef?: string;
  aprobadoPor?: string;
  fechaIda?: string;
  fechaRegreso?: string;
  destino?: string;
  tipoViaje?: "nacional" | "internacional";
  tl: TimelineItem[];
};

export const SESSION_EMPLEADO = {
  nombre: "Carlos Rivas Mora",
  cedula: "1.023.456.789",
  companiaDefault: "HMVINGCO",
};

export const EMP_DET = {
  cedula: "1.023.456.789",
  nombre: "Carlos Rivas Mora",
  cuenta: "4567890123",
  banco: "Bancolombia",
  tipoCuenta: "Ahorros",
  empresa: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)",
};

export const COMPANIAS = [
  { id: "HMVINGCO", label: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)" },
  { id: "HMVMEX", label: "HMV Ingenieros México S.A. de C.V." },
  { id: "HMVPERU", label: "HMV Ingenieros Perú S.A.C." },
] as const;

export const DIVISAS_POR_COMPANIA: Record<
  string,
  { code: string; label: string; pre: string }[]
> = {
  HMVINGCO: [
    { code: "COP", label: "COP – Pesos colombianos", pre: "$" },
    { code: "USD", label: "USD – Dólar", pre: "US$" },
  ],
  HMVMEX: [
    { code: "MXN", label: "MXN – Peso mexicano", pre: "$" },
    { code: "USD", label: "USD – Dólar", pre: "US$" },
  ],
  HMVPERU: [
    { code: "PEN", label: "PEN – Sol peruano", pre: "S/" },
    { code: "USD", label: "USD – Dólar", pre: "US$" },
  ],
};

export const PROYECTOS_ANT = [
  { id: "PRY2024001", nombre: "Construcción Planta Norte", sub: "Ecopetrol" },
  { id: "PRY2024003", nombre: "Mantenimiento Subestación 115kV", sub: "ISA" },
  { id: "PRY2025002", nombre: "Ingeniería de Detalle Refinería", sub: "Reficar" },
] as const;

export type LovItem = {
  id: string;
  nombre: string;
  sub: string;
};

export const COMPANIAS_HMV: LovItem[] = [
  { id: "HMVINGCO", nombre: "HMV Ingenieros Ltda.", sub: "Colombia" },
  { id: "HMVMEX", nombre: "HMV Ingenieros México S.A. de C.V.", sub: "México" },
  { id: "HMVPERU", nombre: "HMV Ingenieros Perú S.A.C.", sub: "Perú" },
  { id: "HMVCHL", nombre: "HMV Ingenieros Chile SpA", sub: "Chile" },
  { id: "HMVECUAD", nombre: "HMV Ingenieros Ecuador S.A.", sub: "Ecuador" },
];

export type EmpleadoAnticipo = LovItem & {
  banco: string;
  tipo: string;
  cuenta: string;
  empresa: string;
  companias: { id: string; label: string }[];
};

export const EMPLEADOS_ANT: EmpleadoAnticipo[] = [
  {
    id: "1023456789",
    nombre: "Carlos Rivas Mora",
    sub: "EMP-001",
    banco: "Bancolombia",
    tipo: "Ahorros",
    cuenta: "4567890123",
    empresa: "HMVINGCO",
    companias: [
      { id: "HMVINGCO", label: "HMV Ingenieros Ltda. (Colombia)" },
      { id: "HMVCHL", label: "HMV Ingenieros Chile SpA" },
    ],
  },
  {
    id: "52874391",
    nombre: "María Fernanda López Torres",
    sub: "EMP-002",
    banco: "Davivienda",
    tipo: "Corriente",
    cuenta: "234-561234-5",
    empresa: "HMVINGCO",
    companias: [
      { id: "HMVINGCO", label: "HMV Ingenieros Ltda. (Colombia)" },
      { id: "HMVMEX", label: "HMV Ingenieros México S.A. de C.V." },
    ],
  },
  {
    id: "80341256",
    nombre: "Carlos Andrés Martínez Ruiz",
    sub: "EMP-003",
    banco: "BBVA",
    tipo: "Ahorros",
    cuenta: "891-234567-8",
    empresa: "HMVMEX",
    companias: [{ id: "HMVMEX", label: "HMV Ingenieros México S.A. de C.V." }],
  },
];

export type DestinoSel = {
  ciudad: string;
  dpto: string;
  pais: string;
  pCode: string;
  label: string;
};

export const DEST_CATALOG: Record<
  string,
  { nombre: string; departamentos: Record<string, { nombre: string; ciudades: string[] }> }
> = {
  CO: {
    nombre: "Colombia",
    departamentos: {
      ANT: { nombre: "Antioquia", ciudades: ["Medellín", "Bello", "Envigado"] },
      CUN: { nombre: "Cundinamarca", ciudades: ["Bogotá", "Chía", "Zipaquirá"] },
      VAC: { nombre: "Valle del Cauca", ciudades: ["Cali", "Palmira", "Buenaventura"] },
      ATL: { nombre: "Atlántico", ciudades: ["Barranquilla", "Soledad"] },
    },
  },
  US: {
    nombre: "Estados Unidos",
    departamentos: {
      FL: { nombre: "Florida", ciudades: ["Miami", "Orlando", "Tampa"] },
      TX: { nombre: "Texas", ciudades: ["Houston", "Dallas", "Austin"] },
    },
  },
  MX: {
    nombre: "México",
    departamentos: {
      CMX: { nombre: "Ciudad de México", ciudades: ["Ciudad de México", "Coyoacán"] },
      JAL: { nombre: "Jalisco", ciudades: ["Guadalajara", "Zapopan"] },
    },
  },
};

export function getEmpleadosPorEmpresa(empresaId: string): EmpleadoAnticipo[] {
  return EMPLEADOS_ANT.filter((e) => e.empresa === empresaId);
}

export function searchDestinos(query: string): DestinoSel[] {
  const q = query.trim().toLowerCase();
  const resultados: DestinoSel[] = [];
  for (const [pCode, pData] of Object.entries(DEST_CATALOG)) {
    for (const dData of Object.values(pData.departamentos)) {
      for (const ciudad of dData.ciudades) {
        resultados.push({
          ciudad,
          dpto: dData.nombre,
          pais: pData.nombre,
          pCode,
          label: `${ciudad}, ${dData.nombre}`,
        });
      }
    }
  }
  if (q) {
    return resultados.filter(
      (r) =>
        r.ciudad.toLowerCase().includes(q) ||
        r.dpto.toLowerCase().includes(q) ||
        r.pais.toLowerCase().includes(q),
    );
  }
  return resultados.filter((r) => r.pCode === "CO").slice(0, 8);
}

export function fmtMontoInput(value: string): string {
  const v = parseFloat(value.replace(/[.,]/g, "")) || 0;
  return v > 0 ? v.toLocaleString("es-CO") : "";
}

export function parseMontoInput(value: string): number {
  return parseFloat(value.replace(/[.,]/g, "")) || 0;
}

export const APROBADORES: Record<string, string> = {
  JCGO: "Carlos Méndez",
  MFLZ: "Marco F. López",
  ARGU: "Ana Rodríguez",
  LLINO: "Laura Lino",
};

/** Director de proyecto = aprobador asignado por código de proyecto */
export const DIRECTOR_POR_PROY: Record<
  string,
  { codigo: string; nombre: string }
> = {
  PRY2024001: { codigo: "JCGO", nombre: APROBADORES.JCGO },
  PRY2024003: { codigo: "ARGU", nombre: APROBADORES.ARGU },
  PRY2025002: { codigo: "MFLZ", nombre: APROBADORES.MFLZ },
};

export function getDirectorProyecto(proyId: string | null | undefined) {
  if (!proyId) return null;
  return DIRECTOR_POR_PROY[proyId] ?? null;
}

export const PRE_MAP: Record<string, string> = {
  COP: "$",
  USD: "US$",
  MXN: "$",
  PEN: "S/",
};

/** Estados por tab En proceso / Historial */
export const ESTADOS_POR_TAB: Record<AnticipoTab, AnticipoEstado[]> = {
  pendientes: ["Lanzado", "Aprobado"],
  disponibles: ["Pagado", "Rechazado", "Cancelado"],
};

/** Mis Anticipos — En proceso (sin columna Pago). Tabla con scroll horizontal. */
export const ANTICIPOS_TABLE_MIN_W_PEND = "1280px" as const;

export const ANTICIPOS_COLS_PEND = [
  "72px",   // Código
  "88px",   // Fecha
  "200px",  // Proyecto
  "80px",   // Tipo
  "280px",  // Beneficiario + Solicitado por
  "108px",  // Monto
  "240px",  // Motivo
  "92px",   // Estado
  "180px",  // Aprobador
] as const;

/** Mis Anticipos — Historial (columna Pagado) */
export const ANTICIPOS_TABLE_MIN_W_HIST = "1380px" as const;

export const ANTICIPOS_COLS_HIST = [
  "72px",   // Código
  "88px",   // Fecha
  "190px",  // Proyecto
  "80px",   // Tipo
  "260px",  // Beneficiario
  "108px",  // Monto
  "220px",  // Motivo
  "92px",   // Estado
  "88px",   // Pagado
  "172px",  // Aprobador
] as const;

export function normalizeAnticipoId(id: string): string {
  return id.replace(/\./g, "");
}

export function getAnticipoBeneficiarioId(a: Anticipo): string {
  return (
    a.beneficiarioId ??
    normalizeAnticipoId(a.cedula ?? SESSION_EMPLEADO.cedula)
  );
}

export function getAnticipoSolicitanteId(a: Anticipo): string {
  return a.solicitanteId ?? getAnticipoBeneficiarioId(a);
}

export function anticipoVisibleParaSession(a: Anticipo): boolean {
  const sessionId = normalizeAnticipoId(SESSION_EMPLEADO.cedula);
  return (
    getAnticipoBeneficiarioId(a) === sessionId ||
    getAnticipoSolicitanteId(a) === sessionId
  );
}

export function getBeneficiarioNombre(a: Anticipo): string {
  return a.beneficiarioNombre ?? getBeneficiarioDetalle(a).nombre;
}

/** Solo cuando otro empleado registró la solicitud a nombre del usuario */
export function getBeneficiarioSolicitante(a: Anticipo): string | null {
  const sessionId = normalizeAnticipoId(SESSION_EMPLEADO.cedula);
  const solId = getAnticipoSolicitanteId(a);
  if (solId !== sessionId && a.solicitante) {
    return a.solicitante;
  }
  return null;
}

export function getBeneficiarioDetalle(a: Anticipo) {
  const id = getAnticipoBeneficiarioId(a);
  const emp = EMPLEADOS_ANT.find((e) => e.id === id);
  if (emp) {
    return {
      cedula: emp.id,
      nombre: emp.nombre,
      cuenta: emp.cuenta,
      banco: emp.banco,
      tipoCuenta: emp.tipo,
    };
  }
  if (id === normalizeAnticipoId(SESSION_EMPLEADO.cedula)) {
    return {
      cedula: EMP_DET.cedula,
      nombre: EMP_DET.nombre,
      cuenta: EMP_DET.cuenta,
      banco: EMP_DET.banco,
      tipoCuenta: EMP_DET.tipoCuenta,
    };
  }
  return {
    cedula: a.cedula ?? "—",
    nombre: a.beneficiarioNombre ?? "—",
    cuenta: "—",
    banco: "—",
    tipoCuenta: "—",
  };
}

/** IDs mock empleados — visibilidad R-01 en lista Carlos Rivas */
const SEED_EMP = {
  carlos: {
    id: "1023456789",
    nombre: "Carlos Rivas Mora",
    cedula: "1.023.456.789",
  },
  maria: {
    id: "52874391",
    nombre: "María Fernanda López Torres",
    cedula: "52874391",
  },
  martinez: {
    id: "80341256",
    nombre: "Carlos Andrés Martínez Ruiz",
    cedula: "80341256",
  },
} as const;

function seedPropio(
  base: Omit<
    Anticipo,
    | "solicitante"
    | "solicitanteId"
    | "beneficiarioId"
    | "beneficiarioNombre"
    | "cedula"
    | "paraOtro"
  >,
): Anticipo {
  return {
    ...base,
    solicitante: SEED_EMP.carlos.nombre,
    solicitanteId: SEED_EMP.carlos.id,
    beneficiarioId: SEED_EMP.carlos.id,
    beneficiarioNombre: SEED_EMP.carlos.nombre,
    cedula: SEED_EMP.carlos.cedula,
    paraOtro: false,
  };
}

function seedParaOtro(
  base: Omit<
    Anticipo,
    | "solicitante"
    | "solicitanteId"
    | "beneficiarioId"
    | "beneficiarioNombre"
    | "cedula"
    | "paraOtro"
  >,
  solicitante: (typeof SEED_EMP)[keyof typeof SEED_EMP],
  beneficiario: (typeof SEED_EMP)[keyof typeof SEED_EMP],
): Anticipo {
  return {
    ...base,
    solicitante: solicitante.nombre,
    solicitanteId: solicitante.id,
    beneficiarioId: beneficiario.id,
    beneficiarioNombre: beneficiario.nombre,
    cedula: beneficiario.cedula,
    paraOtro: solicitante.id !== beneficiario.id,
  };
}

const SEED_HISTORIAL: Anticipo[] = [
  {
    no: "AV1005",
    fecha: "28/03/2025",
    proy: "PRY2024003",
    proyN: "Mantenimiento Subestación 115kV",
    tipo: "Viaje",
    monto: 450_000,
    div: "COP",
    estado: "Lanzado",
    disponible: false,
    motivo: "Viaje técnico a Bogotá para reunión con ISA.",
    fechaAprob: null,
    aprobador: "MFLZ",
    pago: "Pendiente",
  },
  {
    no: "AG1004",
    fecha: "14/04/2025",
    proy: "PRY2025002",
    proyN: "Ingeniería de Detalle Refinería",
    tipo: "Gasto",
    monto: 780_000,
    div: "COP",
    estado: "Lanzado",
    disponible: false,
    motivo: "Papelería e impresión de planos.",
    fechaAprob: null,
    aprobador: "ARGU",
    pago: "Pendiente",
  },
  {
    no: "AV1006",
    fecha: "01/03/2025",
    proy: "PRY2025002",
    proyN: "Ingeniería de Detalle Refinería",
    tipo: "Viaje",
    monto: 620_000,
    div: "COP",
    estado: "Aprobado",
    disponible: false,
    motivo: "Visita técnica a proveedor en Medellín.",
    fechaAprob: "03/03/2025",
    aprobador: "ARGU",
    pago: "Pendiente",
  },
  {
    no: "AG1003",
    fecha: "08/01/2026",
    proy: "PRY2024001",
    proyN: "Construcción Planta Norte",
    tipo: "Gasto",
    monto: 950_000,
    div: "COP",
    estado: "Cancelado",
    disponible: true,
    motivo: "Gastos de campo enero 2026.",
    fechaAprob: null,
    aprobador: null,
    pago: "—",
  },
  {
    no: "AG1008",
    fecha: "12/01/2026",
    proy: "PRY2024001",
    proyN: "Construcción Planta Norte",
    tipo: "Gasto",
    monto: 1_200_000,
    div: "COP",
    estado: "Cancelado",
    disponible: true,
    motivo: "Compra de herramienta menor para obra.",
    fechaAprob: "14/01/2026",
    aprobador: "ARGU",
    pago: "—",
  },
  {
    no: "AG1002",
    fecha: "22/02/2025",
    proy: "PRY2024001",
    proyN: "Construcción Planta Norte",
    tipo: "Gasto",
    monto: 320_000,
    div: "COP",
    estado: "Rechazado",
    disponible: true,
    motivo: "Compra de materiales de ferretería.",
    fechaAprob: "25/02/2025",
    aprobador: "JCGO",
    pago: "—",
  },
  {
    no: "AG1007",
    fecha: "05/02/2025",
    proy: "PRY2024003",
    proyN: "Mantenimiento Subestación 115kV",
    tipo: "Gasto",
    monto: 480_000,
    div: "COP",
    estado: "Cancelado",
    disponible: true,
    motivo: "Compra de equipos de medición.",
    fechaAprob: null,
    aprobador: null,
    pago: "—",
  },
  {
    no: "AG1001",
    fecha: "15/01/2025",
    proy: "PRY2024001",
    proyN: "Construcción Planta Norte",
    tipo: "Gasto",
    monto: 1_500_000,
    div: "COP",
    estado: "Pagado",
    disponible: true,
    motivo: "Gastos de operación en campo.",
    fechaAprob: "20/01/2025",
    aprobador: "JCGO",
    pago: "Pagado",
  },
  {
    no: "AV1002",
    fecha: "03/02/2025",
    proy: "PRY2024003",
    proyN: "Mantenimiento Subestación 115kV",
    tipo: "Viaje",
    monto: 850_000,
    div: "COP",
    estado: "Pagado",
    disponible: true,
    motivo: "Viaje inspección subestación 115kV.",
    fechaAprob: "08/02/2025",
    aprobador: "MFLZ",
    pago: "Pagado",
  },
  {
    no: "AG1006",
    fecha: "10/03/2025",
    proy: "PRY2025002",
    proyN: "Ingeniería de Detalle Refinería",
    tipo: "Gasto",
    monto: 2_100_000,
    div: "COP",
    estado: "Pagado",
    disponible: true,
    motivo: "Materiales de laboratorio.",
    fechaAprob: "15/03/2025",
    aprobador: "ARGU",
    pago: "Pagado",
  },
  {
    no: "AG1009",
    fecha: "10/07/2026",
    proy: "PRY2024001",
    proyN: "Construcción Planta Norte",
    tipo: "Gasto",
    monto: 650_000,
    div: "COP",
    estado: "Lanzado",
    disponible: false,
    motivo: "Dotación de campo para supervisión en obra.",
    fechaAprob: null,
    aprobador: "JCGO",
    pago: "Pendiente",
    solicitante: "Carlos Rivas Mora",
    solicitanteId: "1023456789",
    beneficiarioId: "52874391",
    beneficiarioNombre: "María Fernanda López Torres",
    cedula: "52874391",
    paraOtro: true,
  },
  {
    no: "AG1010",
    fecha: "08/07/2026",
    proy: "PRY2025002",
    proyN: "Ingeniería de Detalle Refinería",
    tipo: "Gasto",
    monto: 420_000,
    div: "COP",
    estado: "Lanzado",
    disponible: false,
    motivo: "Viáticos de apoyo en visita a refinería.",
    fechaAprob: null,
    aprobador: "ARGU",
    pago: "Pendiente",
    solicitante: "María Fernanda López Torres",
    solicitanteId: "52874391",
    beneficiarioId: "1023456789",
    beneficiarioNombre: "Carlos Rivas Mora",
    cedula: "1.023.456.789",
    paraOtro: true,
  },
  seedPropio({
    no: "AG1011",
    fecha: "15/07/2026",
    proy: "PRY2024003",
    proyN: "Mantenimiento Subestación 115kV",
    tipo: "Gasto",
    monto: 540_000,
    div: "COP",
    estado: "Lanzado",
    disponible: false,
    motivo: "EPP y elementos de seguridad para cuadrilla en campo.",
    fechaAprob: null,
    aprobador: "MFLZ",
    pago: "Pendiente",
  }),
  seedPropio({
    no: "AV1012",
    fecha: "12/07/2026",
    proy: "PRY2024001",
    proyN: "Construcción Planta Norte",
    tipo: "Viaje",
    monto: 1_180_000,
    div: "COP",
    estado: "Aprobado",
    disponible: false,
    motivo: "Inspección en sitio Planta Norte — turno de supervisión.",
    fechaAprob: "14/07/2026",
    aprobador: "JCGO",
    pago: "Pendiente",
  }),
  seedParaOtro(
    {
      no: "AG1013",
      fecha: "11/07/2026",
      proy: "PRY2025002",
      proyN: "Ingeniería de Detalle Refinería",
      tipo: "Gasto",
      monto: 390_000,
      div: "COP",
      estado: "Lanzado",
      disponible: false,
      motivo: "Compra de consumibles para apoyo en oficina de obra.",
      fechaAprob: null,
      aprobador: "ARGU",
      pago: "Pendiente",
    },
    SEED_EMP.carlos,
    SEED_EMP.maria,
  ),
  seedParaOtro(
    {
      no: "AV1014",
      fecha: "09/07/2026",
      proy: "PRY2024003",
      proyN: "Mantenimiento Subestación 115kV",
      tipo: "Viaje",
      monto: 720_000,
      div: "COP",
      estado: "Aprobado",
      disponible: false,
      motivo: "Traslado técnico ISA Medellín — acompañamiento en campo.",
      fechaAprob: "10/07/2026",
      aprobador: "MFLZ",
      pago: "Pendiente",
    },
    SEED_EMP.carlos,
    SEED_EMP.maria,
  ),
  seedParaOtro(
    {
      no: "AG1015",
      fecha: "07/07/2026",
      proy: "PRY2024001",
      proyN: "Construcción Planta Norte",
      tipo: "Gasto",
      monto: 880_000,
      div: "COP",
      estado: "Aprobado",
      disponible: false,
      motivo: "Alimentación y transporte en jornadas extendidas de obra.",
      fechaAprob: "08/07/2026",
      aprobador: "JCGO",
      pago: "Pendiente",
    },
    SEED_EMP.maria,
    SEED_EMP.carlos,
  ),
  seedParaOtro(
    {
      no: "AV1016",
      fecha: "06/07/2026",
      proy: "PRY2025002",
      proyN: "Ingeniería de Detalle Refinería",
      tipo: "Viaje",
      monto: 1_050_000,
      div: "COP",
      estado: "Lanzado",
      disponible: false,
      motivo: "Viaje de verificación de avance con contratista local.",
      fechaAprob: null,
      aprobador: "ARGU",
      pago: "Pendiente",
    },
    SEED_EMP.martinez,
    SEED_EMP.carlos,
  ),
  seedParaOtro(
    {
      no: "AG1017",
      fecha: "05/07/2026",
      proy: "PRY2024001",
      proyN: "Construcción Planta Norte",
      tipo: "Gasto",
      monto: 610_000,
      div: "COP",
      estado: "Lanzado",
      disponible: false,
      motivo: "Anticipo herramienta menor para apoyo en levantamiento.",
      fechaAprob: null,
      aprobador: "JCGO",
      pago: "Pendiente",
    },
    SEED_EMP.carlos,
    SEED_EMP.martinez,
  ),
  seedPropio({
    no: "AG1018",
    fecha: "28/06/2026",
    proy: "PRY2025002",
    proyN: "Ingeniería de Detalle Refinería",
    tipo: "Gasto",
    monto: 1_350_000,
    div: "COP",
    estado: "Rechazado",
    disponible: true,
    motivo: "Equipos de cómputo portátil para oficina móvil.",
    fechaAprob: "30/06/2026",
    aprobador: "ARGU",
    pago: "—",
  }),
  seedParaOtro(
    {
      no: "AV1019",
      fecha: "20/06/2026",
      proy: "PRY2024003",
      proyN: "Mantenimiento Subestación 115kV",
      tipo: "Viaje",
      monto: 930_000,
      div: "COP",
      estado: "Pagado",
      disponible: true,
      motivo: "Desplazamiento a subestación para cierre de punch list.",
      fechaAprob: "25/06/2026",
      aprobador: "MFLZ",
      pago: "Pagado",
    },
    SEED_EMP.maria,
    SEED_EMP.carlos,
  ),
  seedParaOtro(
    {
      no: "AG1020",
      fecha: "15/06/2026",
      proy: "PRY2024001",
      proyN: "Construcción Planta Norte",
      tipo: "Gasto",
      monto: 470_000,
      div: "COP",
      estado: "Rechazado",
      disponible: true,
      motivo: "Suministros de oficina para apoyo administrativo en obra.",
      fechaAprob: "18/06/2026",
      aprobador: "JCGO",
      pago: "—",
    },
    SEED_EMP.carlos,
    SEED_EMP.maria,
  ),
  seedPropio({
    no: "AV1021",
    fecha: "10/06/2026",
    proy: "PRY2025002",
    proyN: "Ingeniería de Detalle Refinería",
    tipo: "Viaje",
    monto: 1_640_000,
    div: "COP",
    estado: "Pagado",
    disponible: true,
    motivo: "Viaje nacional a Cartagena — reunión con cliente Reficar.",
    fechaAprob: "14/06/2026",
    aprobador: "ARGU",
    pago: "Pagado",
  }),
  seedPropio({
    no: "AG1022",
    fecha: "02/06/2026",
    proy: "PRY2024003",
    proyN: "Mantenimiento Subestación 115kV",
    tipo: "Gasto",
    monto: 290_000,
    div: "COP",
    estado: "Cancelado",
    disponible: true,
    motivo: "Compra cancelada — duplicada con solicitud anterior.",
    fechaAprob: null,
    aprobador: null,
    pago: "—",
  }),
  seedParaOtro(
    {
      no: "AV1023",
      fecha: "01/06/2026",
      proy: "PRY2024001",
      proyN: "Construcción Planta Norte",
      tipo: "Viaje",
      monto: 760_000,
      div: "COP",
      estado: "Pagado",
      disponible: true,
      motivo: "Traslado registrado por apoyo de cuadrilla en arranque de obra.",
      fechaAprob: "05/06/2026",
      aprobador: "JCGO",
      pago: "Pagado",
    },
    SEED_EMP.martinez,
    SEED_EMP.carlos,
  ),
];

const SEED_EXTRA: Record<string, AnticipoExtra> = {
  AG1001: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    aprobadoPor: "Carlos Méndez (Gerente)",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas", fecha: "15/01/2025 09:14", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "Carlos Méndez", fecha: "17/01/2025 11:05", icon: "check", color: "#15803d" },
      { accion: "Pago procesado por Tesorería", usuario: "Sistema (IFS)", fecha: "20/01/2025 14:30", icon: "info", color: "#7c3aed" },
    ],
  },
  AV1005: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    fechaIda: "05/04/2025",
    fechaRegreso: "07/04/2025",
    destino: "Bogotá, Colombia",
    tipoViaje: "nacional",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas", fecha: "28/03/2025 08:00", icon: "send", color: "#1e40af" },
      { accion: "Esperando aprobación", usuario: "Sistema", fecha: "Pendiente", icon: "clock", color: "#854d0e" },
    ],
  },
  AG1004: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas", fecha: "14/04/2025 11:20", icon: "send", color: "#1e40af" },
      { accion: "Esperando aprobación", usuario: "Sistema", fecha: "Pendiente", icon: "clock", color: "#854d0e" },
    ],
  },
  AV1006: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    aprobadoPor: "Ana Rodríguez (Gerente)",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas", fecha: "01/03/2025 09:30", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "Ana Rodríguez", fecha: "03/03/2025 10:15", icon: "check", color: "#15803d" },
      { accion: "Esperando pago de Tesorería", usuario: "Sistema", fecha: "Pendiente", icon: "clock", color: "#854d0e" },
    ],
  },
  AV1002: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    aprobadoPor: "María F. López (Gerente)",
    fechaIda: "15/02/2025",
    fechaRegreso: "17/02/2025",
    destino: "Cali, Colombia",
    tipoViaje: "nacional",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas", fecha: "03/02/2025 14:30", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "María F. López", fecha: "06/02/2025 08:20", icon: "check", color: "#15803d" },
      { accion: "Pago procesado por Tesorería", usuario: "Sistema (IFS)", fecha: "08/02/2025 11:45", icon: "info", color: "#7c3aed" },
    ],
  },
  AG1006: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    aprobadoPor: "Ana Rodríguez (Gerente)",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas", fecha: "10/03/2025 10:00", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "Ana Rodríguez", fecha: "13/03/2025 09:40", icon: "check", color: "#15803d" },
      { accion: "Pago procesado por Tesorería", usuario: "Sistema (IFS)", fecha: "15/03/2025 13:20", icon: "info", color: "#7c3aed" },
    ],
  },
  AG1002: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas", fecha: "22/02/2025 09:00", icon: "send", color: "#1e40af" },
      { accion: "Rechazada — presupuesto excedido", usuario: "Carlos Méndez", fecha: "25/02/2025 16:00", icon: "x", color: "#b91c1c" },
    ],
  },
  AG1003: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas", fecha: "08/01/2026 10:00", icon: "send", color: "#1e40af" },
      { accion: "Cancelado por el empleado", usuario: "Carlos Rivas", fecha: "09/01/2026 14:30", icon: "ban", color: "#6b7280" },
    ],
  },
  AG1007: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas", fecha: "05/02/2025 09:00", icon: "send", color: "#1e40af" },
      { accion: "Cancelado por el empleado", usuario: "Carlos Rivas", fecha: "05/02/2025 11:20", icon: "ban", color: "#6b7280" },
    ],
  },
  AG1008: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    aprobadoPor: "Ana Rodríguez (Gerente)",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas", fecha: "12/01/2026 09:10", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "Ana Rodríguez", fecha: "14/01/2026 10:30", icon: "check", color: "#15803d" },
      { accion: "Cancelado desde el sistema", usuario: "Patricia Suárez", fecha: "16/01/2026 15:45", icon: "ban", color: "#6b7280" },
    ],
  },
  AG1009: {
    compania: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)",
    empCompania: "HMVINGCO – HMV Ingenieros Ltda.",
    empId: "52874391",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas Mora", fecha: "10/07/2026 08:45", icon: "send", color: "#1e40af" },
      { accion: "Esperando aprobación", usuario: "Sistema", fecha: "Pendiente", icon: "clock", color: "#854d0e" },
    ],
  },
  AG1010: {
    compania: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)",
    empCompania: "HMVINGCO – HMV Ingenieros Ltda.",
    empId: "1023456789",
    tl: [
      { accion: "Solicitud lanzada", usuario: "María Fernanda López Torres", fecha: "08/07/2026 11:20", icon: "send", color: "#1e40af" },
      { accion: "Esperando aprobación", usuario: "Sistema", fecha: "Pendiente", icon: "clock", color: "#854d0e" },
    ],
  },
  AG1011: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas Mora", fecha: "15/07/2026 07:50", icon: "send", color: "#1e40af" },
      { accion: "Esperando aprobación", usuario: "Sistema", fecha: "Pendiente", icon: "clock", color: "#854d0e" },
    ],
  },
  AV1012: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    aprobadoPor: "Carlos Méndez (Gerente)",
    fechaIda: "20/07/2026",
    fechaRegreso: "22/07/2026",
    destino: "Barranquilla, Atlántico",
    tipoViaje: "nacional",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas Mora", fecha: "12/07/2026 09:00", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "Carlos Méndez", fecha: "14/07/2026 10:15", icon: "check", color: "#15803d" },
      { accion: "Esperando pago de Tesorería", usuario: "Sistema", fecha: "Pendiente", icon: "clock", color: "#854d0e" },
    ],
  },
  AG1013: {
    compania: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)",
    empCompania: "HMVINGCO – HMV Ingenieros Ltda.",
    empId: "52874391",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas Mora", fecha: "11/07/2026 08:30", icon: "send", color: "#1e40af" },
      { accion: "Esperando aprobación", usuario: "Sistema", fecha: "Pendiente", icon: "clock", color: "#854d0e" },
    ],
  },
  AV1014: {
    compania: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)",
    empCompania: "HMVINGCO – HMV Ingenieros Ltda.",
    empId: "52874391",
    aprobadoPor: "María F. López (Gerente)",
    fechaIda: "18/07/2026",
    fechaRegreso: "19/07/2026",
    destino: "Medellín, Antioquia",
    tipoViaje: "nacional",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas Mora", fecha: "09/07/2026 14:00", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "María F. López", fecha: "10/07/2026 11:40", icon: "check", color: "#15803d" },
    ],
  },
  AG1015: {
    compania: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)",
    empCompania: "HMVINGCO – HMV Ingenieros Ltda.",
    empId: "1023456789",
    aprobadoPor: "Carlos Méndez (Gerente)",
    tl: [
      { accion: "Solicitud lanzada", usuario: "María Fernanda López Torres", fecha: "07/07/2026 10:05", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "Carlos Méndez", fecha: "08/07/2026 09:20", icon: "check", color: "#15803d" },
    ],
  },
  AV1016: {
    compania: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)",
    empCompania: "HMV Ingenieros México S.A. de C.V.",
    empId: "1023456789",
    fechaIda: "25/07/2026",
    fechaRegreso: "27/07/2026",
    destino: "Cartagena, Bolívar",
    tipoViaje: "nacional",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Andrés Martínez Ruiz", fecha: "06/07/2026 16:10", icon: "send", color: "#1e40af" },
      { accion: "Esperando aprobación", usuario: "Sistema", fecha: "Pendiente", icon: "clock", color: "#854d0e" },
    ],
  },
  AG1017: {
    compania: "HMV Ingenieros México S.A. de C.V.",
    empCompania: "HMV Ingenieros México S.A. de C.V.",
    empId: "80341256",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas Mora", fecha: "05/07/2026 11:45", icon: "send", color: "#1e40af" },
      { accion: "Esperando aprobación", usuario: "Sistema", fecha: "Pendiente", icon: "clock", color: "#854d0e" },
    ],
  },
  AG1018: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas Mora", fecha: "28/06/2026 08:00", icon: "send", color: "#1e40af" },
      { accion: "Rechazada — fuera de política de activos", usuario: "Ana Rodríguez", fecha: "30/06/2026 15:30", icon: "x", color: "#b91c1c" },
    ],
  },
  AV1019: {
    compania: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)",
    empCompania: "HMVINGCO – HMV Ingenieros Ltda.",
    empId: "1023456789",
    aprobadoPor: "María F. López (Gerente)",
    fechaIda: "22/06/2026",
    fechaRegreso: "23/06/2026",
    destino: "Cali, Valle del Cauca",
    tipoViaje: "nacional",
    tl: [
      { accion: "Solicitud lanzada", usuario: "María Fernanda López Torres", fecha: "20/06/2026 07:30", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "María F. López", fecha: "22/06/2026 09:00", icon: "check", color: "#15803d" },
      { accion: "Pago procesado por Tesorería", usuario: "Sistema (IFS)", fecha: "25/06/2026 13:10", icon: "info", color: "#7c3aed" },
    ],
  },
  AG1020: {
    compania: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)",
    empCompania: "HMVINGCO – HMV Ingenieros Ltda.",
    empId: "52874391",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas Mora", fecha: "15/06/2026 10:20", icon: "send", color: "#1e40af" },
      { accion: "Rechazada — documentación incompleta", usuario: "Carlos Méndez", fecha: "18/06/2026 12:00", icon: "x", color: "#b91c1c" },
    ],
  },
  AV1021: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    aprobadoPor: "Ana Rodríguez (Gerente)",
    fechaIda: "12/06/2026",
    fechaRegreso: "14/06/2026",
    destino: "Cartagena, Bolívar",
    tipoViaje: "nacional",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas Mora", fecha: "10/06/2026 13:00", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "Ana Rodríguez", fecha: "12/06/2026 08:45", icon: "check", color: "#15803d" },
      { accion: "Pago procesado por Tesorería", usuario: "Sistema (IFS)", fecha: "14/06/2026 16:20", icon: "info", color: "#7c3aed" },
    ],
  },
  AG1022: {
    compania: "HMVINGCO – HMV Ingenieros",
    empCompania: "HMVINGCO – HMV Ingenieros",
    empId: "1023456789",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Rivas Mora", fecha: "02/06/2026 09:15", icon: "send", color: "#1e40af" },
      { accion: "Cancelado por el empleado", usuario: "Carlos Rivas Mora", fecha: "02/06/2026 11:00", icon: "ban", color: "#6b7280" },
    ],
  },
  AV1023: {
    compania: "HMV Ingenieros México S.A. de C.V.",
    empCompania: "HMV Ingenieros México S.A. de C.V.",
    empId: "1023456789",
    aprobadoPor: "Carlos Méndez (Gerente)",
    fechaIda: "03/06/2026",
    fechaRegreso: "04/06/2026",
    destino: "Barranquilla, Atlántico",
    tipoViaje: "nacional",
    tl: [
      { accion: "Solicitud lanzada", usuario: "Carlos Andrés Martínez Ruiz", fecha: "01/06/2026 08:00", icon: "send", color: "#1e40af" },
      { accion: "Aprobada", usuario: "Carlos Méndez", fecha: "03/06/2026 10:30", icon: "check", color: "#15803d" },
      { accion: "Pago procesado por Tesorería", usuario: "Sistema (IFS)", fecha: "05/06/2026 14:00", icon: "info", color: "#7c3aed" },
    ],
  },
};

export function cloneInitialAnticipos(): Record<string, Anticipo> {
  return Object.fromEntries(SEED_HISTORIAL.map((a) => [a.no, { ...a }]));
}

export function cloneInitialExtras(): Record<string, AnticipoExtra> {
  return Object.fromEntries(
    Object.entries(SEED_EXTRA).map(([k, v]) => [k, { ...v, tl: [...v.tl] }]),
  );
}

export function dmyToSortKey(dmy: string): number {
  const [d, m, y] = dmy.split("/").map(Number);
  return y * 10000 + m * 100 + d;
}

export function formatMonto(monto: number, div = "COP"): string {
  const pre = PRE_MAP[div] || "$";
  return `${pre} ${monto.toLocaleString("es-CO")}`;
}

export function hoyDMY(): string {
  const d = String(HOY_MOCK.getDate()).padStart(2, "0");
  const m = String(HOY_MOCK.getMonth() + 1).padStart(2, "0");
  const y = HOY_MOCK.getFullYear();
  return `${d}/${m}/${y}`;
}

export function nuevoCodigoAnticipo(
  tipo: AnticipoTipo,
  total: number,
): string {
  const prefix = tipo === "Viaje" ? "AV" : "AG";
  return `${prefix}${String(total + 1).padStart(4, "0")}`;
}

export function filterAnticiposByTab(
  anticipos: Record<string, Anticipo>,
  tab: AnticipoTab,
): Anticipo[] {
  return Object.values(anticipos)
    .filter((a) => anticipoVisibleParaSession(a))
    .filter((a) => (tab === "disponibles" ? a.disponible : !a.disponible))
    .sort((a, b) => dmyToSortKey(b.fecha) - dmyToSortKey(a.fecha));
}

export function countAnticiposTab(
  anticipos: Record<string, Anticipo>,
): { pendientes: number; disponibles: number } {
  const all = Object.values(anticipos).filter((a) => anticipoVisibleParaSession(a));
  return {
    pendientes: all.filter((a) => !a.disponible).length,
    disponibles: all.filter((a) => a.disponible).length,
  };
}

/** Solo Lanzado y si el usuario es quien registró la solicitud */
export function puedeCancelarEmpleado(anticipo: Anticipo): boolean {
  if (anticipo.estado !== "Lanzado") return false;
  const sessionId = normalizeAnticipoId(SESSION_EMPLEADO.cedula);
  return getAnticipoSolicitanteId(anticipo) === sessionId;
}

export function agregarDiasHabiles(fecha: Date, dias: number): Date {
  const d = new Date(fecha);
  let agregados = 0;
  while (agregados < dias) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) agregados++;
  }
  return d;
}

export function hoyIso(base: Date = new Date()): string {
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const d = String(base.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fechaMinSalida(base: Date = new Date()): string {
  return hoyIso(agregarDiasHabiles(base, 2));
}

export function validarFechaIdaViaje(fechaIdaIso: string): boolean {
  if (!fechaIdaIso) return false;
  const min = fechaMinSalida();
  return fechaIdaIso >= min;
}

export function isoToDmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function nombreAprobador(codigo: string | null): string | null {
  if (!codigo || codigo === "—") return null;
  return APROBADORES[codigo] || codigo;
}

export function pagoCeldaEnProceso(a: Anticipo): string | null {
  if (a.estado === "Aprobado") return "Pendiente";
  if (a.estado === "Pagado") return "Pagado";
  return null;
}
