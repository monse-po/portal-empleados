"use server";

import { RegistroEstadoDb } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import {
  isIfsRegistroId,
  mergeIfsAndLocalRegistros,
} from "@/src/lib/ifs/tiempo-timesheet";
import type { RegistroEstado, RegistroMock } from "@/src/lib/tiempo-registro";
import {
  dayRange,
  ensureRegistroTiempoRefs,
  estadoUiToDb,
  groupRegistrosByFecha,
  nextRegistroCodigo,
  toRegistroMock,
} from "@/src/lib/registro-tiempo-db";
import { createNotificacionesTiempoEnvioAction } from "@/src/server/notificacion-actions";
import { sendRegistrosToIfsAction } from "@/src/server/mi-tiempo-ifs-actions";
import { fetchRegistrosFromIfsAction } from "@/src/server/mi-tiempo-timesheet-actions";
import { getTiempoEmpleadoContext } from "@/src/server/portal-user-profile";
import type { TiempoEmpleadoContext } from "@/src/lib/portal-user-profile";
import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";
import { registroToHoja } from "@/src/lib/tiempo-bridge";

async function requireTiempoEmpleado(): Promise<TiempoEmpleadoContext> {
  const empleado = await getTiempoEmpleadoContext();
  if (!empleado) {
    throw new Error("Sesión IFS requerida para registrar tiempo.");
  }
  return empleado;
}

async function findRowByPublicId(empleadoId: string, id: string) {
  if (isIfsRegistroId(id)) return null;
  return prisma.registroTiempo.findFirst({
    where: {
      empleadoId,
      OR: [{ legacyId: id }, { id }, { codigo: id }],
    },
  });
}

async function getRegistrosFromNeon(
  empleadoId: string,
): Promise<Record<string, RegistroMock[]>> {
  const rows = await prisma.registroTiempo.findMany({
    where: { empleadoId },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });
  return groupRegistrosByFecha(rows);
}

export async function getRegistrosGroupedAction(): Promise<{
  registros: Record<string, RegistroMock[]>;
  fromIfs: boolean;
}> {
  const empleado = await requireTiempoEmpleado();
  const localGrouped = await getRegistrosFromNeon(empleado.empleadoId);
  const ifsResult = await fetchRegistrosFromIfsAction();

  if (!ifsResult.grouped) {
    throw new Error(
      ifsResult.error ?? "No se pudo leer la hoja de tiempo desde IFS.",
    );
  }

  return {
    registros: mergeIfsAndLocalRegistros(ifsResult.grouped, localGrouped),
    fromIfs: true,
  };
}

export async function getRegistrosDiaAction(
  fecha: string,
): Promise<RegistroMock[]> {
  const empleado = await requireTiempoEmpleado();
  const rows = await prisma.registroTiempo.findMany({
    where: {
      empleadoId: empleado.empleadoId,
      fecha: dayRange(fecha),
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRegistroMock);
}

export async function upsertRegistroAction(
  reg: RegistroMock,
): Promise<RegistroMock> {
  if (isIfsRegistroId(reg.id)) {
    throw new Error("Los registros de IFS aún no se pueden editar desde el portal.");
  }

  const empleado = await requireTiempoEmpleado();
  await ensureRegistroTiempoRefs(
    empleado.empleadoId,
    empleado.name,
    reg.proy,
  );

  const existing = await findRowByPublicId(empleado.empleadoId, reg.id);
  if (existing?.estado === RegistroEstadoDb.APROBADO) {
    throw new Error("Los registros aprobados no se pueden modificar.");
  }
  const data = {
    empleadoId: empleado.empleadoId,
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
  if (isIfsRegistroId(id)) return;
  const empleado = await requireTiempoEmpleado();
  const existing = await findRowByPublicId(empleado.empleadoId, id);
  if (!existing || existing.estado === RegistroEstadoDb.APROBADO) return;
  await prisma.registroTiempo.delete({ where: { id: existing.id } });
}

export async function enviarDiaAction(fecha: string): Promise<RegistroMock[]> {
  const empleado = await requireTiempoEmpleado();
  const rows = await prisma.registroTiempo.findMany({
    where: {
      empleadoId: empleado.empleadoId,
      estado: RegistroEstadoDb.REGISTRADO,
      fecha: dayRange(fecha),
    },
    orderBy: { createdAt: "asc" },
  });

  if (!rows.length) return [];

  const borradores = rows.map(toRegistroMock);
  const { legacyIds } = await sendRegistrosToIfsAction(borradores);

  for (const row of rows) {
    const publicId = row.legacyId ?? row.id;
    const ifsLegacyId = legacyIds[publicId];

    await prisma.registroTiempo.update({
      where: { id: row.id },
      data: {
        estado: RegistroEstadoDb.EN_REVISION,
        ...(ifsLegacyId ? { legacyId: ifsLegacyId } : {}),
      },
    });
  }

  const updated = await prisma.registroTiempo.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    orderBy: { createdAt: "asc" },
  });

  const enviados = updated.map(toRegistroMock);
  try {
    await createNotificacionesTiempoEnvioAction(enviados, {
      empleadoId: empleado.empleadoId,
      empleadoNombre: empleado.name,
    });
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
  const empleado = await requireTiempoEmpleado();
  const existing = await findRowByPublicId(empleado.empleadoId, id);
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
