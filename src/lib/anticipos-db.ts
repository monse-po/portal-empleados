import type {
  Anticipo as AnticipoRow,
  AnticipoEstadoDb,
  AnticipoTipoDb,
} from "@/src/generated/prisma/client";
import type { Prisma } from "@/src/generated/prisma/client";
import type { AnticipoAprobacion } from "@/src/lib/aprobacion-anticipos-mock";
import {
  getBeneficiarioDetalle,
  type Anticipo,
  type AnticipoEstado,
  type AnticipoExtra,
  type AnticipoTipo,
  type TimelineItem,
} from "@/src/lib/mis-anticipos-mock";

export type LanzarAnticipoInput = {
  tipo: AnticipoTipo;
  proyId: string;
  proyN: string;
  monto: number;
  div: string;
  motivo: string;
  compania: string;
  empCompania: string;
  companyId?: string;
  invCompanyId?: string;
  createdBy?: string;
  beneficiarioEmpNo?: string;
  beneficiarioSupplierId?: string;
  destinoCodigo?: string;
  paraOtro: boolean;
  beneficiarioId?: string;
  beneficiarioNombre?: string;
  beneficiarioCedula?: string;
  beneficiarioCuenta?: string;
  beneficiarioBanco?: string;
  beneficiarioTipoCuenta?: string;
  aprobador?: string;
  fechaIda?: string;
  fechaRegreso?: string;
  destino?: string;
  tipoViaje?: "nacional" | "internacional";
};

export type AnticiposActor = {
  fromIfs: boolean;
  ids: string[];
  nombre: string;
  empNo: string;
  companyId: string;
  personId: string;
  supplierId: string;
  accessToken?: string;
};

export function fechaHoyDMY(fecha = new Date()): string {
  const d = String(fecha.getDate()).padStart(2, "0");
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const y = fecha.getFullYear();
  return `${d}/${m}/${y}`;
}

export function estadoDbToUi(estado: AnticipoEstadoDb): AnticipoEstado {
  switch (estado) {
    case "BORRADOR":
    case "LANZADO":
      return "Lanzado";
    case "APROBADO":
      return "Aprobado";
    case "PAGADO":
      return "Pagado";
    case "RECHAZADO":
      return "Rechazado";
    case "CANCELADO":
      return "Cancelado";
  }
}

export function tipoUiToDb(tipo: AnticipoTipo): AnticipoTipoDb {
  return tipo === "Viaje" ? "VIAJE" : "GASTO";
}

export function tipoDbToUi(tipo: AnticipoTipoDb): AnticipoTipo {
  return tipo === "VIAJE" ? "Viaje" : "Gasto";
}

export function esHistorialDb(estado: AnticipoEstadoDb): boolean {
  return estado === "PAGADO" || estado === "RECHAZADO" || estado === "CANCELADO";
}

function parseTimeline(value: Prisma.JsonValue): TimelineItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TimelineItem => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.accion === "string" && typeof row.usuario === "string";
  });
}

export function rowToAnticipo(row: AnticipoRow): Anticipo {
  return {
    no: row.codigo,
    fecha: row.fechaSolicitud,
    proy: row.proyectoId,
    proyN: row.proyectoNombre,
    tipo: tipoDbToUi(row.tipo),
    monto: row.monto,
    div: row.divisa,
    estado: estadoDbToUi(row.estado),
    disponible: esHistorialDb(row.estado),
    motivo: row.motivo,
    fechaAprob: row.fechaAprob,
    aprobador: row.aprobador,
    pago: row.pago,
    solicitante: row.solicitanteNombre,
    solicitanteId: row.solicitanteId,
    beneficiarioId: row.empleadoId,
    beneficiarioNombre: row.beneficiarioNombre,
    paraOtro: row.paraOtro,
    cedula: row.beneficiarioCedula ?? undefined,
  };
}

export function rowToExtra(row: AnticipoRow): AnticipoExtra {
  return {
    compania: row.compania,
    empCompania: row.empCompania,
    empId: row.empleadoId,
    fechaIda: row.fechaIda ?? undefined,
    fechaRegreso: row.fechaRegreso ?? undefined,
    destino: row.destino ?? undefined,
    tipoViaje:
      row.tipoViaje === "internacional" || row.tipoViaje === "nacional"
        ? row.tipoViaje
        : undefined,
    cuenta: row.cuenta || undefined,
    banco: row.banco || undefined,
    tipoCuenta: row.tipoCuenta || undefined,
    tl: parseTimeline(row.timelineJson),
  };
}

export function rowToAprobacion(row: AnticipoRow): AnticipoAprobacion {
  const anticipo = rowToAnticipo(row);
  const extra = rowToExtra(row);
  const benef = getBeneficiarioDetalle(anticipo, extra);
  const resuelto =
    row.estado === "PAGADO" ||
    row.estado === "APROBADO" ||
    row.estado === "RECHAZADO";
  return {
    no: row.codigo,
    fecha: row.fechaSolicitud,
    compania: row.compania || "HMVINGCO",
    empCompania: row.empCompania || row.compania || "HMVINGCO",
    proy: row.proyectoId,
    proyN: row.proyectoNombre,
    tipo: tipoDbToUi(row.tipo),
    solicitante: row.solicitanteNombre || "—",
    cedula: benef.cedula,
    nombre: benef.nombre,
    cuenta: benef.cuenta,
    banco: benef.banco,
    tipoCuenta: benef.tipoCuenta,
    divisa: row.divisa,
    monto: row.monto,
    motivo: row.motivo,
    esViaje: row.tipo === "VIAJE",
    fechaIda: row.fechaIda ?? undefined,
    fechaReg: row.fechaRegreso ?? undefined,
    destino: row.destino ?? undefined,
    creadoMeta: `${row.fechaSolicitud} · enviado`,
    estadoApro:
      row.estado === "RECHAZADO" ? "Rechazado" : resuelto ? "Aprobado" : "",
    comentarioApro: row.comentarioAprobacion ?? "",
    fechaApro: row.fechaAprob ?? "",
    aprobador: row.aprobadorNombre || row.aprobador || "",
  };
}

export function recordsFromRows(rows: AnticipoRow[]): {
  anticipos: Record<string, Anticipo>;
  extras: Record<string, AnticipoExtra>;
} {
  const anticipos: Record<string, Anticipo> = {};
  const extras: Record<string, AnticipoExtra> = {};
  for (const row of rows) {
    anticipos[row.codigo] = rowToAnticipo(row);
    extras[row.codigo] = rowToExtra(row);
  }
  return { anticipos, extras };
}
