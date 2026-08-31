import type { AnticipoAprobacion } from "@/src/lib/aprobacion-anticipos-registro";
import type {
  Anticipo,
  AnticipoExtra,
  TimelineItem,
} from "@/src/lib/anticipos-registro";
import type { Anticipo as AnticipoRow } from "@/src/generated/prisma/client";
import { toAnticipo, toAnticipoExtra } from "@/src/lib/registro-anticipos-db";

export type SyncAnticipoAccion = "aprobado" | "rechazado";

export type SyncAnticipoHandler = (
  no: string,
  accion: SyncAnticipoAccion,
  comentario?: string,
) => void;

export function aplicarTimelineAprobacion(
  extra: AnticipoExtra,
  accion: SyncAnticipoAccion,
  comentario: string,
  fecha: string,
  aprobador: string,
): AnticipoExtra {
  const filtered = extra.tl.filter((t) => !t.accion.startsWith("Esperando"));
  const item: TimelineItem =
    accion === "aprobado"
      ? {
          accion: "Aprobado",
          usuario: aprobador,
          fecha,
          icon: "check",
          color: "#166534",
        }
      : {
          accion: "Rechazado",
          usuario: aprobador,
          fecha,
          icon: "x",
          color: "#991b1b",
        };
  const tl = [...filtered, item];
  if (comentario.trim()) {
    tl.push({
      accion: comentario.trim(),
      usuario: aprobador,
      fecha,
      icon: "info",
      color: "#374151",
    });
  }
  return { ...extra, tl, aprobadoPor: aprobador };
}

export function anticipoRowToAprobacion(row: AnticipoRow): AnticipoAprobacion {
  const a = toAnticipo(row);
  const ex = toAnticipoExtra(row);
  const estadoApro =
    row.estado === "APROBADO"
      ? "Aprobado"
      : row.estado === "RECHAZADO"
        ? "Rechazado"
        : "";

  return {
    no: a.no,
    fecha: a.fecha,
    compania: ex.compania,
    empCompania: ex.empCompania,
    proy: a.proy,
    proyN: a.proyN,
    tipo: a.tipo,
    solicitante: a.solicitante ?? "—",
    cedula: a.cedula ?? "—",
    nombre: a.beneficiarioNombre ?? "—",
    cuenta: row.cuenta ?? "—",
    banco: row.banco ?? "—",
    tipoCuenta: row.tipoCuenta ?? "—",
    divisa: a.div,
    monto: a.monto,
    motivo: a.motivo,
    esViaje: a.tipo === "Viaje",
    fechaIda: ex.fechaIda,
    fechaReg: ex.fechaRegreso,
    destino: ex.destino,
    creadoMeta: a.fecha,
    estadoApro,
    comentarioApro: row.comentarioAprobacion,
    fechaApro: a.fechaAprob ?? "",
    aprobador: row.aprobadorNombre ?? "",
  };
}

export function anticipoToAprobacion(
  a: Anticipo,
  ex: AnticipoExtra,
  row?: Pick<
    AnticipoRow,
    "cuenta" | "banco" | "tipoCuenta" | "comentarioAprobacion" | "aprobadorNombre"
  >,
): AnticipoAprobacion {
  const estadoApro =
    a.estado === "Aprobado"
      ? "Aprobado"
      : a.estado === "Rechazado"
        ? "Rechazado"
        : "";

  return {
    no: a.no,
    fecha: a.fecha,
    compania: ex.compania,
    empCompania: ex.empCompania,
    proy: a.proy,
    proyN: a.proyN,
    tipo: a.tipo,
    solicitante: a.solicitante ?? "—",
    cedula: a.cedula ?? "—",
    nombre: a.beneficiarioNombre ?? "—",
    cuenta: row?.cuenta ?? "—",
    banco: row?.banco ?? "—",
    tipoCuenta: row?.tipoCuenta ?? "—",
    divisa: a.div,
    monto: a.monto,
    motivo: a.motivo,
    esViaje: a.tipo === "Viaje",
    fechaIda: ex.fechaIda,
    fechaReg: ex.fechaRegreso,
    destino: ex.destino,
    creadoMeta: a.fecha,
    estadoApro,
    comentarioApro: row?.comentarioAprobacion ?? "",
    fechaApro: a.fechaAprob ?? "",
    aprobador: row?.aprobadorNombre ?? "",
  };
}
