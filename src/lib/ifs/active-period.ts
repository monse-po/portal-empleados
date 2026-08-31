/**
 * GetUserInfo.ActivePeriod: YYYYMM (ej. 202609) o YYYY-MM.
 * IFS define el mes registrable; el portal no usa el mes del reloj si esto viene.
 */
export function parseIfsActivePeriod(
  period?: string | null,
): { year: number; month: number } | null {
  const raw = (period ?? "").trim();
  const compact = /^\d{6}$/.test(raw)
    ? raw
    : /^\d{4}-\d{2}$/.test(raw)
      ? `${raw.slice(0, 4)}${raw.slice(5, 7)}`
      : "";
  if (!compact) return null;
  const year = Number(compact.slice(0, 4));
  const month = Number(compact.slice(4, 6));
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return { year, month };
}
