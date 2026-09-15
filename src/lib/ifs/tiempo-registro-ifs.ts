import { formatIfsBusinessErrors } from "@/src/lib/ifs/errors";
import type { EmpTimeReg } from "@/src/lib/ifs/types";
import type { RegistroMock } from "@/src/lib/tiempo-registro";

/** Mapeo portal → payload IFS (`EmpPortalTimeRegList`). */
export function registroToEmpTimeReg(reg: RegistroMock): EmpTimeReg {
  return {
    AccountDate: reg.fecha,
    ShortName: reg.shortName || reg.proy,
    ReportCostCode: reg.tipo,
    DayHours: reg.horas,
    Comments: reg.comentario?.trim() || undefined,
  };
}

function extractRegisterResponseItems(raw: unknown): EmpTimeReg[] {
  if (!raw || typeof raw !== "object") return [];

  const root = raw as Record<string, unknown>;
  const direct = root.EmpTimeRegResp;
  if (Array.isArray(direct)) return direct as EmpTimeReg[];

  const nested = root.value;
  if (nested && typeof nested === "object") {
    const inner = (nested as Record<string, unknown>).EmpTimeRegResp;
    if (Array.isArray(inner)) return inner as EmpTimeReg[];
  }

  return [];
}

/** Lanza si IFS devolvió ErrorMsg en alguna fila. */
export function formatIfsRegisterErrors(errors: string[]): string {
  return formatIfsBusinessErrors(errors);
}

export function assertRegisterTimeResponse(raw: unknown): void {
  const items = extractRegisterResponseItems(raw);
  const errors = items
    .map((item) => item.ErrorMsg?.trim())
    .filter((msg): msg is string => Boolean(msg));

  if (errors.length) {
    throw new Error(formatIfsRegisterErrors(errors));
  }
}

function horasCoinciden(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

/** Busca en la hoja IFS la fila recién creada (misma fecha, proyecto, tipo, horas). */
export function findMatchingIfsRegistro(
  local: RegistroMock,
  ifsRows: RegistroMock[],
): RegistroMock | undefined {
  return ifsRows.find(
    (row) =>
      row.fecha === local.fecha &&
      (row.proy === local.proy ||
        (local.shortName != null &&
          (row.shortName === local.shortName || row.proy === local.shortName))) &&
      row.tipo === local.tipo &&
      horasCoinciden(row.horas, local.horas),
  );
}

export function ifsLegacyIdFromRegistro(reg: RegistroMock): string | null {
  const match = /^ifs-pt-(\d+)$/.exec(reg.id);
  return match ? reg.id : null;
}

export function projectTransactionSeqFromRegistroId(
  registroId: string,
): number | null {
  const match = /^ifs-pt-(\d+)$/.exec(registroId);
  if (!match) return null;
  const seq = Number.parseInt(match[1], 10);
  return Number.isFinite(seq) ? seq : null;
}
