import { LOADING_COPY } from "@/src/lib/copy/loading";
import type { EmpReportItemRow } from "@/src/lib/ifs/types";
import type { RegistroEstado, RegistroMock } from "@/src/lib/tiempo-registro";

export function isIfsRegistroId(id: string): boolean {
  return id.startsWith("ifs-pt-");
}

export function parseEmpReportItems(raw: unknown): EmpReportItemRow[] {
  if (Array.isArray(raw)) return raw as EmpReportItemRow[];
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.value)) return obj.value as EmpReportItemRow[];
  for (const key of [
    "EmpReportItemStructure",
    "EmpReportItem",
    "ReportItem",
  ]) {
    const nested = obj[key];
    if (Array.isArray(nested)) return nested as EmpReportItemRow[];
  }
  return [];
}

function isoDate(value: string | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function parseHoras(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function readIfsText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of ["value", "Value", "Name", "name", "@odata.id"]) {
      const nested = obj[key];
      if (typeof nested === "string") return nested;
      if (typeof nested === "number") return String(nested);
    }
  }
  return "";
}

/** CEmpProjTimeStatus: Registered, Confirmed, NotApplicable, Rejected */
function mapIfsEstado(row: EmpReportItemRow): RegistroEstado {
  const statusDb = readIfsText(row.CStatusDb).trim().toLowerCase();
  const statusRaw = readIfsText(row.CStatus).trim();
  const status = statusRaw.toLowerCase();
  const combined = `${statusDb} ${status}`.trim();

  if (
    combined.includes("reject") ||
    status === "3" ||
    statusRaw === "Rejected"
  ) {
    return "Rechazado";
  }
  if (
    status === "confirmed" ||
    statusDb === "confirmed" ||
    status === "1" ||
    statusRaw === "Confirmed" ||
    combined.includes("confirm") ||
    combined.includes("aprob") ||
    combined.includes("closed") ||
    combined.includes("posted")
  ) {
    return "Aprobado";
  }
  if (
    status === "registered" ||
    statusDb === "registered" ||
    status === "0" ||
    statusRaw === "Registered" ||
    combined.includes("register") ||
    combined.includes("pending")
  ) {
    return "Registrado";
  }
  if (
    (row.CApproverName?.trim() || row.CAutoApproverName?.trim()) &&
    !combined.includes("reject")
  ) {
    return "Aprobado";
  }
  return "Borrador";
}

function registroIdFromRow(row: EmpReportItemRow, index: number): string {
  if (row.ProjectTransactionSeq != null) {
    return `ifs-pt-${row.ProjectTransactionSeq}`;
  }
  if (row.Objid?.trim()) return `ifs-obj-${row.Objid.trim()}`;
  const fecha = isoDate(row.AccountDate) ?? "unknown";
  return `ifs-row-${fecha}-${index}`;
}

export function mapEmpReportItemToRegistro(
  row: EmpReportItemRow,
  index: number,
): RegistroMock | null {
  const fecha = isoDate(row.AccountDate);
  const proy =
    row.ShortName?.trim() ||
    row.ProjectId?.trim() ||
    (row.ProjectTransactionSeq != null
      ? `SEQ-${row.ProjectTransactionSeq}`
      : null);
  if (!fecha || !proy) return null;

  const horas = parseHoras(row.Hours);
  if (horas <= 0) return null;

  const aprobador =
    row.CApproverName?.trim() ||
    row.CAutoApproverName?.trim() ||
    row.CApprover?.trim() ||
    undefined;

  return {
    id: registroIdFromRow(row, index),
    codigo:
      row.ProjectTransactionSeq != null
        ? `IFS-${row.ProjectTransactionSeq}`
        : undefined,
    proy,
    subproy: row.SubProjectId?.trim() || row.SubProjectDesc?.trim() || undefined,
    act: row.ActDescription?.trim() || row.ActivityNo?.trim() || "—",
    tipo: row.ReportCostCode?.trim() || "DN",
    horas,
    fecha,
    comentario: row.InternalComments?.trim() ?? "",
    comentarioRechazo: row.CRejectNote?.trim() || undefined,
    aprobador,
    estado: mapIfsEstado(row),
  };
}

export function mapEmployeeTimesheetToRegistros(
  raw: unknown,
): RegistroMock[] {
  return parseEmpReportItems(raw)
    .map(mapEmpReportItemToRegistro)
    .filter((row): row is RegistroMock => row !== null);
}

type ReportItemExpanded = EmpReportItemRow & {
  Col2?: string;
  ProjectTransactionRef?:
    | Partial<EmpReportItemRow>
    | { value?: Partial<EmpReportItemRow>[] };
  ActivityRef?:
    | (Partial<EmpReportItemRow> & { Description?: string })
    | { value?: (Partial<EmpReportItemRow> & { Description?: string })[] };
  ReportCostRef?:
    | { ReportCostCode?: string }
    | { value?: { ReportCostCode?: string }[] };
};

