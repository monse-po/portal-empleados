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

/** Días ISO inclusivos entre `from` y `to` (ordena si vienen invertidos). */
export function eachIsoDateInclusive(from?: string, to?: string): string[] {
  const start = isoToDate(from);
  const end = isoToDate(to ?? from);
  if (!start) return [];
  const a = end && end < start ? end : start;
  const b = end && end < start ? start : (end ?? start);
  const out: string[] = [];
  const cur = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const last = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  while (cur <= last) {
    const iso = dateToIso(cur);
    if (iso) out.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
