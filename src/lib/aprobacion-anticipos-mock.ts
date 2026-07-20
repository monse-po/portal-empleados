import { dmyToSortKey } from "@/src/lib/tiempo-bridge";
import type { AnticipoTipo } from "@/src/lib/mis-anticipos-mock";
import { formatMonto, hoyDMY } from "@/src/lib/mis-anticipos-mock";
import {
  ACTION_COL_WIDTH,
  CHECKBOX_COL_WIDTH,
} from "@/src/components/ui/DataTable";

export type AnticipoAprobacionTab = "pendientes" | "resueltas";

export type AnticipoAprobacionEstado = "Aprobado" | "Rechazado" | "";

export type AnticipoAprobacion = {
  no: string;
  fecha: string;
  compania: string;
  empCompania: string;
  proy: string;
  proyN: string;
  tipo: AnticipoTipo;
  solicitante: string;
  cedula: string;
  nombre: string;
  cuenta: string;
  banco: string;
  tipoCuenta: string;
  divisa: string;
  monto: number;
  motivo: string;
  esViaje: boolean;
  fechaIda?: string;
  fechaReg?: string;
  destino?: string;
  creadoMeta?: string;
  estadoApro: AnticipoAprobacionEstado;
  comentarioApro: string;
  fechaApro: string;
  aprobador: string;
};

/** Aprobación anticipos — pendientes: checkbox + 7 datos + acciones */
export const APRO_ANT_COLS_PEND = [
  CHECKBOX_COL_WIDTH,
  "9%",   // Código
  "8%",   // Solicitado
  "12%",  // Empleado
  "7%",   // Tipo pill
  "13%",  // Proyecto
  "24%",  // Motivo
  "11%",  // Monto + divisa
  ACTION_COL_WIDTH,
] as const;

