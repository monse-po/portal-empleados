"use server";

import { prisma } from "@/src/lib/db";
import {
  buildNotificacionesTiempoDecision,
  buildNotificacionesTiempoEnvio,
  inicioDiaBogota,
  NOTIF_INBOX_MAX,
  NOTIF_ROL_EMPLEADO,
  NOTIF_ROL_GERENTE,
  toNotificacionUi,
  type HojaNotificacionInput,
  type NotificacionDecision,
  type NotificacionEmpleado,
  type NotificacionUi,
} from "@/src/lib/notificacion-tiempo";
import {
  buildNotificacionesAnticipoDecision,
  type AnticipoNotificacionDecision,
  type AnticipoNotificacionInput,
} from "@/src/lib/notificacion-anticipos";
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

/** Aprobar / rechazar anticipo → aviso al empleado (Mis Anticipos). */
export async function createNotificacionesAnticipoDecisionAction(input: {
  decision: AnticipoNotificacionDecision;
  solicitudes: AnticipoNotificacionInput[];
  comentario?: string;
}): Promise<void> {
  const payloads = buildNotificacionesAnticipoDecision(
    input.decision,
    input.solicitudes,
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
    where: {
      destinatarioRol: NOTIF_ROL_GERENTE,
      createdAt: { gte: inicioDiaBogota() },
    },
    orderBy: { createdAt: "desc" },
    take: NOTIF_INBOX_MAX,
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
    where: {
      destinatarioRol: NOTIF_ROL_EMPLEADO,
      createdAt: { gte: inicioDiaBogota() },
    },
    orderBy: { createdAt: "desc" },
    take: NOTIF_INBOX_MAX,
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
  const destinatarioRol =
    rol === "empleado" ? NOTIF_ROL_EMPLEADO : NOTIF_ROL_GERENTE;
  await prisma.notificacion.updateMany({
    where: {
      destinatarioRol,
      leida: false,
      createdAt: { gte: inicioDiaBogota() },
    },
    data: { leida: true },
  });
}
