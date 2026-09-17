import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";
import {
  empleadoDbIdFromEmail,
  type PortalUserProfile,
} from "@/src/lib/portal-user-profile";
import type { RegistroMock } from "@/src/lib/tiempo-registro";
import { baseProyectoCodigo } from "@/src/lib/proyecto-display";
import { formatHorasValor } from "@/src/lib/tiempo-schedule";
import { isoToDmy, proyCodAprobacion } from "@/src/lib/tiempo-bridge";

export type NotificacionEmpleado = {
  empleadoId: string;
  empleadoNombre: string;
};

export type NotificacionUi = {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  href: string;
  createdAt: string;
  registrosCount: number;
};

export const NOTIF_ROL_GERENTE = "gerente" as const;
export const NOTIF_ROL_EMPLEADO = "empleado" as const;

/** Tope de filas del inbox de hoy (además del corte de calendario). */
export const NOTIF_INBOX_MAX = 50;

/** Inicio del día en Colombia — el inbox no mezcla fechas anteriores. */
export function inicioDiaBogota(ref = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ref);
  return new Date(`${ymd}T00:00:00-05:00`);
}

/** Relativo a hoy. Nunca muestra una fecha vieja. */
export function formatNotifWhen(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  return "Hoy";
}

export const NOTIF_TIPO_TIEMPO_ENVIO = "TIEMPO_ENVIO_DIA" as const;
export const NOTIF_TIPO_TIEMPO_APROBADO = "TIEMPO_APROBADO" as const;
export const NOTIF_TIPO_TIEMPO_RECHAZADO = "TIEMPO_RECHAZADO" as const;
export const NOTIF_TIPO_TIEMPO_ANULADO = "TIEMPO_ANULADO" as const;

export type NotificacionDecision = "aprobado" | "rechazado" | "anulado";

export type HojaNotificacionInput = {
  no: string;
  fecha: string;
  cedula: string;
  nombre: string;
  proy: string;
  horas?: number;
};

function proyectoNotif(proy: string): string {
  return baseProyectoCodigo(proy) || proy.split("·")[0]?.trim() || proy;
}

function horasNotif(n: number): string {
  return `${formatHorasValor(n)} h`;
}