const SEED: AnticipoAprobacion[] = [
  {
    no: "AV20260089",
    fecha: "22/04/2026",
    compania: "HMVINGCO",
    empCompania: "HMVINGCO",
    proy: "PRY2025001",
    proyN: "Proyecto Alfa",
    tipo: "Viaje",
    solicitante: "Ana Martínez",
    cedula: "52.012.345",
    nombre: "Ana Martínez Rueda",
    cuenta: "4120056789",
    banco: "Bancolombia",
    tipoCuenta: "Ahorros",
    divisa: "COP",
    monto: 2_400_000,
    motivo:
      "Visita a cliente en instalaciones de Bogotá para revisión de avance del Proyecto Alfa. Requiere desplazamiento aéreo y hospedaje por 2 noches.",
    esViaje: true,
    fechaIda: "28/04/2026",
    fechaReg: "30/04/2026",
    destino: "Bogotá D.C.",
    creadoMeta: "22/04/2026 · 10:14 a.m.",
    estadoApro: "",
    comentarioApro: "",
    fechaApro: "",
    aprobador: "",
  },
  {
    no: "AV20260088",
    fecha: "22/04/2026",
    compania: "HMVINGCO",
    empCompania: "HMVINGCO",
    proy: "PRY2025002",
    proyN: "Proyecto Beta",
    tipo: "Gasto",
    solicitante: "Luis Herrera",
    cedula: "80.234.567",
    nombre: "Luis Herrera Cano",
    cuenta: "2350087654",
    banco: "Davivienda",
    tipoCuenta: "Corriente",
    divisa: "COP",
    monto: 1_800_000,
    motivo:
      "Compra de licencias anuales de software de modelado estructural para el equipo del Proyecto Beta. Cotización disponible en adjuntos.",
    esViaje: false,
    creadoMeta: "22/04/2026 · 09:30 a.m.",
    estadoApro: "",
    comentarioApro: "",
    fechaApro: "",
    aprobador: "",
  },
  {
    no: "AV20260087",
    fecha: "20/04/2026",
    compania: "HMVINGCO",
    empCompania: "HMVINGCO",
    proy: "PRY2025001",
    proyN: "Proyecto Alfa",
    tipo: "Viaje",
    solicitante: "Sandra López",
    cedula: "43.789.012",
    nombre: "Sandra López Mejía",
    cuenta: "5670034512",
    banco: "Banco de Bogotá",
    tipoCuenta: "Ahorros",
    divisa: "COP",
    monto: 890_000,
    motivo:
      "Desplazamiento en vehículo propio a Medellín para supervisión de instalaciones en planta del cliente. Viaje de un día.",
    esViaje: true,
    fechaIda: "25/04/2026",
    fechaReg: "25/04/2026",
    destino: "Medellín, Antioquia",
    creadoMeta: "20/04/2026 · 03:15 p.m.",
    estadoApro: "",
    comentarioApro: "",
    fechaApro: "",
    aprobador: "",
  },
  {
    no: "AV20260086",
    fecha: "19/04/2026",
    compania: "HMVINGCO",
    empCompania: "HMVINGCO",
    proy: "PRY2024003",
    proyN: "Proyecto Gamma",
    tipo: "Gasto",
    solicitante: "Jorge Peña",
    cedula: "79.456.789",
    nombre: "Jorge Peña Quintero",
    cuenta: "3890045623",
    banco: "BBVA",
    tipoCuenta: "Corriente",
    divisa: "COP",
    monto: 430_000,
    motivo:
      "Material de oficina para el equipo (papel, cartuchos, carpetas). Necesario para entregables del mes.",
    esViaje: false,
    creadoMeta: "19/04/2026 · 08:50 a.m.",
    estadoApro: "",
    comentarioApro: "",
    fechaApro: "",
    aprobador: "",
  },
  {
    no: "AV20260085",
    fecha: "17/04/2026",
    compania: "HMVINGCO",
    empCompania: "HMVINGCO",
    proy: "PRY2025003",
    proyN: "Proyecto Delta",
    tipo: "Viaje",
    solicitante: "María Camila Torres",
    cedula: "1.020.345.678",
    nombre: "María Camila Torres Vélez",
    cuenta: "6780012345",
    banco: "Bancolombia",
    tipoCuenta: "Ahorros",
    divisa: "COP",
    monto: 3_100_000,
    motivo:
      "Visita de campo a Barranquilla para levantamiento topográfico y reunión con interventoría del Proyecto Delta. 3 noches de hospedaje.",
    esViaje: true,
    fechaIda: "29/04/2026",
    fechaReg: "02/05/2026",
    destino: "Barranquilla, Atlántico",
    creadoMeta: "17/04/2026 · 11:00 a.m.",
    estadoApro: "",
    comentarioApro: "",
    fechaApro: "",
    aprobador: "",
  },
  {
    no: "AV20260081",
    fecha: "15/04/2026",
    compania: "HMVINGCO",
    empCompania: "HMVINGCO",
    proy: "PRY2025001",
    proyN: "Proyecto Alfa",
    tipo: "Viaje",
    solicitante: "Carlos Rivas",
    cedula: "80.123.456",
    nombre: "Carlos Rivas Mora",
    cuenta: "1234567890",
    banco: "Bancolombia",
    tipoCuenta: "Ahorros",
    divisa: "COP",
    monto: 1_200_000,
    motivo:
      "Reunión con cliente en Medellín para presentación de avance. Requiere tiquete aéreo y 1 noche de hospedaje.",
    esViaje: true,
    fechaIda: "18/04/2026",
    fechaReg: "19/04/2026",
    destino: "Medellín, Antioquia",
    creadoMeta: "15/04/2026 · 09:00 a.m.",
    estadoApro: "Aprobado",
    comentarioApro: "Aprobado conforme a política de viáticos.",
    fechaApro: "16/04/2026",
    aprobador: "Carlos Méndez",
  },
  {
    no: "AV20260079",
    fecha: "13/04/2026",
    compania: "HMVINGCO",
    empCompania: "HMVINGCO",
    proy: "PRY2025002",
    proyN: "Proyecto Beta",
    tipo: "Gasto",
    solicitante: "Ana Martínez",
    cedula: "52.012.345",
    nombre: "Ana Martínez Rueda",
    cuenta: "4120056789",
    banco: "Bancolombia",
    tipoCuenta: "Ahorros",
    divisa: "COP",
    monto: 320_000,
    motivo: "Papelería y suministros para entregables del mes.",
    esViaje: false,
    creadoMeta: "13/04/2026 · 11:30 a.m.",
    estadoApro: "Aprobado",
    comentarioApro: "Aprobado.",
    fechaApro: "14/04/2026",
    aprobador: "Carlos Méndez",
  },
  {
    no: "AV20260075",
    fecha: "09/04/2026",
    compania: "HMVINGCO",
    empCompania: "HMVINGCO",
    proy: "PRY2024003",
    proyN: "Proyecto Gamma",
    tipo: "Viaje",
    solicitante: "Luis Herrera",
    cedula: "80.234.567",
    nombre: "Luis Herrera Cano",
    cuenta: "2350087654",
    banco: "Davivienda",
    tipoCuenta: "Corriente",
    divisa: "COP",
    monto: 2_800_000,
    motivo: "Visita de supervisión a obra en Bogotá. 3 días.",
    esViaje: true,
    fechaIda: "12/04/2026",
    fechaReg: "14/04/2026",
    destino: "Bogotá D.C.",
    creadoMeta: "09/04/2026 · 08:00 a.m.",
    estadoApro: "Aprobado",
    comentarioApro: "Aprobado conforme presupuesto del proyecto.",
    fechaApro: "10/04/2026",
    aprobador: "Carlos Méndez",
  },
  {
    no: "AV20260077",
    fecha: "11/04/2026",
    compania: "HMVINGCO",
    empCompania: "HMVINGCO",
    proy: "PRY2025002",
    proyN: "Proyecto Beta",
    tipo: "Gasto",
    solicitante: "María Camila Torres",
    cedula: "1.020.345.678",
    nombre: "María Camila Torres Vélez",
    cuenta: "6780012345",
    banco: "Bancolombia",
    tipoCuenta: "Ahorros",
    divisa: "COP",
    monto: 4_200_000,
    motivo: "Compra de equipos de cómputo para el equipo.",
    esViaje: false,
    creadoMeta: "11/04/2026 · 02:00 p.m.",
    estadoApro: "Rechazado",
    comentarioApro:
      "Rechazado — excede el presupuesto disponible del proyecto. Revisar con el área de compras.",
    fechaApro: "12/04/2026",
    aprobador: "Carlos Méndez",
  },
  {
    no: "AV20260072",
    fecha: "07/04/2026",
    compania: "HMVINGCO",
    empCompania: "HMVINGCO",
    proy: "PRY2024003",
    proyN: "Proyecto Gamma",
    tipo: "Viaje",
    solicitante: "Luis Herrera",
    cedula: "80.234.567",
    nombre: "Luis Herrera Cano",
    cuenta: "2350087654",
    banco: "Davivienda",
    tipoCuenta: "Corriente",
    divisa: "COP",
    monto: 8_500_000,
    motivo:
      "Viaje internacional a México para reunión con proveedor estratégico.",
    esViaje: true,
    fechaIda: "15/04/2026",
    fechaReg: "18/04/2026",
    destino: "Ciudad de México, México",
    creadoMeta: "07/04/2026 · 10:00 a.m.",
    estadoApro: "Rechazado",
    comentarioApro:
      "Rechazado — viajes internacionales requieren aprobación de dirección. Escalar a la Gerencia General.",
    fechaApro: "08/04/2026",
    aprobador: "Carlos Méndez",
  },
];

