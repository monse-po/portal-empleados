import { LOADING_COPY } from "@/src/lib/copy/loading";
import type {
  EmpReportItemRow,
  EmpTimeDelete,
  EmpTimeReg,
  EmpTimeUpdate,
} from "@/src/lib/ifs/types";
import type {
  RegistroEstado,
  RegistroIfsMeta,
  RegistroMock,
} from "@/src/lib/mi-tiempo-mock";

export function isIfsRegistroId(id: string): boolean {
  return id.startsWith("ifs-");
}

export function parseIfsProjectTransactionSeq(id: string): number | null {
  const m = /^ifs-pt-(\d+)$/.exec(id);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function ifsMetaFromReportRow(
  row: EmpReportItemRow,
): RegistroIfsMeta | undefined {
  const module = row.Module?.trim();
  const objid = row.Objid?.trim();
  const objversion = row.Objversion?.trim();
  if (!module || !objid || !objversion) return undefined;
  return {
    module,
    objid,
    objversion,
    projectTransactionSeq:
      row.ProjectTransactionSeq != null
        ? Number(row.ProjectTransactionSeq)
        : undefined,
  };
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
  // Registered / Registrado / Pending → ya está en IFS, aún no aprobado
  if (status.includes("registr") || status.includes("pending")) return "Registrado";
  // Fila presente en timesheet IFS sin status claro → Registrado
  if (row.ProjectTransactionSeq != null || row.Objid?.trim()) return "Registrado";
  return "Registrado";
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
    proyNombre: row.ProjectName?.trim() || undefined,
    subproy: row.SubProjectDesc?.trim() || row.SubProjectId?.trim() || undefined,
    subproyId: row.SubProjectId?.trim() || undefined,
    act: row.ActDescription?.trim() || row.ActivityNo?.trim() || "—",
    tipo: row.ReportCostCode?.trim() || "DN",
    horas,
    fecha,
    comentario: row.InternalComments?.trim() ?? "",
    comentarioRechazo: row.CRejectNote?.trim() || undefined,
    aprobador,
    estado: mapIfsEstado(row),
    ifs: ifsMetaFromReportRow(row),
  };
}

export function mapEmployeeTimesheetToRegistros(
  raw: unknown,
  empNo?: string,
): RegistroMock[] {
  let rows = parseEmpReportItems(raw);
  if (empNo) {
    const digits = empNo.replace(/\D/g, "");
    const filtered = rows.filter(
      (row) => !row.EmpNo || row.EmpNo.replace(/\D/g, "") === digits,
    );
    if (filtered.length) rows = filtered;
  }
  return rows
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

/** Neon / UI → payload EmpPortalTimeRegList. */
export function mapRegistroToEmpTimeReg(reg: RegistroMock): EmpTimeReg {
  return {
    AccountDate: reg.fecha.slice(0, 10),
    ShortName: reg.proy.trim(),
    ReportCostCode: reg.tipo.trim() || "DN",
    DayHours: reg.horas,
    Comments: reg.comentario?.trim() || undefined,
  };
}

export function mapRegistrosToEmpTimeReg(registros: RegistroMock[]): EmpTimeReg[] {
  return registros.map(mapRegistroToEmpTimeReg);
}

function extractErrorMsgs(
  rows: Array<{ ErrorMsg?: string; Status?: string }> | undefined,
): string[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const msg = row.ErrorMsg?.trim();
      if (msg) return msg;
      const status = row.Status?.trim();
      if (status && /^(error|false|fail)/i.test(status)) {
        return `IFS Status=${status}`;
      }
      return null;
    })
    .filter((msg): msg is string => !!msg);
}

/** Extrae ErrorMsg de la respuesta EmpPortalTimeRegList (si viene). */
export function extractEmpTimeRegErrors(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  return extractErrorMsgs(
    (raw as { EmpTimeRegResp?: EmpTimeReg[] }).EmpTimeRegResp,
  );
}

export function extractEmpTimeUpdateErrors(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  return extractErrorMsgs(
    (raw as { EmpTimeUpdateResp?: EmpTimeUpdate[] }).EmpTimeUpdateResp,
  );
}

