export type DocumentoSoporteEstado =
  | "Borrador"
  | "En revisión"
  | "Aprobado"
  | "Rechazado";

export type DocumentoSoporteTipo =
  | "Factura"
  | "Recibo"
  | "Cotización"
  | "Otro";

export type DocumentoSoporteTab = "pendientes" | "historial";

export type AdjuntoMock = {
  nombre: string;
  sizeKb: number;
  mime: string;
};

export type DocumentoSoporte = {
  no: string;
  fecha: string;
  tipo: DocumentoSoporteTipo;
  referencia: string;
  descripcion: string;
  estado: DocumentoSoporteEstado;
  adjunto?: AdjuntoMock;
  comentario?: string;
  /** true = Historial (Aprobado / Rechazado) */
  disponible: boolean;
};

export type GuardarDocumentoSoporteInput = {
  tipo: DocumentoSoporteTipo;
  referencia: string;
  descripcion: string;
  adjunto?: AdjuntoMock;
  comentario?: string;
  enviar: boolean;
};

export const TIPOS_DOCUMENTO_SOPORTE: DocumentoSoporteTipo[] = [
  "Factura",
  "Recibo",
  "Cotización",
  "Otro",
];

export const ESTADOS_POR_TAB: Record<
  DocumentoSoporteTab,
  DocumentoSoporteEstado[]
> = {
  pendientes: ["Borrador", "En revisión"],
  historial: ["Aprobado", "Rechazado"],
};

export function hoyDMY(fecha = new Date()): string {
  const d = String(fecha.getDate()).padStart(2, "0");
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const y = fecha.getFullYear();
  return `${d}/${m}/${y}`;
}

export function formatSizeKb(sizeKb: number): string {
  if (sizeKb >= 1024) return `${(sizeKb / 1024).toFixed(1)} MB`;
  return `${sizeKb} KB`;
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

const DOCUMENTOS_MOCK: Record<string, DocumentoSoporte> = {
  DS0001: {
    no: "DS0001",
    fecha: "28/07/2026",
    tipo: "Factura",
    referencia: "FV-45821",
    descripcion: "Factura de hospedaje en Medellín — visita a obra",
    estado: "En revisión",
    adjunto: {
      nombre: "factura-hospedaje.pdf",
      sizeKb: 420,
      mime: "application/pdf",
    },
    comentario: "Relacionada con anticipo de viaje AV0012",
    disponible: false,
  },
  DS0002: {
    no: "DS0002",
    fecha: "30/07/2026",
    tipo: "Recibo",
    referencia: "RC-99102",
    descripcion: "Recibo de taxi aeropuerto — cliente Norte",
    estado: "Borrador",
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
    tipo: "Cotización",
    referencia: "COT-HMV-77",
    descripcion: "Cotización de equipos de medición para Proyecto Beta",
    estado: "Aprobado",
    adjunto: {
      nombre: "cotizacion-equipos.pdf",
      sizeKb: 1280,
      mime: "application/pdf",
    },
    comentario: "Aprobado por Contabilidad",
    disponible: true,
  },
  DS0004: {
    no: "DS0004",
    fecha: "10/07/2026",
    tipo: "Otro",
    referencia: "SOP-003",
    descripcion: "Soporte de peajes — ruta Bogotá–Ibagué",
    estado: "Rechazado",
    adjunto: {
      nombre: "peajes.zip",
      sizeKb: 2100,
      mime: "application/zip",
    },
    comentario: "Imágenes ilegibles; volver a adjuntar",
    disponible: true,
  },
  DS0005: {
    no: "DS0005",
    fecha: "02/08/2026",
    tipo: "Factura",
    referencia: "FV-46001",
    descripcion: "Licencias de software de modelado estructural",
    estado: "En revisión",
    adjunto: {
      nombre: "factura-licencias.pdf",
      sizeKb: 310,
      mime: "application/pdf",
    },
    disponible: false,
  },
};

export function cloneInitialDocumentos(): Record<string, DocumentoSoporte> {
  return structuredClone(DOCUMENTOS_MOCK);
}

export function countDocumentosTab(
  items: Record<string, DocumentoSoporte>,
  tab: DocumentoSoporteTab,
): number {
  return Object.values(items).filter((d) =>
    tab === "historial" ? d.disponible : !d.disponible,
  ).length;
}

export function getDocumentosTab(
  items: Record<string, DocumentoSoporte>,
  tab: DocumentoSoporteTab,
): DocumentoSoporte[] {
  return Object.values(items)
    .filter((d) => (tab === "historial" ? d.disponible : !d.disponible))
    .sort((a, b) => b.no.localeCompare(a.no));
}

export const DS_COLS_PEND = [
  "9%",
  "10%",
  "12%",
  "14%",
  "30%",
  "14%",
  "11%",
] as const;

export const DS_COLS_HIST = DS_COLS_PEND;