export const GERENTE_APROBADOR = "Carlos Méndez";

export function cloneInitialAproAnticipos(): Record<string, AnticipoAprobacion> {
  const map: Record<string, AnticipoAprobacion> = {};
  SEED.forEach((s) => {
    map[s.no] = { ...s };
  });
  return map;
}

export function filterAproAnticiposByTab(
  solicitudes: Record<string, AnticipoAprobacion>,
  tab: AnticipoAprobacionTab,
): AnticipoAprobacion[] {
  const all = Object.values(solicitudes);
  let filtered: AnticipoAprobacion[];
  if (tab === "pendientes") {
    filtered = all.filter((s) => !s.estadoApro);
  } else {
    filtered = all.filter((s) => !!s.estadoApro);
  }
  return filtered.sort((a, b) => dmyToSortKey(a.fecha) - dmyToSortKey(b.fecha));
}

function isMesReferencia(fecha: string): boolean {
  const hoy = hoyDMY();
  const [, mesHoy, anioHoy] = hoy.split("/").map(Number);
  const [, mes, anio] = fecha.split("/").map(Number);
  return mes === mesHoy && anio === anioHoy;
}

export function getAproAnticiposKpis(solicitudes: Record<string, AnticipoAprobacion>) {
  const all = Object.values(solicitudes);
  const pendientes = all.filter((s) => !s.estadoApro);
  const aprobadosMes = all.filter(
    (s) => s.estadoApro === "Aprobado" && isMesReferencia(s.fechaApro),
  );
  const rechazadosMes = all.filter(
    (s) => s.estadoApro === "Rechazado" && isMesReferencia(s.fechaApro),
  );
  const montoPendiente = pendientes.reduce((a, s) => a + s.monto, 0);
  const montoAprobadoMes = aprobadosMes.reduce((a, s) => a + s.monto, 0);

  return {
    pendientes: pendientes.length,
    aprobadosMes: aprobadosMes.length,
    montoAprobadoMesLabel: formatMonto(montoAprobadoMes, "COP"),
    rechazadosMes: rechazadosMes.length,
    montoPendienteLabel: formatMontoCompact(montoPendiente),
  };
}

function formatMontoCompact(monto: number): string {
  if (monto >= 1_000_000) {
    return `$${(monto / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  return formatMonto(monto, "COP");
}

export function countAproAnticiposTabs(
  solicitudes: Record<string, AnticipoAprobacion>,
) {
  const all = Object.values(solicitudes);
  return {
    pendientes: all.filter((s) => !s.estadoApro).length,
    resueltas: all.filter((s) => !!s.estadoApro).length,
  };
}
