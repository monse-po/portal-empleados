import {
  ifsFetch,
  odataStringKey,
  projectionMainSiblingBaseUrl,
} from "@/src/lib/ifs/client";
import { IfsApiError } from "@/src/lib/ifs/errors";

type ODataCollection<T> = { value?: T[] };

/** Fila de CurrencyCodesHandling.CurrencyCodeSet (Accounting Rules). */
export type IfsCompanyCurrencyCode = {
  Company?: string;
  CurrencyCode?: string;
  Description?: string;
  /** No of Decimals in Amount (config nativa IFS). */
  CurrencyRounding?: number | string | null;
  CurrRounding?: string | number | null;
  DecimalsInRate?: number | string | null;
  ConvFactor?: number | string | null;
};

export type CompanyCurrencyFormat = {
  code: string;
  description?: string;
  /** Decimales de monto desde CurrencyRounding / CurrRounding. */
  decimals: number | null;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Interpreta el redondeo de moneda IFS.
 * Preferimos CurrencyRounding numérico; CurrRounding a veces viene como enum "2".
 */
export function resolveCurrencyDecimals(
  row: Pick<IfsCompanyCurrencyCode, "CurrencyRounding" | "CurrRounding">,
): number | null {
  const fromRounding = asFiniteNumber(row.CurrencyRounding);
  if (fromRounding != null && fromRounding >= 0 && fromRounding <= 20) {
    return Math.trunc(fromRounding);
  }
  const fromEnum = asFiniteNumber(row.CurrRounding);
  if (fromEnum != null && fromEnum >= 0 && fromEnum <= 20) {
    return Math.trunc(fromEnum);
  }
  if (typeof row.CurrRounding === "string") {
    const digits = row.CurrRounding.match(/(\d{1,2})/)?.[1];
    if (digits != null) {
      const n = Number(digits);
      if (Number.isFinite(n) && n >= 0 && n <= 20) return n;
    }
  }
  return null;
}

/**
 * Lee CurrencyCodeSet de CurrencyCodesHandling (canal /main/).
 * Requiere privilegio; con 403/401 devuelve [] sin tumbar el flujo del portal.
 */
export async function getCompanyCurrencyFormats(
  accessToken: string,
  companyId: string,
): Promise<{
  formats: CompanyCurrencyFormat[];
  unauthorized?: boolean;
  error?: string;
}> {
  const company = companyId.trim();
  if (!company) return { formats: [] };

  const baseUrl = projectionMainSiblingBaseUrl("CurrencyCodesHandling");
  const filter = encodeURIComponent(`Company eq '${odataStringKey(company)}'`);
  const path =
    `/CurrencyCodeSet?$filter=${filter}` +
    `&$select=Company,CurrencyCode,Description,CurrencyRounding,CurrRounding,DecimalsInRate` +
    `&$top=200`;

  try {
    const raw = await ifsFetch<ODataCollection<IfsCompanyCurrencyCode>>(path, {
      accessToken,
      baseUrl,
    });
    const rows = raw.value ?? [];
    const formats: CompanyCurrencyFormat[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const code = row.CurrencyCode?.trim();
      if (!code || seen.has(code)) continue;
      seen.add(code);
      formats.push({
        code,
        description: row.Description?.trim() || undefined,
        decimals: resolveCurrencyDecimals(row),
      });
    }
    return { formats };
  } catch (err) {
    if (err instanceof IfsApiError && (err.status === 401 || err.status === 403)) {
      return {
        formats: [],
        unauthorized: true,
        error: err.message,
      };
    }
    return {
      formats: [],
      error: err instanceof Error ? err.message : "Error CurrencyCodesHandling",
    };
  }
}
