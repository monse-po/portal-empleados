import {
  cloneInitialLegalizaciones,
  formatMontoLegal,
  hoyDMY,
  type Legalizacion,
} from "@/src/lib/legalizaciones-mock";
import { CHECKBOX_COL_WIDTH } from "@/src/components/ui/DataTable";

export type LegalizacionAproEstado = "" | "Aprobado" | "Rechazado";

export type LegalizacionApro = Legalizacion & {
  solicitante: string;
  cedula: string;
  estadoApro: LegalizacionAproEstado;
  comentarioApro: string;
  fechaApro: string;
  aprobador: string;
};

/** Aprobación legalizaciones — pendientes: checkbox + datos */
export const APRO_LEG_COLS_PEND = [
  CHECKBOX_COL_WIDTH,
  "9%",
  "8%",
  "12%",
  "11%",
  "9%",
  "14%",
  "12%",
  "13%",
  "12%",
] as const;

const SOLICITANTE = {
  nombre: "Liz Lino",
  cedula: "1.023.456.789",
};

function toApro(reg: Legalizacion): LegalizacionApro {
  const pendiente = reg.estado === "Lanzado";
  return {
    ...reg,
    solicitante: SOLICITANTE.nombre,
    cedula: SOLICITANTE.cedula,
    estadoApro: pendiente ? "" : reg.estado === "Aprobado" ? "Aprobado" : "Rechazado",
    comentarioApro: "",
    fechaApro: pendiente ? "" : reg.fecha,
    aprobador: "",
  };
}

export function cloneInitialLegalizacionesApro(): Record<string, LegalizacionApro> {
  const base = cloneInitialLegalizaciones();
  const next: Record<string, LegalizacionApro> = {};
  for (const reg of Object.values(base)) {
    next[reg.no] = toApro(reg);
  }
  next.LEG000003 = {
    no: "LEG000003",
    fecha: "18/03/2026",
    tipo: "Tarjeta corporativa",
    concepto: "Alimentación visita cliente",
    monto: 85000,
    div: "COP",
    estado: "Lanzado",
    motivo: "Comidas durante desplazamiento",
    disponible: false,
    lineas: [
      {
        id: "lg-ap-1",
        concepto: "Tiquete REST-77821 · Alimentación",
        voucherType: "TIQ",
        invoiceDate: "17/03/2026",
        invoiceNo: "REST-77821",
        supplierId: "9015554433",
        supplierName: "Restaurante El Fogón Ltda.",
        supplierInIfs: true,
        costCategory: "ALIM",
        netAmount: 85000,
        currencyCode: "COP",
        lineDescription: "Comidas durante desplazamiento",
        documentAttachment: "recibo-almuerzo.pdf",
        proyectoId: "PRY2024001",
        proyectoNombre: "Construcción Planta Norte",
      },
    ],
    destino: {
      proyectoId: "PRY2024001",
      subproyecto: "SUB-101 · Campo",
      actividad: "Supervisión en campo",
    },
    solicitante: SOLICITANTE.nombre,
    cedula: SOLICITANTE.cedula,
    estadoApro: "",
    comentarioApro: "",
    fechaApro: "",
    aprobador: "",
  };
  return next;
}

function isMesReferencia(fecha: string): boolean {
  const hoy = hoyDMY();
  const [, mesHoy, anioHoy] = hoy.split("/").map(Number);
  const [, mes, anio] = fecha.split("/").map(Number);
  return Boolean(fecha) && mes === mesHoy && anio === anioHoy;
}

function formatMontoCompact(monto: number): string {
  if (monto >= 1_000_000) {
    return `$${(monto / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  return formatMontoLegal(monto, "COP");
}

export function getLegalizacionesAproKpis(
  items: Record<string, LegalizacionApro>,
) {
  const all = Object.values(items);
  const pendientes = all.filter((l) => !l.estadoApro);
  const aprobadosMes = all.filter(
    (l) => l.estadoApro === "Aprobado" && isMesReferencia(l.fechaApro),
  );
  const rechazadosMes = all.filter(
    (l) => l.estadoApro === "Rechazado" && isMesReferencia(l.fechaApro),
  );
  const montoPendiente = pendientes.reduce((sum, l) => sum + l.monto, 0);
  const montoAprobadoMes = aprobadosMes.reduce((sum, l) => sum + l.monto, 0);
  return {
    pendientes: pendientes.length,
    aprobadosMes: aprobadosMes.length,
    rechazadosMes: rechazadosMes.length,
    montoPendienteLabel: formatMontoCompact(montoPendiente),
    montoAprobadoMesLabel: formatMontoLegal(montoAprobadoMes, "COP"),
    total: all.length,
  };
}

export function filterLegalizacionesAproTab(
  items: Record<string, LegalizacionApro>,
  tab: "pend" | "res",
): LegalizacionApro[] {
  return Object.values(items).filter((l) => {
    const pend = l.estadoApro === "";
    return tab === "pend" ? pend : !pend;
  });
}
