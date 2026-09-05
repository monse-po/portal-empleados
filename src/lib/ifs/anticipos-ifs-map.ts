import type { AnticipoAprobacion } from "@/src/lib/aprobacion-anticipos-mock";
import type {
  CEmpAdvanceQuery,
  CEmpAdvancesInsert,
  CRequestType,
} from "@/src/lib/ifs/cemp-advance";
import type { LanzarAnticipoInput } from "@/src/lib/anticipos-db";
import { getAdvanceCityByDestination } from "@/src/lib/ifs/cemp-advance";
import {
  destinoConsultaLabel,
  looksLikeDestinationCode,
} from "@/src/lib/anticipos-ifs-catalog";
import type {
  Anticipo,
  AnticipoEstado,
  AnticipoExtra,
} from "@/src/lib/mis-anticipos-mock";

function isoToDmy(iso?: string | null): string {
  if (!iso) return "";
  const day = iso.slice(0, 10);
  const [y, m, d] = day.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function dmyToIso(dmy?: string): string | undefined {
  if (!dmy) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(dmy)) return dmy.slice(0, 10);
  const [d, m, y] = dmy.split("/");
  if (!d || !m || !y) return undefined;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function companyIdFrom(value: string | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  // Preferir código puro (HMVINGCO) o prefijo antes de "–" / "-"
  if (/^[A-Za-z0-9_]{2,20}$/.test(raw)) return raw;
  const byDash = raw.split(/\s*[–-]\s*/)[0]?.trim() || "";
  if (/^[A-Za-z0-9_]{2,20}$/.test(byDash)) return byDash;
  return byDash.slice(0, 20);
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function requestTypeFromUi(
  tipo: LanzarAnticipoInput["tipo"],
): CRequestType {
  return tipo === "Viaje" ? "Travel" : "Expenses";
}

export function toCEmpAdvancesInsert(
  input: LanzarAnticipoInput,
  actor: {
    personId: string;
    empNo: string;
    supplierId: string;
    companyId: string;
  },
): CEmpAdvancesInsert {
  const company = clip(
    input.companyId || companyIdFrom(input.compania) || actor.companyId,
    20,
  );
  const empNo = clip(
    input.beneficiarioEmpNo ||
      (!input.paraOtro ? actor.empNo : "") ||
      input.beneficiarioId ||
      actor.empNo,
    10,
  );
  const supplierId = clip(
    input.beneficiarioSupplierId || actor.supplierId || empNo,
    20,
  );
  const createdBy = clip(input.createdBy || actor.personId || actor.empNo, 20);
  const destination = input.destinoCodigo?.trim();
  const payload: CEmpAdvancesInsert = {
    Description: clip(input.motivo, 100),
    RequestType: requestTypeFromUi(input.tipo),
    CreatedBy: createdBy,
    ProjectId: clip(input.proyId, 10),
    EmpNo: empNo,
    Company: company,
    InvCompany: clip(input.invCompanyId || company, 20),
    SupplierId: supplierId,
    CurrencyCode: clip(input.div, 3),
    Amount: input.monto,
  };
  if (input.tipo === "Viaje") {
    const ida = dmyToIso(input.fechaIda);
    const regreso = dmyToIso(input.fechaRegreso);
    if (ida) payload.DepartureDate = ida;
    if (regreso) payload.ReturnDate = regreso;
    if (
      destination &&
      destination.length <= 20 &&
      !destination.includes(",")
    ) {
      payload.Destination = destination;
    }
  }
  if (input.aprobador) payload.ProjectManager = input.aprobador;
  return payload;
}

function isPaid(row: CEmpAdvanceQuery): boolean {
  const blob = `${row.PaymentStatus || ""} ${row.InvObjstate || ""} ${row.InvState || ""}`.toUpperCase();
  return blob.includes("PAID") || blob.includes("PAGAD");
}

export function ifsStateToUi(row: CEmpAdvanceQuery): AnticipoEstado {
  if (isPaid(row)) return "Pagado";
  const raw = `${row.Objstate || ""} ${row.State || ""}`.toLowerCase();
  if (raw.includes("reject") || raw.includes("rechaz")) return "Rechazado";
  if (raw.includes("cancel")) return "Cancelado";
  if (raw.includes("approv") || raw.includes("aprob")) return "Aprobado";
  return "Lanzado";
}

export function queryToAnticipo(row: CEmpAdvanceQuery): Anticipo {
  const estado = ifsStateToUi(row);
  const no = row.RequestNo || "";
  return {
    no,
    fecha: isoToDmy(row.RequestDate) || "",
    proy: row.ProjectId || "",
    proyN: row.ProjectId || "",
    tipo: row.RequestType === "Travel" || row.RequestType === "Viaje" ? "Viaje" : "Gasto",
    monto: row.Amount ?? 0,
    div: row.CurrencyCode || "",
    estado,
    disponible:
      estado === "Pagado" || estado === "Rechazado" || estado === "Cancelado",
    motivo: row.Description || "",
    fechaAprob: isoToDmy(row.ApprovedDate) || null,
    aprobador: row.ApproverId || row.ApproverName || null,
    pago: estado === "Pagado" ? "Pagado" : estado === "Lanzado" || estado === "Aprobado" ? "Pendiente" : "—",
    solicitante: row.RequesterName || row.CreatorName || row.RequestedBy,
    solicitanteId: row.RequestedBy || row.CreatedBy,
    beneficiarioId: row.EmpNo,
    beneficiarioNombre: row.EmployeeName,
    paraOtro: Boolean(
      row.RequestedBy &&
        row.EmpNo &&
        row.RequestedBy.replace(/\D/g, "") !== row.EmpNo.replace(/\D/g, ""),
    ),
    cedula: row.EmpNo,
  };
}

export function queryToExtra(row: CEmpAdvanceQuery): AnticipoExtra {
  return {
    compania: row.CompanyName || row.Company || "",
    empCompania: row.InvCompany || row.Company || "",
    empId: row.EmpNo || "",
    fechaIda: isoToDmy(row.DepartureDate) || undefined,
    fechaRegreso: isoToDmy(row.ReturnDate) || undefined,
    destino: row.Destination || undefined,
    ifsRef: row.NcfReference || row.InvoiceNo || undefined,
    tl: [],
  };
}

export function queryToAprobacion(row: CEmpAdvanceQuery): AnticipoAprobacion {
  const a = queryToAnticipo(row);
  const extra = queryToExtra(row);
  const resuelto =
    a.estado === "Aprobado" ||
    a.estado === "Pagado" ||
    a.estado === "Rechazado";
  return {
    no: a.no,
    fecha: a.fecha,
    compania: extra.compania || "HMVINGCO",
    empCompania: extra.empCompania,
    proy: a.proy,
    proyN: a.proyN,
    tipo: a.tipo,
    solicitante: a.solicitante || "—",
    cedula: a.cedula || a.beneficiarioId || "",
    nombre: a.beneficiarioNombre || "—",
    cuenta: "—",
    banco: "—",
    tipoCuenta: "—",
    divisa: a.div,
    monto: a.monto,
    motivo: a.motivo,
    esViaje: a.tipo === "Viaje",
    fechaIda: extra.fechaIda,
    fechaReg: extra.fechaRegreso,
    destino: extra.destino,
    creadoMeta: `${a.fecha} · enviado`,
    estadoApro:
      a.estado === "Rechazado"
        ? "Rechazado"
        : resuelto
          ? "Aprobado"
          : "",
    comentarioApro: row.ApproverComment || "",
    fechaApro: a.fechaAprob || "",
    aprobador: a.aprobador || "",
  };
}

export function recordsFromQueries(rows: CEmpAdvanceQuery[]): {
  anticipos: Record<string, Anticipo>;
  extras: Record<string, AnticipoExtra>;
} {
  const anticipos: Record<string, Anticipo> = {};
  const extras: Record<string, AnticipoExtra> = {};
  for (const row of rows) {
    const a = queryToAnticipo(row);
    if (!a.no) continue;
    anticipos[a.no] = a;
    extras[a.no] = queryToExtra(row);
  }
  return { anticipos, extras };
}

/** Cambia Destination código (CL-58-…) por país, estado, ciudad. */
export async function applyDestinoNombres<T extends { destino?: string }>(
  items: T[],
  accessToken: string,
): Promise<T[]> {
  const codes = [
    ...new Set(
      items
        .map((item) => item.destino?.trim() || "")
        .filter((dest) => looksLikeDestinationCode(dest)),
    ),
  ];
  if (!codes.length) return items;
  const labels = new Map<string, string>();
  await Promise.all(
    codes.map(async (code) => {
      const row = await getAdvanceCityByDestination(accessToken, code);
      const label = row ? destinoConsultaLabel(row) : "";
      if (label) labels.set(code, label);
    }),
  );
  return items.map((item) => {
    const code = item.destino?.trim() || "";
    const label = labels.get(code);
    return label ? { ...item, destino: label } : item;
  });
}
