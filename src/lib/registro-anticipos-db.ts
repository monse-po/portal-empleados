import {
  AnticipoEstadoDb,
  AnticipoTipoDb,
  type Anticipo as AnticipoRow,
} from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import type {
  Anticipo,
  AnticipoEstado,
  AnticipoExtra,
  AnticipoTipo,
  TimelineItem,
} from "@/src/lib/anticipos-registro";
import { isAnticipoDisponible } from "@/src/lib/anticipos-registro";

export function estadoDbToUi(estado: AnticipoEstadoDb): AnticipoEstado {
  switch (estado) {
    case AnticipoEstadoDb.LANZADO:
      return "Lanzado";
    case AnticipoEstadoDb.APROBADO:
      return "Aprobado";
    case AnticipoEstadoDb.PAGADO:
      return "Pagado";
    case AnticipoEstadoDb.RECHAZADO:
      return "Rechazado";
    case AnticipoEstadoDb.CANCELADO:
      return "Cancelado";
    default:
      return "Lanzado";
  }
}

export function estadoUiToDb(estado: AnticipoEstado): AnticipoEstadoDb {
  switch (estado) {
    case "Lanzado":
      return AnticipoEstadoDb.LANZADO;
    case "Aprobado":
      return AnticipoEstadoDb.APROBADO;
    case "Pagado":
      return AnticipoEstadoDb.PAGADO;
    case "Rechazado":
      return AnticipoEstadoDb.RECHAZADO;
    case "Cancelado":
      return AnticipoEstadoDb.CANCELADO;
    default:
      return AnticipoEstadoDb.LANZADO;
  }
}

export function tipoDbToUi(tipo: AnticipoTipoDb): AnticipoTipo {
  return tipo === AnticipoTipoDb.VIAJE ? "Viaje" : "Gasto";
}

export function tipoUiToDb(tipo: AnticipoTipo): AnticipoTipoDb {
  return tipo === "Viaje" ? AnticipoTipoDb.VIAJE : AnticipoTipoDb.GASTO;
}

function parseTimeline(raw: unknown): TimelineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as TimelineItem[];
}

export function toAnticipo(row: AnticipoRow): Anticipo {
  const estado = estadoDbToUi(row.estado);
  return {
    no: row.codigo,
    fecha: row.fechaSolicitud,
    proy: row.proyectoId,
    proyN: row.proyectoNombre,
    tipo: tipoDbToUi(row.tipo),
    monto: row.monto,
    div: row.divisa,
    estado,
    disponible: isAnticipoDisponible(estado),
    motivo: row.motivo,
    fechaAprob: row.fechaAprob,
    aprobador: row.aprobador,
    pago: row.pago,
    solicitante: row.solicitanteNombre,
    solicitanteId: row.solicitanteId,
    beneficiarioId: row.empleadoId,
    beneficiarioNombre: row.beneficiarioNombre,
    cedula: row.beneficiarioCedula ?? undefined,
    paraOtro: row.paraOtro,
  };
}

export function toAnticipoExtra(row: AnticipoRow): AnticipoExtra {
  const tl = parseTimeline(row.timelineJson);
  return {
    compania: row.compania,
    empCompania: row.empCompania,
    empId: row.empleadoId,
    aprobadoPor: row.aprobadorNombre ?? undefined,
    fechaIda: row.fechaIda ?? undefined,
    fechaRegreso: row.fechaRegreso ?? undefined,
    destino: row.destino ?? undefined,
    tipoViaje:
      row.tipoViaje === "nacional" || row.tipoViaje === "internacional"
        ? row.tipoViaje
        : undefined,
    cuenta: row.cuenta ?? undefined,
    banco: row.banco ?? undefined,
    tipoCuenta: row.tipoCuenta ?? undefined,
    tl,
  };
}

export function groupAnticiposByCodigo(
  rows: AnticipoRow[],
): { anticipos: Record<string, Anticipo>; extras: Record<string, AnticipoExtra> } {
  const anticipos: Record<string, Anticipo> = {};
  const extras: Record<string, AnticipoExtra> = {};
  for (const row of rows) {
    anticipos[row.codigo] = toAnticipo(row);
    extras[row.codigo] = toAnticipoExtra(row);
  }
  return { anticipos, extras };
}

export async function nextAnticipoCodigo(tipo: AnticipoTipo): Promise<string> {
  const prefix = tipo === "Viaje" ? "AV" : "AG";
  const rows = await prisma.anticipo.findMany({
    where: { codigo: { startsWith: prefix } },
    select: { codigo: true },
  });

  let max = 0;
  for (const row of rows) {
    const match = row.codigo.match(/^(?:AV|AG)(\d+)$/i);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export async function ensureAnticipoEmpleado(
  empleadoId: string,
  nombre: string,
): Promise<void> {
  await prisma.empleado.upsert({
    where: { id: empleadoId },
    create: { id: empleadoId, nombre },
    update: { nombre },
  });
}

export function timelineInicialLanzado(
  solicitanteNombre: string,
  fecha: string,
): TimelineItem[] {
  const ahora = `${fecha} · ahora`;
  return [
    {
      accion: "Solicitud lanzada",
      usuario: solicitanteNombre,
      fecha: ahora,
      icon: "send",
      color: "#1e40af",
    },
    {
      accion: "Esperando aprobación",
      usuario: "Sistema",
      fecha: "Pendiente",
      icon: "clock",
      color: "#854d0e",
    },
  ];
}

export function timelineCancelado(
  tl: TimelineItem[],
  solicitanteNombre: string,
  fecha: string,
): TimelineItem[] {
  const filtered = tl.filter((t) => !t.accion.startsWith("Esperando"));
  return [
    ...filtered,
    {
      accion: "Cancelado por el empleado",
      usuario: solicitanteNombre,
      fecha,
      icon: "ban",
      color: "#6b7280",
    },
  ];
}
