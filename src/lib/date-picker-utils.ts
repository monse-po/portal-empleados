/** ISO `YYYY-MM-DD` ↔ `Date` (zona local, sin desfase UTC). */

export function isoToDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if ([y, m, d].some(Number.isNaN)) return undefined;
  return new Date(y, m - 1, d);
}

export function dateToIso(d?: Date): string | undefined {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
