import type { EmpReportItemRow } from "@/src/lib/ifs/types";
import { parseIfsProjectTransactionSeq } from "@/src/lib/ifs/tiempo-timesheet";
import {
  horasNum,
  proyKey,
  proyNombre,
  splitSubproy,
  type HojaAprobacion,
} from "@/src/lib/aprobacion-tiempo-mock";

/**
 * Seed demo para UI local sin IFS.
 * Seq ≥ 900000 → ids `ifs-pt-9xxxxx` (resolver los trata como demo en development).
 */
const DEMO_SEQ_BASE = 900_000;

function dmyToIso(fecha: string): string {
  const [d, m, y] = fecha.split("/");
  if (!d || !m || !y) return "2026-04-01";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function empNoFromCedula(cedula: string, fallback: string): string {
  const digits = cedula.replace(/\D/g, "");
  return digits || fallback;
}

function hojaToReportRow(h: HojaAprobacion, index: number): EmpReportItemRow {
  const seq = DEMO_SEQ_BASE + index + 1;
  const proyCode = proyKey(h.proy) || `PRY-DEMO-${index}`;
  const proyName = proyNombre(h.proy) || proyCode;
  const sub = splitSubproy(h.subproy);
  const empNo = empNoFromCedula(h.cedula, `E${index + 1}`);
  const status =
    h.estadoApro === "Aprobado"
      ? "Confirmed"
      : h.estadoApro === "Rechazado"
        ? "Rejected"
        : "Registered";

  return {
    ProjectTransactionSeq: seq,
    AccountDate: dmyToIso(h.fecha),
    CompanyId: h.compania || "HMVINGCO",
    ProjectId: proyCode,
    ProjectName: proyName,
    ShortName: proyCode,
    EmpNo: empNo,
    EmployeeName: h.nombre || h.solicitante,
    SubProjectId: sub.code,
    SubProjectDesc: sub.name || sub.code,
    ActivityNo: h.actividad,
    ActDescription: h.actividad,
    ReportCostCode: h.tipo || "DN",
    Hours: horasNum(h.horas),
    InternalComments: h.comentarioEmpleado || "",
    CStatusDb: status,
    CStatus: status,
    CRejectNote: h.comentarioApro || "",
    CApproverName: h.aprobador || "",
  };
}

let demoRaw: { value: EmpReportItemRow[] } | null = null;
const DEMO_SEED_REV = 2;
let loadedSeedRev = 0;

export function isDemoApprovalRegistroId(id: string): boolean {
  const seq = parseIfsProjectTransactionSeq(id);
  return seq != null && seq >= DEMO_SEQ_BASE;
}

export function resetDemoApprovalRaw(hojas: Record<string, HojaAprobacion>): {
  value: EmpReportItemRow[];
} {
  const rows = Object.values(hojas).map((h, i) => hojaToReportRow(h, i));
  demoRaw = { value: rows };
  return demoRaw;
}

export function getDemoApprovalRaw(
  hojas: Record<string, HojaAprobacion>,
): { value: EmpReportItemRow[] } {
  // En cada carga fría del módulo (restart) se regenera; si ya hay cache, se reusa
  // para preservar aprobar/rechazar locales durante la sesión.
  if (!demoRaw || loadedSeedRev !== DEMO_SEED_REV) {
    loadedSeedRev = DEMO_SEED_REV;
    return resetDemoApprovalRaw(hojas);
  }
  if (demoRaw.value.length < Object.keys(hojas).length) {
    return resetDemoApprovalRaw(hojas);
  }
  return demoRaw;
}

/** Actualiza el payload demo tras aprobar/rechazar (para que el reload no restaure pendientes). */
export function applyDemoApprovalDecision(
  registroIds: string[],
  decision: "aprobado" | "rechazado",
  comentario = "",
): void {
  if (!demoRaw) return;
  const wanted = new Set(
    registroIds
      .map((id) => parseIfsProjectTransactionSeq(id))
      .filter((n): n is number => n != null),
  );
  for (const row of demoRaw.value) {
    const seq = row.ProjectTransactionSeq;
    if (seq == null || !wanted.has(seq)) continue;
    row.CStatusDb = decision === "aprobado" ? "Confirmed" : "Rejected";
    row.CStatus = row.CStatusDb;
    if (decision === "rechazado") {
      row.CRejectNote = comentario;
    }
  }
}
