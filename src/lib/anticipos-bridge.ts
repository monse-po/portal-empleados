import type { AnticipoAprobacion } from "@/src/lib/aprobacion-anticipos-mock";
import { GERENTE_APROBADOR } from "@/src/lib/aprobacion-anticipos-mock";
import {
  getBeneficiarioDetalle,
  hoyDMY,
  type Anticipo,
  type AnticipoEstado,
  type AnticipoExtra,
  type TimelineItem,
} from "@/src/lib/mis-anticipos-mock";

export type SyncAnticipoAccion = "aprobado" | "rechazado";

export type SyncAnticipoHandler = (
  no: string,
  accion: SyncAnticipoAccion,
  comentario?: string,
) => void;

export type IngresarAnticipoHandler = (solicitud: AnticipoAprobacion) => void;

export type RetirarAnticipoHandler = (no: string) => void;

/**
 * Mapea decisión del gerente al estado visible en Mis Anticipos.
 * Aprobar en demo = Pagado (Tesorería mock automática) + Historial.
 */
export function estadoEmpleadoDesdeAccion(
  accion: SyncAnticipoAccion,
): Extract<AnticipoEstado, "Pagado" | "Rechazado"> {
  return accion === "aprobado" ? "Pagado" : "Rechazado";
}

/** Convierte anticipo empleado → fila de cola de aprobación */
export function anticipoToAprobacion(
  a: Anticipo,
  extra?: AnticipoExtra,
): AnticipoAprobacion {
  const benef = getBeneficiarioDetalle(a, extra);
  return {
    no: a.no,
    fecha: a.fecha,
    compania: extra?.compania || "HMVINGCO",
    empCompania: extra?.empCompania || extra?.compania || "HMVINGCO",
    proy: a.proy,
    proyN: a.proyN,
    tipo: a.tipo,
    solicitante: a.solicitante || "—",
    cedula: benef.cedula,
    nombre: benef.nombre,
    cuenta: benef.cuenta,
    banco: benef.banco,
    tipoCuenta: benef.tipoCuenta,
    divisa: a.div,
    monto: a.monto,
    motivo: a.motivo,
    esViaje: a.tipo === "Viaje",
    fechaIda: extra?.fechaIda,
    fechaReg: extra?.fechaRegreso,
    destino: extra?.destino,
    creadoMeta: `${a.fecha} · enviado`,
    estadoApro: "",
    comentarioApro: "",
    fechaApro: "",
    aprobador: "",
  };
}

export function aplicarTimelineAprobacion(
  extra: AnticipoExtra,
  accion: SyncAnticipoAccion,
  comentario: string,
  fecha = hoyDMY(),
  aprobadorNombre = GERENTE_APROBADOR,
): AnticipoExtra {
  const tlBase = extra.tl.filter((t) => !t.accion.startsWith("Esperando"));
  const entries: TimelineItem[] =
    accion === "aprobado"
      ? [
          {
            accion: comentario.trim()
              ? `Aprobada — ${comentario.trim()}`
              : "Aprobada",
            usuario: aprobadorNombre,
            fecha,
            icon: "check",
            color: "#15803d",
          },
          {
            accion: "Pago procesado por Tesorería",
            usuario: "Sistema (IFS)",
            fecha,
            icon: "info",
            color: "#7c3aed",
          },
        ]
      : [
          {
            accion: `Rechazada — ${comentario.trim() || "Sin motivo"}`,
            usuario: aprobadorNombre,
            fecha,
            icon: "x",
            color: "#b91c1c",
          },
        ];

  return {
    ...extra,
    aprobadoPor:
      accion === "aprobado" ? `${aprobadorNombre} (Gerente)` : extra.aprobadoPor,
    tl: [...tlBase, ...entries],
  };
}
