import {
  cloneInitialLegalizaciones,
  formatMontoLegal,
  type Legalizacion,
} from "@/src/lib/legalizaciones-mock";
import {
  ACTION_COL_WIDTH,
  CHECKBOX_COL_WIDTH,
} from "@/src/components/ui/DataTable";

export type LegalizacionAproEstado = "" | "Aprobado" | "Rechazado";

export type LegalizacionApro = Legalizacion & {
  solicitante: string;
  cedula: string;
  estadoApro: LegalizacionAproEstado;
  comentarioApro: string;
  fechaApro: string;
};

/** Aprobación legalizaciones — pendientes: checkbox + datos + acciones */
export const APRO_LEG_COLS_PEND = [
  CHECKBOX_COL_WIDTH,
  "9%",   // Código
  "8%",   // Solicitado
  "12%",  // Empleado
  "9%",   // Tipo pill
  "18%",  // Concepto
  "22%",  // Motivo
  "11%",  // Monto + divisa
  ACTION_COL_WIDTH,
] as const;

const SOLICITANTE = {
  nombre: "Carlos Rivas Mora",
  cedula: "1.023.456.789",
};

function toApro(reg: Legalizacion): LegalizacionApro {
  const pendiente = reg.estado === "En revisión";
  return {
    ...reg,
    solicitante: SOLICITANTE.nombre,
    cedula: SOLICITANTE.cedula,
    estadoApro: pendiente ? "" : reg.estado === "Aprobado" ? "Aprobado" : "Rechazado",
    comentarioApro: "",
    fechaApro: pendiente ? "" : reg.fecha,
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
    estado: "En revisión",
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
    solicitante: SOLICITANTE.nombre,
    cedula: SOLICITANTE.cedula,
    estadoApro: "",
    comentarioApro: "",
    fechaApro: "",
  };
  return next;
}

export function getLegalizacionesAproKpis(
  items: Record<string, LegalizacionApro>,
) {
  const all = Object.values(items);
  const pendientes = all.filter((l) => l.estadoApro === "").length;
  const resueltas = all.filter((l) => l.estadoApro !== "");
  const aprobadosMes = resueltas.filter((l) => l.estadoApro === "Aprobado").length;
  const rechazadosMes = resueltas.filter(
    (l) => l.estadoApro === "Rechazado",
  ).length;
  const montoPendiente = all
    .filter((l) => l.estadoApro === "")
    .reduce((sum, l) => sum + l.monto, 0);
  return {
    pendientes,
    aprobadosMes,
    rechazadosMes,
    montoPendienteLabel: formatMontoLegal(montoPendiente, "COP"),
    montoAprobadoMesLabel: `${aprobadosMes} legalización${aprobadosMes === 1 ? "" : "es"}`,
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
