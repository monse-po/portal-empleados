import { HOY_MOCK, JER_TIEMPO } from "@/src/lib/mi-tiempo-mock";
import {
  cloneInitialAnticipos,
  cloneInitialExtras,
  EMP_DET,
  PROYECTOS_ANT,
  parseMontoInput,
  isoToDmy,
  type Anticipo,
  type AnticipoTipo,
} from "@/src/lib/mis-anticipos-mock";

/** VOUCHER_TYPE — catálogo por compañía (mock IFS). */
export const VOUCHER_TYPES_BY_COMPANY: Record<
  string,
  readonly { code: string; label: string }[]
> = {
  HMVINGCO: [
    { code: "FACT", label: "Factura" },
    { code: "DSE", label: "DSE" },
    { code: "TIQ", label: "Tiquete" },
    { code: "VIAT", label: "Viático" },
    { code: "BOL", label: "Boleta" },
  ],
  HMVMEX: [
    { code: "CFDI", label: "CFDI" },
    { code: "FACT", label: "Factura" },
    { code: "TIQ", label: "Tiquete" },
    { code: "VIAT", label: "Viático" },
  ],
  HMVPERU: [
    { code: "FACT", label: "Factura" },
    { code: "TIQ", label: "Tiquete" },
    { code: "VIAT", label: "Viático" },
    { code: "BOL", label: "Boleta" },
  ],
};

/** COST_CATEGORY — catálogo por compañía (mock IFS). */
export const COST_CATEGORIES_BY_COMPANY: Record<
  string,
  readonly { code: string; label: string }[]
> = {
  HMVINGCO: [
    { code: "TRAN", label: "Transporte" },
    { code: "ALIM", label: "Alimentación" },
    { code: "HOSP", label: "Hospedaje" },
    { code: "VIAT", label: "Viáticos" },
    { code: "MAT", label: "Materiales" },
    { code: "SERV", label: "Servicios" },
  ],
  HMVMEX: [
    { code: "TRAN", label: "Transporte" },
    { code: "ALIM", label: "Alimentación" },
    { code: "HOSP", label: "Hospedaje" },
    { code: "VIAT", label: "Viáticos" },
    { code: "SERV", label: "Servicios" },
  ],
  HMVPERU: [
    { code: "TRAN", label: "Transporte" },
    { code: "ALIM", label: "Alimentación" },
    { code: "VIAT", label: "Viáticos" },
    { code: "SERV", label: "Servicios" },
  ],
};

export type SupplierLookupStatus =
  | "idle"
  | "loading"
  | "found"
  | "not_found";

/** Proveedores mock en IFS — clave: NIT sin puntos. */
const PROVEEDORES_IFS: Record<string, string> = {
  "9001234567": "Transportes Andinos S.A.S.",
  "800987654": "Hotel Llanos Plaza",
  "9015554433": "Restaurante El Fogón Ltda.",
};

export function resolveCompaniaId(companiaLabel: string): string {
  if (/méxico|mexico|hmvmex/i.test(companiaLabel)) return "HMVMEX";
  if (/perú|peru|hmvperu/i.test(companiaLabel)) return "HMVPERU";
  return "HMVINGCO";
}

export function getVoucherTypes(companiaId: string) {
  return VOUCHER_TYPES_BY_COMPANY[companiaId] ?? VOUCHER_TYPES_BY_COMPANY.HMVINGCO;
}

export function getCostCategories(companiaId: string) {
  return (
    COST_CATEGORIES_BY_COMPANY[companiaId] ?? COST_CATEGORIES_BY_COMPANY.HMVINGCO
  );
}

export function lookupProveedorIfs(nit: string): {
  found: boolean;
  nombre?: string;
} {
  const key = nit.replace(/\D/g, "");
  if (key.length < 6) return { found: false };
  const nombre = PROVEEDORES_IFS[key];
  return nombre ? { found: true, nombre } : { found: false };
}

export function labelVoucherType(code: string, companiaId = "HMVINGCO"): string {
  return getVoucherTypes(companiaId).find((t) => t.code === code)?.label ?? code;
}

export function labelCostCategory(code: string, companiaId = "HMVINGCO"): string {
  return getCostCategories(companiaId).find((t) => t.code === code)?.label ?? code;
}

/** @deprecated Usar labelVoucherType */
export function labelTipoDocumento(code: string): string {
  return labelVoucherType(code);
}

