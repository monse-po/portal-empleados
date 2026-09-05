"use server";

import { AnticipoEstadoDb } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import type { AnticipoAprobacion } from "@/src/lib/aprobacion-anticipos-registro";
import { hoyDMY } from "@/src/lib/anticipos-registro";
import { listAprobacionAnticiposAction } from "@/src/server/anticipos-actions";
import { getTiempoEmpleadoContext } from "@/src/server/portal-user-profile";

async function requireAnticipoEmpleado() {
  const empleado = await getTiempoEmpleadoContext();
  if (!empleado) {
    throw new Error("Sesión IFS requerida.");
  }
  return empleado;
}

export async function getAprobacionAnticiposAction(): Promise<
  Record<string, AnticipoAprobacion>
> {
  const result = await listAprobacionAnticiposAction();
  return result.solicitudes;
}

export async function aprobarAnticiposAction(
  codigos: string[],
  comentario = "",
  aprobadorNombre = "Gerente",
): Promise<void> {
  await requireAnticipoEmpleado();
  const fecha = hoyDMY();

  await prisma.anticipo.updateMany({
    where: {
      codigo: { in: codigos },
      estado: AnticipoEstadoDb.LANZADO,
    },
    data: {
      estado: AnticipoEstadoDb.APROBADO,
      fechaAprob: fecha,
      aprobadorNombre,
      comentarioAprobacion: comentario,
      pago: "Pendiente",
    },
  });
}

export async function rechazarAnticiposAction(
  codigos: string[],
  comentario: string,
  aprobadorNombre = "Gerente",
): Promise<void> {
  await requireAnticipoEmpleado();
  const fecha = hoyDMY();

  await prisma.anticipo.updateMany({
    where: {
      codigo: { in: codigos },
      estado: AnticipoEstadoDb.LANZADO,
    },
    data: {
      estado: AnticipoEstadoDb.RECHAZADO,
      fechaAprob: fecha,
      aprobadorNombre,
      comentarioAprobacion: comentario,
      pago: "—",
    },
  });
}

export async function countAnticiposPendientesAction(): Promise<number> {
  return prisma.anticipo.count({
    where: { estado: AnticipoEstadoDb.LANZADO },
  });
}
