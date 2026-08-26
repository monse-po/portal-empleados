/**
 * Documento de Soporte — modelo portal Modo A (mock).
 * Reglas: docs/documento-soporte/ + .cursor/rules/33-documento-soporte-business.mdc
 */

export type DocumentoSoporteEstado =
  | "Lanzado"
  | "Aprobado"
  | "Rechazado"
  | "Cancelado";

export type DocumentoSoporteTipo = "DSE" | "NA";

export type DocumentoSoporteTab = "pendientes" | "historial";

export type AdjuntoMock = {
  nombre: string;
  sizeKb: number;
  mime: string;
};

export type DocumentoSoporte = {
  no: string;
  /** Fecha de solicitud (DMY). */
  fecha: string;
  tipo: DocumentoSoporteTipo;
  estado: DocumentoSoporteEstado;
  empresaId: string;
  empresaLabel: string;
  registradoPorId: string;
  registradoPorNombre: string;
  solicitadoPorId: string;
  solicitadoPorNombre: string;
  nif: string;
  noDocumentoOriginal: string;
  fechaDocumento: string;
  tarjetaUltimos4?: string;
  concepto: string;
  divisa: string;
  monto: number;
  adjunto?: AdjuntoMock;
  tipoAjuste?: string;
  documentoSoporteAnular?: string;
  cudsAnular?: string;
  notaSolicitud?: string;
  aprobadoPorNombre?: string;
  fechaAprobacion?: string;
  /** true = Historial */
  disponible: boolean;
};

export type GuardarDocumentoSoporteInput = {
  tipo: DocumentoSoporteTipo;
  empresaId: string;
  empresaLabel: string;
  solicitadoPorId: string;
  solicitadoPorNombre: string;
  nif: string;
  noDocumentoOriginal: string;
  fechaDocumento: string;
  tarjetaUltimos4?: string;
  concepto: string;
  divisa: string;
  monto: number;
  adjunto?: AdjuntoMock;
  tipoAjuste?: string;
  documentoSoporteAnular?: string;
  cudsAnular?: string;
};

export const TIPOS_DOCUMENTO_SOPORTE: DocumentoSoporteTipo[] = ["DSE", "NA"];

export const TIPOS_AJUSTE_NA = [
  "Anulación total",
  "Corrección de valor",
  "Corrección de datos",
] as const;

export const EMPRESAS_DS = [
  { id: "HMVINGCO", label: "HMVINGCO – HMV Ingenieros Ltda. (Colombia)" },
  { id: "HMVMEX", label: "HMV Ingenieros México S.A. de C.V." },
] as const;

export const DIVISAS_DS = ["COP", "USD", "MXN"] as const;

/** Sesión mock del capturista — alineada con shell (Liz Lino). */
export const SESSION_DS = {
  id: "1023456789",
  nombre: "Liz Lino",
};

export const EMPLEADOS_DS = [
  { id: "1001138468", nombre: "Cristian Santiago Ruiz", empresa: "HMVINGCO" },
  { id: "1023456789", nombre: "Liz Lino", empresa: "HMVINGCO" },
  { id: "52874391", nombre: "María Fernanda López Torres", empresa: "HMVINGCO" },
  { id: "80341256", nombre: "Carlos Andrés Martínez Ruiz", empresa: "HMVMEX" },
] as const;

export const ESTADOS_POR_TAB: Record<
  DocumentoSoporteTab,
  DocumentoSoporteEstado[]
> = {
  pendientes: ["Lanzado"],
  historial: ["Aprobado", "Rechazado", "Cancelado"],
};

export function hoyDMY(fecha = new Date()): string {
  const d = String(fecha.getDate()).padStart(2, "0");
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const y = fecha.getFullYear();
  return `${d}/${m}/${y}`;
}

