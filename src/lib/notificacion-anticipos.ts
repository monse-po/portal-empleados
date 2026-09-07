import { normalizeNotifEmpleadoId } from "@/src/lib/notificacion-tiempo";

export const NOTIF_TIPO_ANTICIPO_APROBADO = "ANTICIPO_APROBADO" as const;
export const NOTIF_TIPO_ANTICIPO_RECHAZADO = "ANTICIPO_RECHAZADO" as const;

export type AnticipoNotificacionDecision = "aprobado" | "rechazado";

export type AnticipoNotificacionInput = {
  no: string;
  fecha: string;
  cedula: string;
  nombre: string;
  proy: string;
};

function misAnticiposHref(): string {
  return "/mis-anticipos";
}

/**
 * Una notificación por empleado y decisión (lote), no por solicitud.
 */
export function buildNotificacionesAnticipoDecision(
  decision: AnticipoNotificacionDecision,
  solicitudes: AnticipoNotificacionInput[],
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
  if (!solicitudes.length) return [];

  const aprobado = decision === "aprobado";
  const tipo = aprobado
    ? NOTIF_TIPO_ANTICIPO_APROBADO
    : NOTIF_TIPO_ANTICIPO_RECHAZADO;
  const titulo = aprobado ? "Anticipo aprobado" : "Anticipo rechazado";
  const verb = aprobado ? "aprobado" : "rechazado";
  const verbPlural = aprobado ? "aprobados" : "rechazados";

  const byEmpleado = new Map<string, AnticipoNotificacionInput[]>();
  for (const s of solicitudes) {
    const id = normalizeNotifEmpleadoId(s.cedula || s.nombre);
    if (!id) continue;
    const list = byEmpleado.get(id) ?? [];
    list.push(s);
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
    const proyLabel = sample.proy || "proyecto";

    let mensaje: string;
    if (count === 1) {
      mensaje = `${sample.no} · ${proyLabel} fue ${verb}`;
    } else {
      mensaje = `${count} anticipos fueron ${verbPlural}`;
    }

    if (!aprobado && comentario?.trim()) {
      const short =
        comentario.trim().length > 80
          ? `${comentario.trim().slice(0, 77)}…`
          : comentario.trim();
      mensaje += ` · Motivo: ${short}`;
    }

    payloads.push({
      tipo,
      titulo,
      mensaje,
      empleadoId,
      empleadoNombre: sample.nombre || "Empleado",
      proyectoId: sample.proy,
      proyectoCod: sample.proy,
      fechaIso: sample.fecha,
      registrosCount: count,
      href: misAnticiposHref(),
    });
  }

  return payloads;
}
