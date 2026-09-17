"use server";

import { prisma } from "@/src/lib/db";
import {
  buildNotificacionesTiempoDecision,
  buildNotificacionesTiempoEnvio,
  canonicalNotifEmpleadoId,
  inicioDiaBogota,
  NOTIF_INBOX_MAX,
  NOTIF_ROL_EMPLEADO,
  NOTIF_ROL_GERENTE,
  notifEmpleadoMatchesSession,
  notifSessionIds,
  toNotificacionUi,
  type HojaNotificacionInput,
  type NotificacionDecision,
  type NotificacionUi,
} from "@/src/lib/notificacion-tiempo";
import {
  buildNotificacionesAnticipoDecision,
  type AnticipoNotificacionDecision,
  type AnticipoNotificacionInput,
} from "@/src/lib/notificacion-anticipos";
import type { RegistroMock } from "@/src/lib/tiempo-registro";
import { enviarCorreosDecision } from "@/src/server/notificacion-email";
import { getPortalUserProfile } from "@/src/server/portal-user-profile";

const EMPTY_INBOX = { items: [] as NotificacionUi[], unreadCount: 0 };

async function sessionNotifActor() {
  const profile = await getPortalUserProfile();
  if (!profile) return null;
  const ids = notifSessionIds(profile);
  const empleadoId = canonicalNotifEmpleadoId(profile);
  if (!ids.length && !empleadoId) return null;
  return {
    profile,
    ids: ids.length ? ids : empleadoId ? [empleadoId] : [],
    empleadoId,
    nombre: profile.name,
  };
}

export async function createNotificacionesTiempoEnvioAction(
  registros: RegistroMock[],
): Promise<void> {
  try {
    const actor = await sessionNotifActor();
    if (!actor?.empleadoId) return;

    const payloads = buildNotificacionesTiempoEnvio(registros, {
      empleadoId: actor.empleadoId,
      empleadoNombre: actor.nombre,
    });
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
  } catch (error) {
    console.error("[notificaciones] error al crear envío", error);
  }
}

/** Una por empleado en el lote (no por línea). */
export async function createNotificacionesTiempoDecisionAction(input: {
  decision: NotificacionDecision;
  hojas: HojaNotificacionInput[];
  comentario?: string;
}): Promise<void> {
  try {
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

    await enviarCorreosTrasCampana(payloads);
  } catch (error) {
    console.error("[notificaciones] error al crear decisión tiempo", error);
  }
}

/** Aprobar / rechazar anticipo → aviso al empleado (Mis Anticipos). */
export async function createNotificacionesAnticipoDecisionAction(input: {
  decision: AnticipoNotificacionDecision;
  solicitudes: AnticipoNotificacionInput[];
  comentario?: string;
}): Promise<void> {
  try {
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

    await enviarCorreosTrasCampana(payloads);
  } catch (error) {
    console.error("[notificaciones] error al crear decisión anticipo", error);
  }
}

async function enviarCorreosTrasCampana(
  payloads: Array<{
    titulo: string;
    mensaje: string;
    empleadoId: string;
    empleadoNombre: string;
    href: string;
    registrosCount?: number;
  }>,
): Promise<void> {
  try {
    const actor = await sessionNotifActor();
    await enviarCorreosDecision({
      payloads,
      impersonating: actor?.profile.impersonating ?? false,
    });
  } catch (error) {
    console.error("[notificaciones] no se pudo enviar correo", error);
  }
}

export async function getNotificacionesGerenteAction(): Promise<{
  items: NotificacionUi[];
  unreadCount: number;
}> {
  try {
    const actor = await sessionNotifActor();
    if (!actor) return EMPTY_INBOX;

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
  } catch (error) {
    console.error("[notificaciones] inbox gerente", error);
    return EMPTY_INBOX;
  }
}

export async function getNotificacionesEmpleadoAction(): Promise<{
  items: NotificacionUi[];
  unreadCount: number;
}> {
  try {
    const actor = await sessionNotifActor();
    if (!actor?.ids.length) return EMPTY_INBOX;

    const rows = await prisma.notificacion.findMany({
      where: {
        destinatarioRol: NOTIF_ROL_EMPLEADO,
        empleadoId: { in: actor.ids },
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
  } catch (error) {
    console.error("[notificaciones] inbox empleado", error);
    return EMPTY_INBOX;
  }
}

export async function marcarNotificacionLeidaAction(id: string): Promise<void> {
  try {
    const actor = await sessionNotifActor();
    if (!actor) return;

    const row = await prisma.notificacion.findUnique({
      where: { id },
      select: { destinatarioRol: true, empleadoId: true },
    });
    if (!row) return;

    if (row.destinatarioRol === NOTIF_ROL_EMPLEADO) {
      if (!notifEmpleadoMatchesSession(row.empleadoId, actor.ids)) return;
    }

    await prisma.notificacion.updateMany({
      where: { id },
      data: { leida: true },
    });
  } catch (error) {
    console.error("[notificaciones] marcar leída", error);
  }
}

export async function marcarTodasNotificacionesLeidasAction(
  rol: "gerente" | "empleado" = "gerente",
): Promise<void> {
  try {
    const actor = await sessionNotifActor();
    if (!actor) return;

    if (rol === "empleado") {
      if (!actor.ids.length) return;
      await prisma.notificacion.updateMany({
        where: {
          destinatarioRol: NOTIF_ROL_EMPLEADO,
          empleadoId: { in: actor.ids },
          leida: false,
          createdAt: { gte: inicioDiaBogota() },
        },
        data: { leida: true },
      });
      return;
    }

    await prisma.notificacion.updateMany({
      where: {
        destinatarioRol: NOTIF_ROL_GERENTE,
        leida: false,
        createdAt: { gte: inicioDiaBogota() },
      },
      data: { leida: true },
    });
  } catch (error) {
    console.error("[notificaciones] marcar todas", error);
  }
}
