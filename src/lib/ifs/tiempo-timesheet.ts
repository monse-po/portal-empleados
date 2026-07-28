import { LOADING_COPY } from "@/src/lib/copy/loading";
import type { EmpReportItemRow } from "@/src/lib/ifs/types";
import type { RegistroEstado, RegistroMock } from "@/src/lib/mi-tiempo-mock";

export function isIfsRegistroId(id: string): boolean {
  return id.startsWith("ifs-pt-");
}

export function parseEmpReportItems(raw: unknown): EmpReportItemRow[] {
  if (Array.isArray(raw)) return raw as EmpReportItemRow[];
  const value = (raw as { value?: EmpReportItemRow[] })?.value;
  return Array.isArray(value) ? value : [];
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

function mapIfsEstado(row: EmpReportItemRow): RegistroEstado {
  const status = `${row.CStatusDb ?? row.CStatus ?? ""}`.toLowerCase();
  if (status.includes("reject")) return "Rechazado";
  if (status.includes("confirm")) return "Aprobado";
  if (status.includes("registered")) return "Registrado";
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
  const proy = row.ShortName?.trim() || row.ProjectId?.trim();
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