/** @deprecated Usar labelCostCategory */
export function labelTipoGasto(code: string): string {
  return labelCostCategory(code);
}

export type LineaGasto = {
  id: string;
  concepto: string;
  /** VOUCHER_TYPE */
  voucherType: string;
  /** INVOICE_DATE */
  invoiceDate: string;
  /** INVOICE_NO */
  invoiceNo: string;
  /** SUPPLIER_ID */
  supplierId: string;
  /** SUPPLIER_NAME */
  supplierName: string;
  supplierInIfs: boolean;
  /** COST_CATEGORY */
  costCategory: string;
  /** NET_AMOUNT */
  netAmount: number;
  /** CURRENCY_CODE */
  currencyCode: string;
  /** LINE_DESCRIPTION */
  lineDescription: string;
  /** DOCUMENT_ATTACHMENT */
  documentAttachment: string;
  /** CUFE — solo DSE, generado por DIAN */
  cufe?: string;
  /** VOUCHER_NO (ASI-####) — generado al legalizar */
  voucherNo?: string;
  proyectoId: string;
  proyectoNombre: string;
};

export type LineaGastoDraft = {
  id: string;
  voucherType: string;
  invoiceDate: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  supplierInIfs: boolean;
  supplierLookupStatus: SupplierLookupStatus;
  costCategory: string;
  netAmount: string;
  currencyCode: string;
  lineDescription: string;
  documentAttachment: string;
  cufe: string;
  proyectoId: string;
};

/** Datos heredados del anticipo pagado (PAYMENT_REFERENCE) — solo lectura. */
export type PaymentReference = {
  paymentReferenceId: string;
  empleadoNombre: string;
  empleadoIdentificacion: string;
  compania: string;
  companiaId: string;
  montoPagado: number;
  moneda: string;
  fechaPago: string;
  proyectoId: string;
  proyectoNombre: string;
};

export type LegalizacionEstado =
  | "Borrador"
  | "En revisión"
  | "Aprobado"
  | "Rechazado";

export type LegalizacionTipo =
  | "Con anticipo"
  | "Tarjeta corporativa"
  | "Sin anticipos";

export type LegalizacionTab = "pendientes" | "historial";

/** Destino contable / imputación de la legalización (global). */
export type DestinoLegalizacion = {
  proyectoId: string;
  subproyecto: string;
  actividad: string;
};

/** IDs anticipos (PRY2024001) → jerarquía Mi Tiempo (PRY-2024-001). */
const PROY_JER_MAP: Record<string, string> = {
  PRY2024001: "PRY-2024-001",
  PRY2024003: "PRY-2024-003",
  PRY2025002: "PRY-2025-002",
};

function jerarquiaProyecto(proyectoId: string) {
  const key = PROY_JER_MAP[proyectoId] ?? proyectoId;
  return JER_TIEMPO[key];
}

export function getSubproyectosDestino(proyectoId: string): string[] {
  const jer = jerarquiaProyecto(proyectoId);
  if (!jer) return [];
  return Object.keys(jer.subs);
}

export function getActividadesDestino(
  proyectoId: string,
  subproyecto: string,
): string[] {
  const jer = jerarquiaProyecto(proyectoId);
  if (!jer || !subproyecto) return [];
  return jer.subs[subproyecto] ?? [];
}

export function emptyDestinoLegalizacion(): DestinoLegalizacion {
  return { proyectoId: "", subproyecto: "", actividad: "" };
}

export function destinoFromProyectoAnticipo(proyectoId: string): DestinoLegalizacion {
  return { proyectoId, subproyecto: "", actividad: "" };
}

/** Mis Legalizaciones — En proceso */
export const LEG_TABLE_MIN_W_PEND = "1020px" as const;

export const LEG_COLS_PEND = [
  "72px",   // Código
  "88px",   // Solicitado
  "130px",  // Tipo
  "220px",  // Concepto
  "108px",  // Monto
  "240px",  // Motivo
  "92px",   // Estado
] as const;

/** Mis Legalizaciones — Historial */
export const LEG_TABLE_MIN_W_HIST = "1020px" as const;

export const LEG_COLS_HIST = [...LEG_COLS_PEND] as const;