export function hoyIso(fecha = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isoToDmy(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function formatSizeKb(sizeKb: number): string {
  if (sizeKb >= 1024) return `${(sizeKb / 1024).toFixed(1)} MB`;
  return `${sizeKb} KB`;
}

/** Formato numérico por divisa (locale + decimales + prefijo). */
export const DIVISA_FORMAT_DS: Record<
  string,
  { locale: string; fractionDigits: number; prefix: string }
> = {
  COP: { locale: "es-CO", fractionDigits: 0, prefix: "$" },
  USD: { locale: "en-US", fractionDigits: 2, prefix: "US$" },
  MXN: { locale: "es-MX", fractionDigits: 2, prefix: "$" },
};

export function getDivisaFormatDs(divisa: string) {
  return DIVISA_FORMAT_DS[divisa] ?? DIVISA_FORMAT_DS.COP;
}

/** Monto formateado para input (sin prefijo). */
export function fmtMontoInputDs(monto: number, divisa: string): string {
  if (!Number.isFinite(monto) || monto === 0) return "";
  const { locale, fractionDigits } = getDivisaFormatDs(divisa);
  return Math.abs(monto).toLocaleString(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Parsea el texto del monto según la divisa.
 * COP: 1.234.567 | 1.234,56 — USD/MXN: 1,234.56
 */
export function parseMontoInputDs(
  raw: string,
  divisa: string,
): number | null {
  const s = raw.trim().replace(/\s/g, "");
  if (!s || s === "-" || s === "." || s === ",") return null;

  const { locale } = getDivisaFormatDs(divisa);
  let normalized: string;

  if (locale === "es-CO") {
    if (s.includes(",")) {
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = s.replace(/\./g, "");
    }
  } else {
    normalized = s.replace(/,/g, "");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatMontoDs(monto: number, divisa: string): string {
  const sign = monto < 0 ? "-" : "";
  const { locale, fractionDigits, prefix } = getDivisaFormatDs(divisa);
  const abs = Math.abs(monto).toLocaleString(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${sign}${prefix} ${abs}`;
}

export function normalizeNif(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

export type NifLookupStatus =
  | "idle"
  | "loading"
  | "found"
  | "not_found"
  | "error";

/** Catálogo mock IFS — NIFs ya tipificados en datos de ejemplo. */
const PROVEEDORES_NIF_IFS: Record<string, string> = {
  "900123456": "Hotel Parque Central S.A.S.",
  "800987654": "Transportes Rápidos del Norte",
  "901112233": "Equipos de Medición Beta Ltda.",
};

/**
 * Consulta mock a IFS por NIF.
 * Si no existe, el portal igual permite continuar (alta manual posterior en IFS).
 */
export function lookupNifIfs(nif: string): {
  found: boolean;
  nombre?: string;
} {
  const key = normalizeNif(nif).replace(/\D/g, "");
  if (key.length < 6) return { found: false };
  const nombre = PROVEEDORES_NIF_IFS[key];
  return nombre ? { found: true, nombre } : { found: false };
}

export function normalizeId(id: string): string {
  return id.replace(/\D/g, "");
}

export function nuevoCodigoDocumento(
  items: Record<string, DocumentoSoporte>,
): string {
  const max = Object.keys(items).reduce((acc, key) => {
    const n = Number(key.replace(/^DS/, ""));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `DS${String(max + 1).padStart(4, "0")}`;
}

export function esHistorialEstado(estado: DocumentoSoporteEstado): boolean {
  return estado !== "Lanzado";
}

export function documentoVisibleParaEmpleado(
  d: DocumentoSoporte,
  sessionEmpleadoId: string,
): boolean {
  const sessionId = normalizeId(sessionEmpleadoId);
  return (
    normalizeId(d.solicitadoPorId) === sessionId ||
    normalizeId(d.registradoPorId) === sessionId
  );
}

/** true si quien registra ≠ a nombre de (solicitud para otro). */
export function esSolicitudParaOtro(d: DocumentoSoporte): boolean {
  return normalizeId(d.solicitadoPorId) !== normalizeId(d.registradoPorId);
}

/**
 * Chip bajo Beneficiario (mismo patrón Anticipos `getBeneficiarioSolicitante`):
 * solo si otro empleado registró la solicitud (no el usuario en sesión).
 */
export function getRegistradoPorChip(
  d: DocumentoSoporte,
  sessionEmpleadoId: string,
): string | null {
  const sessionId = normalizeId(sessionEmpleadoId);
  if (normalizeId(d.registradoPorId) !== sessionId) {
    return d.registradoPorNombre;
  }
  return null;
}

export function validarSignoMonto(
  tipo: DocumentoSoporteTipo,
  monto: number,
): string | null {
  if (!Number.isFinite(monto) || monto === 0) {
    return "Ingresa un monto distinto de cero";
  }
  if (tipo === "DSE" && monto < 0) {
    return "Para DSE el monto debe ser positivo";
  }
  if (tipo === "NA" && monto > 0) {
    return "Para NA el monto debe ser negativo";
  }
  return null;
}

export function findDuplicado(
  items: Record<string, DocumentoSoporte>,
  nif: string,
  noDocumentoOriginal: string,
  excludeNo?: string,
): DocumentoSoporte | undefined {
  const n = normalizeNif(nif).toLowerCase();
  const doc = noDocumentoOriginal.trim().toLowerCase();
  return Object.values(items).find(
    (d) =>
      d.no !== excludeNo &&
      normalizeNif(d.nif).toLowerCase() === n &&
      d.noDocumentoOriginal.trim().toLowerCase() === doc &&
      d.estado !== "Cancelado" &&
      d.estado !== "Rechazado",
  );
}

const DOCUMENTOS_MOCK: Record<string, DocumentoSoporte> = {
  DS0001: {
    no: "DS0001",
    fecha: "28/07/2026",
    tipo: "DSE",
    estado: "Lanzado",
    empresaId: "HMVINGCO",
    empresaLabel: EMPRESAS_DS[0].label,
    registradoPorId: SESSION_DS.id,
    registradoPorNombre: SESSION_DS.nombre,
    solicitadoPorId: SESSION_DS.id,
    solicitadoPorNombre: SESSION_DS.nombre,
    nif: "900123456",
    noDocumentoOriginal: "FV-45821",
    fechaDocumento: "25/07/2026",
    tarjetaUltimos4: "4521",
    concepto: "Hospedaje visita a obra — Medellín",
    divisa: "COP",
    monto: 850000,
    adjunto: {
      nombre: "factura-hospedaje.pdf",
      sizeKb: 420,
      mime: "application/pdf",
    },
    disponible: false,
  },
  DS0002: {
    no: "DS0002",
    fecha: "30/07/2026",
    tipo: "DSE",
    estado: "Lanzado",
    empresaId: "HMVINGCO",
    empresaLabel: EMPRESAS_DS[0].label,
    registradoPorId: SESSION_DS.id,
    registradoPorNombre: SESSION_DS.nombre,
    solicitadoPorId: "52874391",
    solicitadoPorNombre: "María Fernanda López Torres",
    nif: "800987654",
    noDocumentoOriginal: "RC-99102",
    fechaDocumento: "29/07/2026",
    concepto: "Taxi aeropuerto — cliente Norte (a nombre de María)",
    divisa: "COP",
    monto: 120000,
    adjunto: {
      nombre: "recibo-taxi.jpg",
      sizeKb: 890,
      mime: "image/jpeg",
    },
    disponible: false,
  },
  DS0003: {
    no: "DS0003",
    fecha: "15/07/2026",
    tipo: "DSE",
    estado: "Aprobado",
    empresaId: "HMVINGCO",
    empresaLabel: EMPRESAS_DS[0].label,
    registradoPorId: SESSION_DS.id,
    registradoPorNombre: SESSION_DS.nombre,
    solicitadoPorId: SESSION_DS.id,
    solicitadoPorNombre: SESSION_DS.nombre,
    nif: "901112233",
    noDocumentoOriginal: "COT-HMV-77",
    fechaDocumento: "12/07/2026",
    concepto: "Equipos de medición — Proyecto Beta",
    divisa: "USD",
    monto: 2400,
    adjunto: {
      nombre: "cotizacion-equipos.pdf",
      sizeKb: 1280,
      mime: "application/pdf",
    },
    aprobadoPorNombre: "Ana Contabilidad",
    fechaAprobacion: "16/07/2026",
    disponible: true,
  },
  DS0004: {
    no: "DS0004",
    fecha: "10/07/2026",
    tipo: "DSE",
    estado: "Rechazado",
    empresaId: "HMVINGCO",
    empresaLabel: EMPRESAS_DS[0].label,
    registradoPorId: "52874391",
    registradoPorNombre: "María Fernanda López Torres",
    solicitadoPorId: SESSION_DS.id,
    solicitadoPorNombre: SESSION_DS.nombre,
    nif: "900123456",
    noDocumentoOriginal: "FV-44990",
    fechaDocumento: "09/07/2026",
    concepto: "Hospedaje — imágenes ilegibles (registrado por María)",
    divisa: "COP",
    monto: 200000,
    adjunto: {
      nombre: "factura-hospedaje.pdf",
      sizeKb: 210,
      mime: "application/pdf",
    },
    notaSolicitud: "Adjunto ilegible; crear solicitud nueva",
    disponible: true,
  },
  DS0005: {
    no: "DS0005",
    fecha: "02/08/2026",
    tipo: "DSE",
    estado: "Cancelado",
    empresaId: "HMVINGCO",
    empresaLabel: EMPRESAS_DS[0].label,
    registradoPorId: SESSION_DS.id,
    registradoPorNombre: SESSION_DS.nombre,
    solicitadoPorId: SESSION_DS.id,
    solicitadoPorNombre: SESSION_DS.nombre,
    nif: "860555444",
    noDocumentoOriginal: "FV-46001",
    fechaDocumento: "01/08/2026",
    concepto: "Licencias software — cancelado antes de factura",
    divisa: "COP",
    monto: 3500000,
    adjunto: {
      nombre: "factura-licencias.pdf",
      sizeKb: 310,
      mime: "application/pdf",
    },
    disponible: true,
  },
};

export function cloneInitialDocumentos(): Record<string, DocumentoSoporte> {
  return structuredClone(DOCUMENTOS_MOCK);
}

export function countDocumentosTab(
  items: Record<string, DocumentoSoporte>,
  tab: DocumentoSoporteTab,
  sessionEmpleadoId: string,
): number {
  return Object.values(items).filter(
    (d) =>
      documentoVisibleParaEmpleado(d, sessionEmpleadoId) &&
      (tab === "historial" ? d.disponible : !d.disponible),
  ).length;
}

export function getDocumentosTab(
  items: Record<string, DocumentoSoporte>,
  tab: DocumentoSoporteTab,
  sessionEmpleadoId: string,
): DocumentoSoporte[] {
  return Object.values(items)
    .filter(
      (d) =>
        documentoVisibleParaEmpleado(d, sessionEmpleadoId) &&
        (tab === "historial" ? d.disponible : !d.disponible),
    )
    .sort((a, b) => b.no.localeCompare(a.no));
}

export function dmyToIso(dmy: string): string {
  if (!dmy) return "";
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m}-${d}`;
}

/** Anchos fijos — Beneficiario alineado a Anticipos (~260px). */
export const DS_COLS_PEND = [
  "72px",
  "88px",
  "260px",
  "100px",
  "110px",
  "200px",
  "120px",
  "100px",
] as const;

export const DS_COLS_HIST = DS_COLS_PEND;
