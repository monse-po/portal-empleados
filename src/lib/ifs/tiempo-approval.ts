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
  opts?: { includeResolved?: boolean },
): HojaAprobacion | null {
  const fechaIso = isoDate(row.AccountDate);
  const proy =
    row.ProjectId?.trim() ||
    row.ShortName?.trim() ||
    row.ProjectName?.trim();
  if (!fechaIso || !proy) return null;

  const horas = parseHoras(row.Hours);
  if (horas <= 0) return null;

  const pendiente = esPendienteAprobacion(row);
  if (!pendiente && !opts?.includeResolved) return null;
  if (row.ProjectTransactionSeq == null) return null;

  const bucket = classifyApprovalHours(row);
  if (!pendiente && bucket !== "aprobadas" && bucket !== "rechazadas") {
    return null;
  }

  const seq = row.ProjectTransactionSeq;
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
    horas: String(horas),
    comentarioEmpleado: row.InternalComments?.trim() || "",
    aprobador:
      row.CApproverName?.trim() ||
      row.CAutoApproverName?.trim() ||
      "",
    registroId,
    estadoApro: pendiente
      ? ""
      : bucket === "aprobadas"
        ? "Aprobado"
        : "Rechazado",
    comentarioApro: row.CRejectNote?.trim() || "",
    fechaApro: pendiente ? "" : isoToDmy(fechaIso),
  };
}

export function mapApprovalTimesheetToHojas(raw: unknown): HojaAprobacion[] {
  return parseEmpReportItems(raw)
    .map((row, index) => mapApprovalRowToHoja(row, index))
    .filter((h): h is HojaAprobacion => h !== null);
}

export type HorasProyectoAprobacion = {
  codigo: string;
  nombre: string;
  horasAcumuladas: number;
  horasAprobadas: number;
  horasRechazadas: number;
  horasPendientes: number;
  registros: number;
  empleados: number;
  /** Ids IFS (`ifs-pt-*`) pendientes de este proyecto, para aprobar/rechazar en lote. */
  pendienteIds: string[];
};

function classifyApprovalHours(
  row: EmpReportItemRow,
): "aprobadas" | "rechazadas" | "pendientes" {
  const status = `${row.CStatusDb ?? row.CStatus ?? ""}`
    .trim()
    .toLowerCase();
  if (status.includes("reject")) return "rechazadas";
  if (status.includes("confirm")) return "aprobadas";
  return "pendientes";
}

function codigoProyectoDeFila(row: EmpReportItemRow): string | null {
  const id = row.ProjectId?.trim();
  if (id) return id;
  const short = row.ShortName?.trim();
  if (!short) return null;
  return short.split(".")[0]?.trim() || short;
}

/**
 * Resumen por código de proyecto (ProjectId).
 * Solo este agrupado en el primer render: sin empleados.
 */
type ProyectoAgg = HorasProyectoAprobacion & { empSet: Set<string> };

export function mapApprovalTimesheetToProyectos(
  raw: unknown,
): HorasProyectoAprobacion[] {
  const map = new Map<string, ProyectoAgg>();

  for (const row of parseEmpReportItems(raw)) {
    const codigo = codigoProyectoDeFila(row);
    if (!codigo) continue;
    const horas = parseHoras(row.Hours);
    if (horas <= 0) continue;

    const bucket = classifyApprovalHours(row);
    const cur = map.get(codigo) ?? {
      codigo,
      nombre: row.ProjectName?.trim() || codigo,
      horasAcumuladas: 0,
      horasAprobadas: 0,
      horasRechazadas: 0,
      horasPendientes: 0,
      registros: 0,
      empleados: 0,
      pendienteIds: [],
      empSet: new Set<string>(),
    };
    if (row.ProjectName?.trim() && (cur.nombre === cur.codigo || !cur.nombre)) {
      cur.nombre = row.ProjectName.trim();
    }
    cur.horasAcumuladas += horas;
    cur.registros += 1;
    const empKey = row.EmpNo?.trim() || row.EmployeeName?.trim();
    if (empKey) cur.empSet.add(empKey);
    if (bucket === "aprobadas") cur.horasAprobadas += horas;
    else if (bucket === "rechazadas") cur.horasRechazadas += horas;
    else if (esPendienteAprobacion(row)) {
      cur.horasPendientes += horas;
      cur.pendienteIds.push(`ifs-pt-${row.ProjectTransactionSeq}`);
    }
    map.set(codigo, cur);
  }

  return [...map.values()]
    .map(({ empSet, ...proy }) => ({
      ...proy,
      empleados: empSet.size,
    }))
    .sort((a, b) => {
      const byPendiente =
        Number(b.pendienteIds.length > 0) - Number(a.pendienteIds.length > 0);
      if (byPendiente !== 0) return byPendiente;
      return a.codigo.localeCompare(b.codigo, "es");
    });
}