export type Legalizacion = {
  no: string;
  fecha: string;
  tipo: LegalizacionTipo;
  concepto: string;
  monto: number;
  div: string;
  estado: LegalizacionEstado;
  motivo: string;
  /** Anticipo vinculado (tipo Con anticipo) — PAYMENT_REFERENCE */
  anticipoNo?: string;
  /** Referencia tarjeta (tipo Tarjeta corporativa) */
  tarjetaRef?: string;
  lineas: LineaGasto[];
  /** Comentario general al enviar (opcional) */
  comentario?: string;
  /** Imputación global — proyecto / subproyecto / actividad */
  destino?: DestinoLegalizacion;
  /** true = aparece en Historial */
  disponible: boolean;
};

export type CrearLegalizacionInput = {
  tipo: LegalizacionTipo;
  anticipoNo?: string;
  tarjetaRef?: string;
  destino: DestinoLegalizacion;
  lineas: LineaGasto[];
  comentario?: string;
  enviar: boolean;
};

const LEGALIZACIONES_MOCK: Record<string, Legalizacion> = {
  LEG000001: {
    no: "LEG000001",
    fecha: "15/03/2026",
    tipo: "Con anticipo",
    concepto: "Viáticos proyecto Beta",
    monto: 450000,
    div: "COP",
    estado: "En revisión",
    motivo: "Legalización de gastos de campo",
    anticipoNo: "AG1006",
    destino: {
      proyectoId: "PRY2025002",
      subproyecto: "SUB-301 · Ingeniería",
      actividad: "Ingeniería de proceso",
    },
    lineas: [
      {
        id: "lg-1",
        concepto: "Factura TAX-88421 · Transporte",
        voucherType: "FACT",
        invoiceDate: "12/03/2026",
        invoiceNo: "TAX-88421",
        supplierId: "9001234567",
        supplierName: "Transportes Andinos S.A.S.",
        supplierInIfs: true,
        costCategory: "TRAN",
        netAmount: 85000,
        currencyCode: "COP",
        lineDescription: "Taxi aeropuerto — campo",
        documentAttachment: "factura-taxi-001.pdf",
        proyectoId: "PRY2025002",
        proyectoNombre: "Ingeniería de Detalle Refinería",
      },
      {
        id: "lg-2",
        concepto: "Tiquete REST-99201 · Alimentación",
        voucherType: "TIQ",
        invoiceDate: "13/03/2026",
        invoiceNo: "REST-99201",
        supplierId: "9015554433",
        supplierName: "Restaurante El Fogón Ltda.",
        supplierInIfs: true,
        costCategory: "ALIM",
        netAmount: 62000,
        currencyCode: "COP",
        lineDescription: "Almuerzo equipo",
        documentAttachment: "recibo-restaurant.pdf",
        proyectoId: "PRY2025002",
        proyectoNombre: "Ingeniería de Detalle Refinería",
      },
    ],
    comentario: "Legalización de gastos de campo",
    disponible: false,
  },
  LEG000002: {
    no: "LEG000002",
    fecha: "10/03/2026",
    tipo: "Sin anticipos",
    concepto: "Transporte y peajes",
    monto: 120000,
    div: "COP",
    estado: "Aprobado",
    motivo: "Recorrido visita técnica",
    destino: {
      proyectoId: "PRY2024001",
      subproyecto: "SUB-101 · Obra civil",
      actividad: "Supervisión en campo",
    },
    lineas: [
      {
        id: "lg-3",
        concepto: "DSE PEAJE-001 · Transporte",
        voucherType: "DSE",
        invoiceDate: "08/03/2026",
        invoiceNo: "PEAJE-001",
        supplierId: "800987654",
        supplierName: "Hotel Llanos Plaza",
        supplierInIfs: true,
        costCategory: "TRAN",
        netAmount: 120000,
        currencyCode: "COP",
        lineDescription: "Peajes ruta visita técnica",
        documentAttachment: "peajes-marzo.pdf",
        cufe: "CUFE-PEAJE001-A1B2C3D4",
        voucherNo: "ASI-1042",
        proyectoId: "PRY2024001",
        proyectoNombre: "Construcción Planta Norte",
      },
    ],
    disponible: true,
  },
};

export function cloneInitialLegalizaciones(): Record<string, Legalizacion> {
  return structuredClone(LEGALIZACIONES_MOCK);
}

