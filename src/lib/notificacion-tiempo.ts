import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";
import type { RegistroMock } from "@/src/lib/tiempo-registro";
import {
  formatProyectoAprobacion,
  formatProyectoAprobacionPorCod,
  hojaNoFromRegistro,
  isoToDmy,
  proyCodAprobacion,
} from "@/src/lib/tiempo-bridge";

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
};

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
    href: row.href ?? "/aprobacion-tiempo",
    createdAt: row.createdAt.toISOString(),
    registrosCount: row.registrosCount,
  };
}

export function normalizeNotifEmpleadoId(cedula: string): string {
  return cedula.replace(/\./g, "").trim();
}

function buildAprobacionHref(proyectoCod: string, hojaNo?: string): string {
  const params = new URLSearchParams({ proy: proyectoCod });
  if (hojaNo) params.set("no", hojaNo);
  return `/aprobacion-tiempo?${params.toString()}`;
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

  let mensaje: string;
  let href: string;

  if (count === 1) {
    const hojaNo = hojaNoFromRegistro(sample);
    const proyLabel = formatProyectoAprobacion(sample.proy);
    mensaje = `${empleadoNombre} envió ${hojaNo} del ${fechaLegible} · ${proyLabel}`;
    href = buildAprobacionHref(proyectoCod, hojaNo);
  } else if (unicoProyecto) {
    const proyLabel = formatProyectoAprobacion(sample.proy);
    mensaje = `${empleadoNombre} envió ${count} registros del ${fechaLegible} · ${proyLabel}`;
    href = buildAprobacionHref(proyectoCod);
  } else {
    mensaje = `${empleadoNombre} envió ${count} registros del ${fechaLegible} · ${proyIds.length} proyectos`;
    href = "/aprobacion-tiempo";
  }

  return [
    {
      tipo: NOTIF_TIPO_TIEMPO_ENVIO,
      titulo: "Horas pendientes de aprobación",
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
  { tipo: string; titulo: string; verb: string; suffix?: string }
> = {
  aprobado: {
    tipo: NOTIF_TIPO_TIEMPO_APROBADO,
    titulo: "Horas aprobadas",
    verb: "aprobado",
  },
  rechazado: {
    tipo: NOTIF_TIPO_TIEMPO_RECHAZADO,
    titulo: "Horas rechazadas",
    verb: "rechazado",
  },
  anulado: {
    tipo: NOTIF_TIPO_TIEMPO_ANULADO,
    titulo: "Aprobación anulada",
    verb: "anulado",
    suffix: " · vuelve a Registrado; puedes editarlo",
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
    const proyCods = [...new Set(group.map((h) => h.proy))];
    const unicoProyecto = proyCods.length === 1;
    const proyLabel = formatProyectoAprobacionPorCod(sample.proy);
    const fechaLabel =
      fechas.length === 1 ? fechas[0] : `${fechas.length} fechas`;

    const verbPlural =
      meta.verb === "anulado"
        ? "anulados"
        : meta.verb === "rechazado"
          ? "rechazados"
          : "aprobados";

    let mensaje: string;
    if (count === 1) {
      mensaje = `${sample.no} del ${sample.fecha} · ${proyLabel} fue ${meta.verb}`;
    } else if (unicoProyecto) {
      mensaje = `${count} registros del ${fechaLabel} · ${proyLabel} fueron ${verbPlural}`;
    } else {
      mensaje = `${count} registros (${proyCods.length} proyectos) fueron ${verbPlural}`;
    }

    if (meta.suffix) mensaje += meta.suffix;

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
      empleadoNombre: sample.nombre || SESSION_EMPLEADO.nombre,
      proyectoId: sample.proy,
      proyectoCod: sample.proy,
      fechaIso: fechas[0] || "",
      registrosCount: count,
      href: miTiempoHref(),
    });
  }

  return payloads;
}
