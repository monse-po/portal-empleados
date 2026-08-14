import type { EmpReportItemRow, EmpTimeApproval } from "@/src/lib/ifs/types";
import {
  parseEmpReportItems,
  parseIfsProjectTransactionSeq,
} from "@/src/lib/ifs/tiempo-timesheet";
import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";
import { isoToDmy } from "@/src/lib/tiempo-bridge";

/**
 * Eventos EmpPortalTimeApprovalList.
 * Primario = nombre de evento FSM; fallback = valor de estado CEmpProjTimeStatus.
 */
export const IFS_APPROVAL_EVENT = {
  approve: "Confirm",
  approveFallback: "Confirmed",
  reject: "Reject",
  rejectFallback: "Rejected",
} as const;

export type IfsApprovalEvent = string;

function parseHoras(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isoDate(value: string | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

/**
 * GetApprovalTimesheets ya es la bandeja: excluir solo estados terminales.
 * Sin ProjectTransactionSeq no se pueden aprobar → se excluyen.
 */
function esPendienteAprobacion(row: EmpReportItemRow): boolean {
  if (row.ProjectTransactionSeq == null) return false;

  const status = `${row.CStatusDb ?? row.CStatus ?? ""}`
    .trim()
    .toLowerCase();
  if (!status) return true;

  if (
    status.includes("confirm") ||
    status.includes("reject") ||
    status.includes("notapplicable") ||
    status.includes("not applicable")
  ) {
    return false;
  }

  // Registered / Registrado / Pending / vacío ya filtrado arriba
  return true;
}

export function mapApprovalRowToHoja(
  row: EmpReportItemRow,
  index: number,
): HojaAprobacion | null {
  const fechaIso = isoDate(row.AccountDate);
  const proy =
    row.ShortName?.trim() ||
    row.ProjectId?.trim() ||
    row.ProjectName?.trim();
  if (!fechaIso || !proy) return null;

  const horas = parseHoras(row.Hours);
  if (horas <= 0) return null;
  if (!esPendienteAprobacion(row)) return null;

  const seq = row.ProjectTransactionSeq!;
  const registroId = `ifs-pt-${seq}`;
  const no = `IFS-${seq}`;

  const empleado =
    row.EmployeeName?.trim() ||
    row.EmpNo?.trim() ||
    "Empleado";

  return {
    no,
    fecha: isoToDmy(fechaIso),
    compania: row.CompanyId?.trim() || "—",
    proy: row.ProjectName?.trim()
      ? `${proy} · ${row.ProjectName.trim()}`
      : proy,
    subproy:
      row.SubProjectDesc?.trim() ||
      row.SubProjectId?.trim() ||
      "—",
    tipo: row.ReportCostCode?.trim() || "DN",
    solicitante: empleado,
    cedula: row.EmpNo?.trim() || "—",
    nombre: empleado,
    actividad:
      row.ActDescription?.trim() ||
      row.ActivityNo?.trim() ||
      "—",
    horas: `${horas}h`,
    comentarioEmpleado: row.InternalComments?.trim() || "",
    aprobador:
      row.CApproverName?.trim() ||
      row.CAutoApproverName?.trim() ||
      "",
    registroId,
  };
}

export function mapApprovalTimesheetToHojas(raw: unknown): HojaAprobacion[] {
  return parseEmpReportItems(raw)
    .map(mapApprovalRowToHoja)
    .filter((h): h is HojaAprobacion => h !== null);
}

export function buildEmpTimeApproval(
  registroId: string,
  event: IfsApprovalEvent,
  rejectNote?: string,
): EmpTimeApproval | null {
  const seq =
    parseIfsProjectTransactionSeq(registroId) ??
    (/^IFS-(\d+)$/.exec(registroId)?.[1]
      ? Number(/^IFS-(\d+)$/.exec(registroId)![1])
      : null);
  if (seq == null || !Number.isFinite(seq)) return null;
  const isReject =
    event === IFS_APPROVAL_EVENT.reject ||
    event === IFS_APPROVAL_EVENT.rejectFallback;
  return {
    ProjectTransactionSeq: seq,
    Event: event,
    RejectNote: isReject ? rejectNote || "" : undefined,
  };
}

export function approvalEventsForDecision(
  decision: "aprobado" | "rechazado",
): string[] {
  if (decision === "aprobado") {
    return [IFS_APPROVAL_EVENT.approve, IFS_APPROVAL_EVENT.approveFallback];
  }
  return [IFS_APPROVAL_EVENT.reject, IFS_APPROVAL_EVENT.rejectFallback];
}

export function extractEmpTimeApprovalErrors(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const resp = (raw as { EmpTimeApprovalResp?: EmpTimeApproval[] })
    .EmpTimeApprovalResp;
  if (!Array.isArray(resp)) return [];
  return resp
    .map((row) => {
      const msg = row.ErrorMsg?.trim();
      if (msg) return msg;
      const status = row.Status?.trim();
      if (status && /^(error|false|fail)/i.test(status)) {
        return `IFS Status=${status}`;
      }
      return null;
    })
    .filter((m): m is string => !!m);
}

/** IFS: el registro ya no existe / fue confirmado por otro / stale. */
export function isStaleApprovalError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("removed by another user") ||
    m.includes("removido") ||
    m.includes("eliminado por otro") ||
    m.includes("already been removed") ||
    m.includes("no longer exist")
  );
}