export type HorasEmpleadoAprobacion = {
  empNo: string;
  nombre: string;
  actividad: string;
  horasAcumuladas: number;
  horasPendientes: number;
  horasAprobadas: number;
  horasRechazadas: number;
  pendienteIds: string[];
};

export function empleadoActividadKey(e: HorasEmpleadoAprobacion): string {
  return `${e.empNo}::${e.actividad}`;
}

/**
 * Empleados de UN proyecto, una fila por actividad (horas acumuladas).
 * Se llama al expandir el proyecto; no hay tercer nivel de registros.
 */
export function mapApprovalTimesheetToEmpleados(
  raw: unknown,
  codigoProyecto: string,
): HorasEmpleadoAprobacion[] {
  const wanted = codigoProyecto.trim().toLowerCase();
  if (!wanted) return [];
  const map = new Map<string, HorasEmpleadoAprobacion>();

  for (const row of parseEmpReportItems(raw)) {
    const codigo = codigoProyectoDeFila(row);
    if (!codigo || codigo.toLowerCase() !== wanted) continue;
    const horas = parseHoras(row.Hours);
    if (horas <= 0) continue;

    const empNo = row.EmpNo?.trim() || "";
    const nombre = row.EmployeeName?.trim() || empNo || "Empleado";
    const actividad =
      row.ActDescription?.trim() ||
      row.ActivityNo?.trim() ||
      "Sin actividad";
    const key = `${empNo || nombre.toLowerCase()}::${actividad}`;
    const cur = map.get(key) ?? {
      empNo: empNo || nombre,
      nombre,
      actividad,
      horasAcumuladas: 0,
      horasPendientes: 0,
      horasAprobadas: 0,
      horasRechazadas: 0,
      pendienteIds: [],
    };
    if (row.EmployeeName?.trim() && (cur.nombre === cur.empNo || !cur.nombre)) {
      cur.nombre = row.EmployeeName.trim();
    }
    cur.horasAcumuladas += horas;
    const bucket = classifyApprovalHours(row);
    if (bucket === "aprobadas") {
      cur.horasAprobadas += horas;
    } else if (bucket === "rechazadas") {
      cur.horasRechazadas += horas;
    } else if (esPendienteAprobacion(row)) {
      cur.horasPendientes += horas;
      cur.pendienteIds.push(`ifs-pt-${row.ProjectTransactionSeq}`);
    }
    map.set(key, cur);
  }

  return [...map.values()].sort((a, b) => {
    const byPendiente =
      Number(b.pendienteIds.length > 0) - Number(a.pendienteIds.length > 0);
    if (byPendiente !== 0) return byPendiente;
    const byNombre = a.nombre.localeCompare(b.nombre, "es");
    if (byNombre !== 0) return byNombre;
    if (b.horasAcumuladas !== a.horasAcumuladas) {
      return b.horasAcumuladas - a.horasAcumuladas;
    }
    return a.actividad.localeCompare(b.actividad, "es");
  });
}

/** Todas las líneas de UN proyecto (pendientes y resueltas). */
export function mapApprovalTimesheetToHojasByProyecto(
  raw: unknown,
  codigoProyecto: string,
): HojaAprobacion[] {
  const wanted = codigoProyecto.trim().toLowerCase();
  if (!wanted) return [];

  return parseEmpReportItems(raw)
    .filter((row) => {
      const codigo = codigoProyectoDeFila(row);
      return Boolean(codigo && codigo.toLowerCase() === wanted);
    })
    .map((row, index) => mapApprovalRowToHoja(row, index, { includeResolved: true }))
    .filter((h): h is HojaAprobacion => h !== null);
}

/** Líneas de un empleado en un proyecto (pendientes y ya decididas). */
export function mapApprovalTimesheetToHojasScoped(
  raw: unknown,
  opts: { codigoProyecto: string; empNo: string },
): HojaAprobacion[] {
  const wantedProy = opts.codigoProyecto.trim().toLowerCase();
  const wantedEmp = opts.empNo.trim().toLowerCase();
  if (!wantedProy || !wantedEmp) return [];

  return parseEmpReportItems(raw)
    .filter((row) => {
      const codigo = codigoProyectoDeFila(row);
      const emp = (row.EmpNo?.trim() || "").toLowerCase();
      return Boolean(codigo && codigo.toLowerCase() === wantedProy && emp === wantedEmp);
    })
    .map((row, index) => mapApprovalRowToHoja(row, index, { includeResolved: true }))
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