function pickExpanded<T>(ref: T | { value?: T[] } | undefined): T | undefined {
  if (!ref) return undefined;
  if (typeof ref === "object" && "value" in ref && Array.isArray(ref.value)) {
    return ref.value[0];
  }
  return ref as T;
}

export function flattenReportItemRow(item: ReportItemExpanded): EmpReportItemRow {
  const pt = pickExpanded(item.ProjectTransactionRef);
  const act = pickExpanded(item.ActivityRef);
  const cost = pickExpanded(item.ReportCostRef);

  return {
    CompanyId: item.CompanyId ?? pt?.CompanyId,
    EmpNo: item.EmpNo,
    ProjectTransactionSeq:
      item.ProjectTransactionSeq ?? pt?.ProjectTransactionSeq,
    ActivitySeq: item.ActivitySeq ?? act?.ActivitySeq,
    AccountDate: item.AccountDate,
    Module: item.Module,
    Hours: item.Hours ?? pt?.Hours,
    InternalComments: pt?.InternalComments ?? item.InternalComments,
    CStatus: pt?.CStatus ?? item.CStatus,
    CStatusDb: pt?.CStatusDb ?? item.CStatusDb,
    CRejectNote: pt?.CRejectNote ?? item.CRejectNote,
    CApprover: pt?.CApprover ?? item.CApprover,
    CApproverName: pt?.CApproverName ?? item.CApproverName,
    CAutoApproverName: pt?.CAutoApproverName ?? item.CAutoApproverName,
    ProjectId: pt?.ProjectId ?? act?.ProjectId ?? item.ProjectId,
    SubProjectId: pt?.SubProjectId ?? act?.SubProjectId ?? item.SubProjectId,
    SubProjectDesc: pt?.SubProjectDesc ?? act?.SubProjectDesc ?? item.SubProjectDesc,
    ActivityNo: act?.ActivityNo ?? item.ActivityNo,
    ActDescription:
      act?.ActDescription ?? act?.Description ?? item.ActDescription,
    ShortName:
      act?.ShortName ??
      pt?.ShortName ??
      item.ShortName ??
      item.Col2 ??
      pt?.ProjectId ??
      act?.ProjectId ??
      item.ProjectId,
    ReportCostCode: cost?.ReportCostCode ?? item.ReportCostCode,
    Objid: item.Objid,
  };
}

export function dedupeRegistros(rows: RegistroMock[]): RegistroMock[] {
  const byKey = new Map<string, RegistroMock>();
  for (const row of rows) {
    const key =
      row.codigo?.startsWith("IFS-")
        ? row.codigo
        : isIfsRegistroId(row.id)
          ? row.id
          : `${row.fecha}|${row.proy}|${row.horas}|${row.act}|${row.tipo}`;
    const existing = byKey.get(key);
    if (!existing || isIfsRegistroId(row.id)) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()];
}

export function mapReportItemsHistoricoToRegistros(raw: unknown): RegistroMock[] {
  return parseEmpReportItems(raw)
    .map((row, index) =>
      mapEmpReportItemToRegistro(flattenReportItemRow(row as ReportItemExpanded), index),
    )
    .filter((row): row is RegistroMock => row !== null);
}

export function groupRegistrosMockByFecha(
  registros: RegistroMock[],
): Record<string, RegistroMock[]> {
  const grouped: Record<string, RegistroMock[]> = {};
  for (const reg of registros) {
    if (!grouped[reg.fecha]) grouped[reg.fecha] = [];
    grouped[reg.fecha].push(reg);
  }
  return grouped;
}

/** Filas locales que aún no tienen equivalente en IFS (mismo id). */
function localRowsNotInIfs(
  localRows: RegistroMock[],
  ifsIds: Set<string>,
): RegistroMock[] {
  return localRows.filter(
    (row) => !isIfsRegistroId(row.id) && !ifsIds.has(row.id),
  );
}

/** IFS como fuente principal + registros locales sin par en IFS (demo, pendientes de sync). */
export function mergeIfsAndLocalRegistros(
  ifsGrouped: Record<string, RegistroMock[]>,
  localGrouped: Record<string, RegistroMock[]>,
): Record<string, RegistroMock[]> {
  const merged: Record<string, RegistroMock[]> = {};
  const fechas = new Set([
    ...Object.keys(ifsGrouped),
    ...Object.keys(localGrouped),
  ]);

  for (const fecha of fechas) {
    const ifsRows = ifsGrouped[fecha] ?? [];
    const localRows = localGrouped[fecha] ?? [];
    const ifsIds = new Set(ifsRows.map((row) => row.id));

    merged[fecha] = [...ifsRows, ...localRowsNotInIfs(localRows, ifsIds)];
  }

  return merged;
}

export function emptyRegistrosMessage(fromIfs: boolean): string {
  return fromIfs
    ? "No se pudieron cargar los registros desde IFS. Mostrando datos locales."
    : "No se pudieron cargar los registros. Revisa la base de datos.";
}

export function registrosLoadingHint(fromIfs: boolean): string | undefined {
  return fromIfs
    ? LOADING_COPY.timeRecordsIfs.hint
    : LOADING_COPY.timeRecords.hint;
}