export function extractEmpTimeDeleteErrors(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  return extractErrorMsgs(
    (raw as { EmpTimeDeleteResp?: EmpTimeDelete[] }).EmpTimeDeleteResp,
  );
}

export function mapRegistroToEmpTimeUpdate(
  reg: RegistroMock,
  meta: RegistroIfsMeta,
): EmpTimeUpdate {
  return {
    Module: meta.module,
    AccountDate: reg.fecha.slice(0, 10),
    ShortName: reg.proy.trim(),
    ReportCostCode: reg.tipo.trim() || "DN",
    DayHours: reg.horas,
    Objid: meta.objid,
    Objversion: meta.objversion,
    Comments: reg.comentario?.trim() || undefined,
  };
}

export function mapRegistroToEmpTimeDelete(
  reg: RegistroMock,
  meta: RegistroIfsMeta,
): EmpTimeDelete {
  return {
    AccountDate: reg.fecha.slice(0, 10),
    Module: meta.module,
    Objid: meta.objid,
    Objversion: meta.objversion,
  };
}

/** Busca meta IFS en timesheet por id portal (ifs-pt-N / objid). */
export function findIfsMetaInTimesheet(
  raw: unknown,
  registroId: string,
): RegistroIfsMeta | undefined {
  const seq = parseIfsProjectTransactionSeq(registroId);
  const rows = parseEmpReportItems(raw);
  const row =
    seq != null
      ? rows.find((r) => Number(r.ProjectTransactionSeq) === seq)
      : rows.find((r) => {
          const id = registroIdFromRow(r, 0);
          return id === registroId || `ifs-obj-${r.Objid?.trim()}` === registroId;
        });
  return row ? ifsMetaFromReportRow(row) : undefined;
}

/** Clave de negocio para detectar el mismo registro Neon vs IFS (ids distintos). */
export function registroFingerprint(reg: RegistroMock): string {
  const horas = Number(reg.horas.toFixed(2));
  return [
    reg.fecha.slice(0, 10),
    reg.proy.trim().toLowerCase(),
    (reg.subproy ?? "").trim().toLowerCase(),
    (reg.act ?? "").trim().toLowerCase(),
    (reg.tipo ?? "").trim().toLowerCase(),
    String(horas),
  ].join("|");
}

/**
 * Match más laxo post-envío (act/subproy a menudo difieren entre portal e IFS).
 * fecha + shortName/proy + tipo + horas.
 */
export function registroFingerprintLoose(reg: RegistroMock): string {
  const horas = Number(reg.horas.toFixed(2));
  const proy = reg.proy.trim().toLowerCase().split("·")[0].trim();
  return [
    reg.fecha.slice(0, 10),
    proy,
    (reg.tipo ?? "").trim().toLowerCase(),
    String(horas),
  ].join("|");
}

export function findIfsMatchesForLocal(
  local: RegistroMock[],
  ifsRegs: RegistroMock[],
): RegistroMock[] {
  const loose = new Map(
    ifsRegs.map((r) => [registroFingerprintLoose(r), r] as const),
  );
  const out: RegistroMock[] = [];
  const used = new Set<string>();

  for (const b of local) {
    const exact = ifsRegs.find(
      (r) =>
        !used.has(r.id) && registroFingerprint(r) === registroFingerprint(b),
    );
    if (exact) {
      used.add(exact.id);
      out.push(exact);
      continue;
    }
    const soft = loose.get(registroFingerprintLoose(b));
    if (soft && !used.has(soft.id)) {
      used.add(soft.id);
      out.push(soft);
    }
  }

  return out;
}

/** Filas locales sin equivalente en IFS (por id ni por fingerprint). */
function localRowsNotInIfs(
  localRows: RegistroMock[],
  ifsRows: RegistroMock[],
): RegistroMock[] {
  const ifsIds = new Set(ifsRows.map((row) => row.id));
  const ifsKeys = new Set(ifsRows.map(registroFingerprint));
  return localRows.filter(
    (row) =>
      !isIfsRegistroId(row.id) &&
      !ifsIds.has(row.id) &&
      !ifsKeys.has(registroFingerprint(row)),
  );
}

/** IFS como fuente principal + locales sin par en timesheet. */
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

    merged[fecha] = [...ifsRows, ...localRowsNotInIfs(localRows, ifsRows)];
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
