"use server";

import { RegistroEstadoDb } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import type { RegistroEstado, RegistroMock } from "@/src/lib/mi-tiempo-mock";
import {
  SESSION_EMPLEADO_ID,
  dayRange,
  ensureRegistroTiempoRefs,
  estadoUiToDb,
  groupRegistrosByFecha,
  nextRegistroCodigo,
  toRegistroMock,
} from "@/src/lib/registro-tiempo-db";
import { createNotificacionesTiempoEnvioAction } from "@/src/server/notificacion-actions";
import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";
import { registroToHoja } from "@/src/lib/tiempo-bridge";

async function findRowByPublicId(id: string) {
  return prisma.registroTiempo.findFirst({
    where: {
      empleadoId: SESSION_EMPLEADO_ID,
      OR: [{ legacyId: id }, { id }, { codigo: id }],
    },
  });
}

export async function getRegistrosGroupedAction(): Promise<
  Record<string, RegistroMock[]>
> {
  const rows = await prisma.registroTiempo.findMany({
    where: { empleadoId: SESSION_EMPLEADO_ID },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });
  return groupRegistrosByFecha(rows);
}

export async function getRegistrosDiaAction(
  fecha: string,
): Promise<RegistroMock[]> {
  const rows = await prisma.registroTiempo.findMany({
    where: {
      empleadoId: SESSION_EMPLEADO_ID,
      fecha: dayRange(fecha),
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRegistroMock);
}

export async function upsertRegistroAction(
  reg: RegistroMock,
): Promise<RegistroMock> {
  await ensureRegistroTiempoRefs(reg.proy);

  const existing = await findRowByPublicId(reg.id);
  const data = {
    empleadoId: SESSION_EMPLEADO_ID,
    proyectoId: reg.proy,
    subproyecto: reg.subproy ?? null,
    actividad: reg.act,
    tipoHora: reg.tipo,
    horas: reg.horas,
    fecha: new Date(`${reg.fecha}T12:00:00.000Z`),
    comentario: reg.comentario ?? "",
    comentarioRechazo: reg.comentarioRechazo ?? "",
    aprobador: reg.aprobador ?? null,
    estado: estadoUiToDb(reg.estado),
  };

  if (existing) {
    const updated = await prisma.registroTiempo.update({
      where: { id: existing.id },
      data,
    });
    return toRegistroMock(updated);
  }

  const codigo = reg.codigo ?? (await nextRegistroCodigo());
  const created = await prisma.registroTiempo.create({
    data: {
      ...data,
      codigo,
      legacyId: reg.id.startsWith("r") ? reg.id : null,
    },
  });
  return toRegistroMock(created);
}

export async function deleteRegistroAction(id: string): Promise<void> {
  const existing = await findRowByPublicId(id);
  if (!existing) return;
  await prisma.registroTiempo.delete({ where: { id: existing.id } });
}

export async function enviarDiaAction(fecha: string): Promise<RegistroMock[]> {
  const rows = await prisma.registroTiempo.findMany({
    where: {
      empleadoId: SESSION_EMPLEADO_ID,
      estado: RegistroEstadoDb.REGISTRADO,
      fecha: dayRange(fecha),
    },
  });

  if (!rows.length) return [];

  await prisma.registroTiempo.updateMany({
    where: { id: { in: rows.map((row) => row.id) } },
    data: { estado: RegistroEstadoDb.EN_REVISION },
  });

  const updated = await prisma.registroTiempo.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
  });

  const enviados = updated.map(toRegistroMock);
  try {
    await createNotificacionesTiempoEnvioAction(enviados);
  } catch (error) {
    console.error("[notificaciones] error al crear envío", error);
  }

  return enviados;
}

/** Pendientes reales en BD → bandeja del gerente (sobrevive refresh y deep links). */
export async function getHojasPendientesAprobacionAction(): Promise<
  HojaAprobacion[]
> {
  const rows = await prisma.registroTiempo.findMany({
    where: { estado: RegistroEstadoDb.EN_REVISION },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((row) => registroToHoja(toRegistroMock(row)));
}

export async function updateRegistroEstadoAction(
  id: string,
  estado: RegistroEstado,
  comentarioRechazo = "",
): Promise<RegistroMock | null> {
  const existing = await findRowByPublicId(id);
  if (!existing) return null;

  const updated = await prisma.registroTiempo.update({
    where: { id: existing.id },
    data: {
      estado: estadoUiToDb(estado),
      comentarioRechazo,
    },
  });

  return toRegistroMock(updated);
}
