"use server";

import { prisma } from "@/src/lib/db";
import {
  buildNotificacionesTiempoEnvio,
  NOTIF_ROL_GERENTE,
  toNotificacionUi,
  type NotificacionUi,
} from "@/src/lib/notificacion-tiempo";
import type { RegistroMock } from "@/src/lib/mi-tiempo-mock";

export async function createNotificacionesTiempoEnvioAction(
  registros: RegistroMock[],
): Promise<void> {
  const payloads = buildNotificacionesTiempoEnvio(registros);
  if (!payloads.length) return;

  await prisma.notificacion.createMany({
    data: payloads.map((item) => ({
      modulo: "TIEMPO",
      tipo: item.tipo,
      titulo: item.titulo,
      mensaje: item.mensaje,
      destinatarioRol: NOTIF_ROL_GERENTE,
      empleadoId: item.empleadoId,
      empleadoNombre: item.empleadoNombre,
      proyectoId: item.proyectoId,
      proyectoCod: item.proyectoCod,
      fechaIso: item.fechaIso,
      registrosCount: item.registrosCount,
      href: item.href,
    })),
  });
}

export async function getNotificacionesGerenteAction(): Promise<{
  items: NotificacionUi[];
  unreadCount: number;
}> {
  const rows = await prisma.notificacion.findMany({
    where: { destinatarioRol: NOTIF_ROL_GERENTE },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = rows.filter((row) => !row.leida).length;
  return {
    items: rows.map(toNotificacionUi),
    unreadCount,
  };
}

export async function marcarNotificacionLeidaAction(id: string): Promise<void> {
  await prisma.notificacion.updateMany({
    where: { id, destinatarioRol: NOTIF_ROL_GERENTE },
    data: { leida: true },
  });
}

export async function marcarTodasNotificacionesLeidasAction(): Promise<void> {
  await prisma.notificacion.updateMany({
    where: { destinatarioRol: NOTIF_ROL_GERENTE, leida: false },
    data: { leida: true },
  });
}
