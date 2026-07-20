import {
  RegistroEstadoDb,
  type RegistroTiempo,
} from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";
import type { RegistroEstado, RegistroMock } from "@/src/lib/mi-tiempo-mock";

export const SESSION_EMPLEADO_ID = SESSION_EMPLEADO.cedula.replace(/\./g, "");

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Rango UTC de un día ISO (yyyy-mm-dd) para filtros Prisma */
export function dayRange(fecha: string) {
  return {
    gte: new Date(`${fecha}T00:00:00.000Z`),
    lte: new Date(`${fecha}T23:59:59.999Z`),
  };
}

export function estadoDbToUi(estado: RegistroEstadoDb): RegistroEstado {
  switch (estado) {
    case RegistroEstadoDb.EN_REVISION:
      return "En revisión";
    case RegistroEstadoDb.APROBADO:
      return "Aprobado";
    case RegistroEstadoDb.RECHAZADO:
      return "Rechazado";
    default:
      return "Registrado";
  }
}

export function estadoUiToDb(estado: RegistroEstado): RegistroEstadoDb {
  switch (estado) {
    case "En revisión":
      return RegistroEstadoDb.EN_REVISION;
    case "Aprobado":
      return RegistroEstadoDb.APROBADO;
    case "Rechazado":
      return RegistroEstadoDb.RECHAZADO;
    default:
      return RegistroEstadoDb.REGISTRADO;
  }
}

export function toRegistroMock(row: RegistroTiempo): RegistroMock {
  return {
    id: row.legacyId ?? row.id,
    codigo: row.codigo,
    proy: row.proyectoId,
    subproy: row.subproyecto ?? undefined,
    act: row.actividad,
    tipo: row.tipoHora,
    horas: row.horas,
    fecha: toIsoDate(row.fecha),
    comentario: row.comentario,
    comentarioRechazo: row.comentarioRechazo || undefined,
    aprobador: row.aprobador ?? undefined,
    estado: estadoDbToUi(row.estado),
  };
}

export function groupRegistrosByFecha(
  rows: RegistroTiempo[],
): Record<string, RegistroMock[]> {
  const grouped: Record<string, RegistroMock[]> = {};
  for (const row of rows) {
    const fecha = toIsoDate(row.fecha);
    if (!grouped[fecha]) grouped[fecha] = [];
    grouped[fecha].push(toRegistroMock(row));
  }
  return grouped;
}

export async function nextRegistroCodigo(): Promise<string> {
  const count = await prisma.registroTiempo.count();
  return `HTREG${String(count + 1).padStart(6, "0")}`;
}