function sumHorasNotif(
  items: Array<{ horas?: number }>,
): number {
  return items.reduce((sum, item) => {
    const n = Number(item.horas);
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);
}

type NotificacionRow = {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  href: string | null;
  createdAt: Date;
  registrosCount: number;
};

export function toNotificacionUi(row: NotificacionRow): NotificacionUi {
  return {
    id: row.id,
    titulo: row.titulo,
    mensaje: row.mensaje,
    leida: row.leida,
    href: row.href ?? "/aprobacion-tiempo-proyectos",
    createdAt: row.createdAt.toISOString(),
    registrosCount: row.registrosCount,
  };
}

export function normalizeNotifEmpleadoId(cedula: string): string {
  return cedula.replace(/\./g, "").trim();
}

type NotifIdentityInput = Pick<
  PortalUserProfile,
  "empNo" | "ifsEmpId" | "empleadoDbId" | "personId" | "email"
>;

function pushNotifId(out: Set<string>, value?: string | null) {
  const id = normalizeNotifEmpleadoId(value ?? "");
  if (!id || id === "—") return;
  out.add(id);
  const upper = id.toUpperCase();
  const lower = id.toLowerCase();
  if (upper !== id) out.add(upper);
  if (lower !== id) out.add(lower);
  const digits = id.replace(/\D/g, "");
  if (digits) out.add(digits);
}

export function notifEmpleadoMatchesSession(
  empleadoId: string | null | undefined,
  ids: string[],
): boolean {
  if (!empleadoId || !ids.length) return false;
  const n = normalizeNotifEmpleadoId(empleadoId);
  if (ids.includes(n) || ids.includes(n.toUpperCase()) || ids.includes(n.toLowerCase())) {
    return true;
  }
  const digits = n.replace(/\D/g, "");
  return Boolean(digits && ids.includes(digits));
}

/** Claves con las que el inbox puede encontrar a esta sesión (EmpNo ≠ PersonId). */
export function notifSessionIds(profile: NotifIdentityInput): string[] {
  const out = new Set<string>();
  pushNotifId(out, profile.empNo);
  pushNotifId(out, profile.ifsEmpId);
  pushNotifId(out, profile.empleadoDbId);
  pushNotifId(out, profile.personId);
  if (profile.email) pushNotifId(out, empleadoDbIdFromEmail(profile.email));
  return [...out];
}

/** EmpNo IFS primero: es el mismo id que llega en la bandeja de aprobación. */
export function canonicalNotifEmpleadoId(profile: NotifIdentityInput): string {
  return (
    normalizeNotifEmpleadoId(profile.empNo ?? "") ||
    normalizeNotifEmpleadoId(profile.ifsEmpId ?? "") ||
    normalizeNotifEmpleadoId(profile.empleadoDbId ?? "") ||
    ""
  );
}

function buildAprobacionHref(): string {
  return "/aprobacion-tiempo-proyectos";
}

function miTiempoHref(): string {
  return "/hoja-tiempo";
}

/** Una notificación por envío (clic en "Enviar a aprobación"), no por línea. */
export function buildNotificacionesTiempoEnvio(
  registros: RegistroMock[],
  empleado: NotificacionEmpleado,
): Array<{
  tipo: string;
  titulo: string;
  mensaje: string;
  empleadoId: string;
  empleadoNombre: string;
  proyectoId: string;
  proyectoCod: string;
  fechaIso: string;
  registrosCount: number;
  href: string;
}> {
  if (!registros.length) return [];

  const { empleadoId, empleadoNombre } = empleado;
  const fechaIso = registros[0].fecha;
  const fechaLegible = isoToDmy(fechaIso);
  const count = registros.length;
  const proyIds = [...new Set(registros.map((reg) => reg.proy))];
  const unicoProyecto = proyIds.length === 1;
  const sample = registros[0];
  const proyectoId = sample.proy;
  const proyectoCod = proyCodAprobacion(sample.proy);
  const horasTxt = horasNotif(registros.reduce((s, r) => s + r.horas, 0));
  const quien = empleadoNombre.trim() || "Alguien de tu equipo";

  let mensaje: string;
  let href: string;

  if (count === 1 || unicoProyecto) {
    mensaje = `${quien} registró ${horasTxt} del ${fechaLegible} en ${proyectoNotif(sample.proy)}.`;
    href = buildAprobacionHref();
  } else {
    mensaje = `${quien} registró ${horasTxt} del ${fechaLegible} en ${proyIds.length} proyectos.`;
    href = "/aprobacion-tiempo-proyectos";
  }

  return [
    {
      tipo: NOTIF_TIPO_TIEMPO_ENVIO,
      titulo: "Horas por aprobar",
      mensaje,
      empleadoId,
      empleadoNombre,
      proyectoId: unicoProyecto ? proyectoId : proyIds[0],
      proyectoCod: unicoProyecto ? proyectoCod : proyCodAprobacion(proyIds[0]),
      fechaIso,
      registrosCount: count,
      href,
    },
  ];
}

const DECISION_META: Record<
  NotificacionDecision,
  { tipo: string; titulo: string }
> = {
  aprobado: {
    tipo: NOTIF_TIPO_TIEMPO_APROBADO,
    titulo: "Horas aprobadas",
  },
  rechazado: {
    tipo: NOTIF_TIPO_TIEMPO_RECHAZADO,
    titulo: "Horas rechazadas",
  },
  anulado: {
    tipo: NOTIF_TIPO_TIEMPO_ANULADO,
    titulo: "Puedes editar tus horas",
  },
};

/**
 * Una notificación por empleado y decisión (batch), no por línea.
 * Evita spam si el gerente resuelve varios registros a la vez.
 */
export function buildNotificacionesTiempoDecision(
  decision: NotificacionDecision,
  hojas: HojaNotificacionInput[],
  comentario?: string,
): Array<{
  tipo: string;
  titulo: string;
  mensaje: string;
  empleadoId: string;
  empleadoNombre: string;
  proyectoId: string;
  proyectoCod: string;
  fechaIso: string;
  registrosCount: number;
  href: string;
}> {
  if (!hojas.length) return [];

  const meta = DECISION_META[decision];
  const byEmpleado = new Map<string, HojaNotificacionInput[]>();

  for (const hoja of hojas) {
    const id = normalizeNotifEmpleadoId(hoja.cedula || SESSION_EMPLEADO.cedula);
    if (!id || id === "—") continue;
    const list = byEmpleado.get(id) ?? [];
    list.push(hoja);
    byEmpleado.set(id, list);
  }

  const payloads: Array<{
    tipo: string;
    titulo: string;
    mensaje: string;
    empleadoId: string;
    empleadoNombre: string;
    proyectoId: string;
    proyectoCod: string;
    fechaIso: string;
    registrosCount: number;
    href: string;
  }> = [];

  for (const [empleadoId, group] of byEmpleado) {
    const sample = group[0];
    const count = group.length;
    const fechas = [...new Set(group.map((h) => h.fecha))];
    const proyCods = [...new Set(group.map((h) => proyectoNotif(h.proy)))];
    const unicoProyecto = proyCods.length === 1;
    const proy = proyectoNotif(sample.proy);
    const fecha = fechas.length === 1 ? fechas[0] : null;
    const horas = sumHorasNotif(group);
    const cuanto = horas > 0 ? `Tus ${horasNotif(horas)}` : "Tus horas";
    const enProy = unicoProyecto
      ? `en ${proy}`
      : `en ${proyCods.length} proyectos`;
    const delFecha = fecha ? ` del ${fecha}` : "";

    let mensaje: string;
    if (decision === "anulado") {
      mensaje = `El gerente devolvió ${cuanto.toLowerCase()}${delFecha} ${enProy}. Ya las puedes editar en Mi Tiempo.`;
    } else if (decision === "rechazado") {
      mensaje = `${cuanto}${delFecha} ${enProy} fueron rechazadas.`;
    } else {
      mensaje = `${cuanto}${delFecha} ${enProy} quedaron aprobadas.`;
    }

    if (decision === "rechazado" && comentario?.trim()) {
      const short =
        comentario.trim().length > 80
          ? `${comentario.trim().slice(0, 77)}…`
          : comentario.trim();
      mensaje += ` · Motivo: ${short}`;
    }

    payloads.push({
      tipo: meta.tipo,
      titulo: meta.titulo,
      mensaje,
      empleadoId,
      empleadoNombre: sample.nombre?.trim() || SESSION_EMPLEADO.nombre,
      proyectoId: sample.proy,
      proyectoCod: sample.proy,
      fechaIso: fechas[0] || "",
      registrosCount: count,
      href: miTiempoHref(),
    });
  }

  return payloads;
}
