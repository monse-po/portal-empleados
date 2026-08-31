"use server";

import { prisma } from "@/src/lib/db";
import {
  buildNotificacionesTiempoDecision,
  buildNotificacionesTiempoEnvio,
  NOTIF_ROL_EMPLEADO,
  NOTIF_ROL_GERENTE,
  toNotificacionUi,
  type HojaNotificacionInput,
  type NotificacionDecision,
  type NotificacionEmpleado,
  type NotificacionUi,
} from "@/src/lib/notificacion-tiempo";
import type { RegistroMock } from "@/src/lib/tiempo-registro";

export async function createNotificacionesTiempoEnvioAction(
  registros: RegistroMock[],
  empleado: NotificacionEmpleado,
): Promise<void> {
  const payloads = buildNotificacionesTiempoEnvio(registros, empleado);
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

/** Una por empleado en el lote (no por línea). */
export async function createNotificacionesTiempoDecisionAction(input: {
  decision: NotificacionDecision;
  hojas: HojaNotificacionInput[];
  comentario?: string;
}): Promise<void> {
  const payloads = buildNotificacionesTiempoDecision(
    input.decision,
    input.hojas,
    input.comentario,
  );
  if (!payloads.length) return;

  await prisma.notificacion.createMany({
    data: payloads.map((item) => ({
      modulo: "TIEMPO",
      tipo: item.tipo,
      titulo: item.titulo,
      mensaje: item.mensaje,
      destinatarioRol: NOTIF_ROL_EMPLEADO,
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

export async function getNotificacionesEmpleadoAction(): Promise<{
  items: NotificacionUi[];
  unreadCount: number;
}> {
  // Portal actual: un usuario con rol UI. Filtrar por EmpNo/sesión cuando haya multi-usuario.
  const rows = await prisma.notificacion.findMany({
    where: { destinatarioRol: NOTIF_ROL_EMPLEADO },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = rows.filter((row) => !row.leida).length;
  return {
    items: rows.map((row) => ({
      ...toNotificacionUi(row),
      href: row.href ?? "/hoja-tiempo",
    })),
    unreadCount,
  };
}

export async function marcarNotificacionLeidaAction(id: string): Promise<void> {
  await prisma.notificacion.updateMany({
    where: { id },
    data: { leida: true },
  });
}

export async function marcarTodasNotificacionesLeidasAction(
  rol: "gerente" | "empleado" = "gerente",
): Promise<void> {
  if (rol === "empleado") {
    await prisma.notificacion.updateMany({
      where: {
        destinatarioRol: NOTIF_ROL_EMPLEADO,
        leida: false,
      },
      data: { leida: true },
    });
    return;
  }

  await prisma.notificacion.updateMany({
    where: { destinatarioRol: NOTIF_ROL_GERENTE, leida: false },
    data: { leida: true },
  });
}
