"use server";

import { AnticipoEstadoDb } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import type { Anticipo, AnticipoExtra } from "@/src/lib/anticipos-registro";
import { hoyDMY } from "@/src/lib/anticipos-registro";
import {
  ensureAnticipoEmpleado,
  groupAnticiposByCodigo,
  nextAnticipoCodigo,
  timelineCancelado,
  timelineInicialLanzado,
  toAnticipo,
  toAnticipoExtra,
  tipoUiToDb,
} from "@/src/lib/registro-anticipos-db";
import type { TimelineItem } from "@/src/lib/anticipos-registro";
import { getTiempoEmpleadoContext } from "@/src/server/portal-user-profile";
import type { LanzarAnticipoInput } from "@/src/app/mis-anticipos/AnticiposContext";

async function requireAnticipoEmpleado() {
  const empleado = await getTiempoEmpleadoContext();
  if (!empleado) {
    throw new Error("Sesión IFS requerida para anticipos.");
  }
  return empleado;
}

export async function getAnticiposAction(): Promise<{
  anticipos: Record<string, Anticipo>;
  extras: Record<string, AnticipoExtra>;
  empleadoId: string;
}> {
  const empleado = await requireAnticipoEmpleado();
  const rows = await prisma.anticipo.findMany({
    where: {
      OR: [
        { empleadoId: empleado.empleadoId },
        { solicitanteId: empleado.empleadoId },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const grouped = groupAnticiposByCodigo(rows);
  return { ...grouped, empleadoId: empleado.empleadoId };
}

export async function lanzarAnticipoAction(
  input: LanzarAnticipoInput,
): Promise<{ codigo: string }> {
  const empleado = await requireAnticipoEmpleado();
  const codigo = await nextAnticipoCodigo(input.tipo);
  const fecha = hoyDMY();
  const sessionId = empleado.empleadoId;
  const benefId = input.paraOtro
    ? (input.beneficiarioId ?? "").replace(/\./g, "")
    : sessionId;
  const benefNombre = input.paraOtro
    ? (input.beneficiarioNombre ?? "—")
    : empleado.name;

  await ensureAnticipoEmpleado(benefId, benefNombre);
  await ensureAnticipoEmpleado(sessionId, empleado.name);

  const timeline = timelineInicialLanzado(empleado.name, fecha);

  await prisma.anticipo.create({
    data: {
      codigo,
      empleadoId: benefId,
      solicitanteId: sessionId,
      solicitanteNombre: empleado.name,
      beneficiarioNombre: benefNombre,
      beneficiarioCedula: input.paraOtro
        ? input.beneficiarioCedula ?? input.beneficiarioId
        : undefined,
      paraOtro: input.paraOtro,
      proyectoId: input.proyId,
      proyectoNombre: input.proyN,
      tipo: tipoUiToDb(input.tipo),
      monto: input.monto,
      divisa: input.div,
      motivo: input.motivo,
      compania: input.compania,
      empCompania: input.empCompania,
      aprobador: input.aprobador?.trim() || null,
      fechaSolicitud: fecha,
      fechaIda: input.fechaIda,
      fechaRegreso: input.fechaRegreso,
      destino: input.destino,
      tipoViaje: input.tipoViaje,
      timelineJson: timeline,
    },
  });

  return { codigo };
}

export async function cancelarAnticipoAction(codigo: string): Promise<void> {
  const empleado = await requireAnticipoEmpleado();
  const row = await prisma.anticipo.findUnique({ where: { codigo } });
  if (!row || row.estado !== AnticipoEstadoDb.LANZADO) return;
  if (row.solicitanteId !== empleado.empleadoId) {
    throw new Error("Solo quien lanzó la solicitud puede cancelarla.");
  }

  const tl = timelineCancelado(
    (Array.isArray(row.timelineJson) ? row.timelineJson : []) as TimelineItem[],
    empleado.name,
    hoyDMY(),
  );

  await prisma.anticipo.update({
    where: { id: row.id },
    data: {
      estado: AnticipoEstadoDb.CANCELADO,
      pago: "—",
      timelineJson: tl,
    },
  });
}

export async function getAnticipoByCodigoAction(codigo: string): Promise<{
  anticipo: Anticipo;
  extra: AnticipoExtra;
} | null> {
  const empleado = await requireAnticipoEmpleado();
  const row = await prisma.anticipo.findUnique({ where: { codigo } });
  if (!row) return null;
  if (
    row.empleadoId !== empleado.empleadoId &&
    row.solicitanteId !== empleado.empleadoId
  ) {
    return null;
  }
  return { anticipo: toAnticipo(row), extra: toAnticipoExtra(row) };
}