export function hoyDMY(): string {
  const d = HOY_MOCK;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function countLegalizacionesTab(
  items: Record<string, Legalizacion>,
  tab: LegalizacionTab,
): number {
  return Object.values(items).filter((l) =>
    tab === "historial" ? l.disponible : !l.disponible,
  ).length;
}

export function getLegalizacionesTab(
  items: Record<string, Legalizacion>,
  tab: LegalizacionTab,
): Legalizacion[] {
  return Object.values(items)
    .filter((l) => (tab === "historial" ? l.disponible : !l.disponible))
    .sort((a, b) => b.no.localeCompare(a.no));
}

export function formatMontoLegal(monto: number, div: string): string {
  return `${div} ${monto.toLocaleString("es-CO")}`;
}

export function nuevoCodigoLegalizacion(
  items: Record<string, Legalizacion>,
): string {
  let max = 0;
  for (const key of Object.keys(items)) {
    const n = Number.parseInt(key.replace(/^LEG/i, ""), 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return `LEG${String(max + 1).padStart(6, "0")}`;
}

export function newLineaGastoId(): string {
  return `lg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createEmptyLineaGasto(
  defaultCurrency = "COP",
  proyectoId = "",
): LineaGastoDraft {
  return {
    id: newLineaGastoId(),
    voucherType: "",
    invoiceDate: "",
    invoiceNo: "",
    supplierId: "",
    supplierName: "",
    supplierInIfs: false,
    supplierLookupStatus: "idle",
    costCategory: "",
    netAmount: "",
    currencyCode: defaultCurrency,
    lineDescription: "",
    documentAttachment: "",
    cufe: "",
    proyectoId,
  };
}

function buildConceptoLinea(
  voucherType: string,
  invoiceNo: string,
  costCategory: string,
  companiaId = "HMVINGCO",
): string {
  return `${labelVoucherType(voucherType, companiaId)} ${invoiceNo} · ${labelCostCategory(costCategory, companiaId)}`;
}

export function lineaRequiereAdjunto(linea: LineaGastoDraft): boolean {
  return (
    linea.supplierLookupStatus === "not_found" &&
    linea.supplierId.replace(/\D/g, "").length >= 6
  );
}

function mockCufeDse(invoiceNo: string): string {
  const base = invoiceNo.replace(/\W/g, "").slice(0, 12).toUpperCase() || "DOC";
  return `CUFE-${base}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export function nextVoucherNo(
  items: Record<string, Legalizacion>,
): string {
  let max = 1040;
  for (const leg of Object.values(items)) {
    for (const l of leg.lineas) {
      const m = l.voucherNo?.match(/^ASI-(\d+)$/i);
      if (m) max = Math.max(max, Number(m[1]));
    }
  }
  return `ASI-${max + 1}`;
}

/** Asigna VOUCHER_NO y CUFE (DSE) al enviar a aprobación. */
export function finalizeLineasOnEnvio(
  lineas: LineaGasto[],
  items: Record<string, Legalizacion>,
): LineaGasto[] {
  let seq = Number(nextVoucherNo(items).replace(/^ASI-/i, ""));
  return lineas.map((l) => ({
    ...l,
    voucherNo: `ASI-${seq++}`,
    ...(l.voucherType === "DSE" && !l.cufe
      ? { cufe: mockCufeDse(l.invoiceNo) }
      : {}),
  }));
}

function extractFechaPagoTesoreria(
  anticipoNo: string,
  a: Anticipo,
): string | null {
  const extra = cloneInitialExtras()[anticipoNo];
  const pago = extra?.tl.find((t) => /pago procesado/i.test(t.accion));
  if (pago?.fecha && pago.fecha !== "Pendiente") {
    return pago.fecha.split(" ")[0] ?? pago.fecha;
  }
  return a.estado === "Pagado" ? a.fechaAprob : null;
}

/** PAYMENT_REFERENCE — datos del anticipo pagado, no editables en el formulario. */
export function getPaymentReference(
  anticipoNo: string,
): PaymentReference | null {
  const anticipos = cloneInitialAnticipos();
  const a = anticipos[anticipoNo];
  if (!a || !puedeLegalizarAnticipo(a)) return null;

  const extra = cloneInitialExtras()[anticipoNo];
  const fechaPago = extractFechaPagoTesoreria(anticipoNo, a);
  if (!fechaPago) return null;

  return {
    paymentReferenceId: a.no,
    empleadoNombre: a.beneficiarioNombre ?? EMP_DET.nombre,
    empleadoIdentificacion: a.cedula ?? EMP_DET.cedula,
    compania: extra?.compania ?? EMP_DET.empresa,
    companiaId: resolveCompaniaId(extra?.compania ?? EMP_DET.empresa),
    montoPagado: a.monto,
    moneda: a.div,
    fechaPago,
    proyectoId: a.proy,
    proyectoNombre: a.proyN,
  };
}

export function resumenLegalizacionDesdeLineas(lineas: LineaGasto[]): {
  concepto: string;
  monto: number;
  div: string;
} {
  if (!lineas.length) {
    return { concepto: "Sin concepto", monto: 0, div: "COP" };
  }
  const div = lineas[0]?.currencyCode ?? "COP";
  const monto = lineas.reduce((sum, l) => sum + l.netAmount, 0);
  const concepto =
    lineas.length === 1
      ? lineas[0].concepto
      : `${lineas[0].concepto}${lineas.length > 1 ? ` (+${lineas.length - 1} líneas)` : ""}`;
  return { concepto, monto, div };
}

export function draftToLineaGasto(
  linea: LineaGastoDraft,
  companiaId = "HMVINGCO",
): LineaGasto | null {
  const netAmount = parseMontoInput(linea.netAmount);
  if (
    !linea.voucherType ||
    !linea.invoiceNo.trim() ||
    !linea.costCategory ||
    !linea.invoiceDate ||
    !linea.supplierId.trim() ||
    !linea.supplierName.trim() ||
    netAmount <= 0 ||
    !linea.currencyCode
  ) {
    return null;
  }
  const proyecto = PROYECTOS_ANT.find((p) => p.id === linea.proyectoId);
  const invoiceNo = linea.invoiceNo.trim();
  const voucherType = linea.voucherType;
  const costCategory = linea.costCategory;
  return {
    id: linea.id,
    concepto: buildConceptoLinea(voucherType, invoiceNo, costCategory, companiaId),
    voucherType,
    invoiceDate: linea.invoiceDate.includes("-")
      ? isoToDmy(linea.invoiceDate)
      : linea.invoiceDate,
    invoiceNo,
    supplierId: linea.supplierId.trim(),
    supplierName: linea.supplierName.trim(),
    supplierInIfs: linea.supplierInIfs,
    costCategory,
    netAmount,
    currencyCode: linea.currencyCode,
    lineDescription: linea.lineDescription.trim(),
    documentAttachment: linea.documentAttachment.trim(),
    cufe: linea.cufe || undefined,
    proyectoId: linea.proyectoId,
    proyectoNombre: proyecto?.nombre ?? linea.proyectoId,
  };
}

/** Solo anticipos desembolsados por Tesorería (Pagado / PAID_POSTED). */
export function puedeLegalizarAnticipo(a: Anticipo): boolean {
  return a.estado === "Pagado";
}

/** Anticipo elegible para vincular en una legalización */
export type AnticipoLegalizable = {
  no: string;
  fecha: string;
  proy: string;
  proyN: string;
  tipo: AnticipoTipo;
  monto: number;
  div: string;
  /** Fecha de desembolso en Tesorería. */
  fechaPago: string | null;
};

function toAnticipoLegalizable(a: Anticipo): AnticipoLegalizable {
  return {
    no: a.no,
    fecha: a.fecha,
    proy: a.proy,
    proyN: a.proyN,
    tipo: a.tipo,
    monto: a.monto,
    div: a.div,
    fechaPago: extractFechaPagoTesoreria(a.no, a),
  };
}

/** Anticipos pagados del empleado, aún sin legalización vinculada. */
export function getAnticiposParaLegalizar(
  legalizaciones: Record<string, Legalizacion> = {},
): AnticipoLegalizable[] {
  const anticiposUsados = new Set(
    Object.values(legalizaciones)
      .map((l) => l.anticipoNo)
      .filter((no): no is string => !!no),
  );
  const anticipos = cloneInitialAnticipos();
  return Object.values(anticipos)
    .filter((a) => puedeLegalizarAnticipo(a) && !anticiposUsados.has(a.no))
    .map(toAnticipoLegalizable)
    .sort((a, b) => b.no.localeCompare(a.no));
}
