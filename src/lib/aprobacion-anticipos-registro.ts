import { dmyToSortKey } from "@/src/lib/tiempo-bridge";
import type { AnticipoTipo } from "@/src/lib/anticipos-registro";
import { formatMonto, hoyDMY } from "@/src/lib/anticipos-registro";
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

export const APRO_ANT_COLS_PEND = [
  CHECKBOX_COL_WIDTH,
  "9%",
  "8%",
  "12%",
  "7%",
  "13%",
  "24%",
  "11%",
  ACTION_COL_WIDTH,
] as const;

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

function formatMontoCompact(monto: number): string {
  if (monto >= 1_000_000) {
    return `$${(monto / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  return formatMonto(monto, "COP");
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

export function countAproAnticiposTabs(
  solicitudes: Record<string, AnticipoAprobacion>,
) {
  const all = Object.values(solicitudes);
  return {
    pendientes: all.filter((s) => !s.estadoApro).length,
    resueltas: all.filter((s) => !!s.estadoApro).length,
  };
}
