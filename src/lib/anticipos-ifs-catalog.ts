import type { CurrencyCodeRow, IsoCountryRow } from "@/src/lib/ifs/types";
import type { DestinoSel } from "@/src/lib/anticipos-catalog";
import { DEST_CATALOG, PRE_MAP } from "@/src/lib/anticipos-catalog";
import type { GeoOption } from "@/src/lib/ifs/address-geo";

export type DivisaOption = {
  code: string;
  label: string;
  pre: string;
  /**
   * Decimales de monto desde IFS CurrencyCodesHandling.CurrencyRounding.
   * `null` = aún no disponible (p. ej. 403 / sin permiso).
   */
  decimals?: number | null;
  /** True si `decimals` vino de CurrencyCodesHandling. */
  roundingFromIfs?: boolean;
};

const FALLBACK_PREFIX: Record<string, string> = {
  ...PRE_MAP,
  EUR: "€",
  GBP: "£",
  CLP: "$",
  BRL: "R$",
};

export function currencyPrefix(code: string): string {
  return FALLBACK_PREFIX[code] || "$";
}

export function mapCurrencyCodesToDivisas(
  rows: CurrencyCodeRow[],
): DivisaOption[] {
  const seen = new Set<string>();
  const out: DivisaOption[] = [];
  for (const row of rows) {
    const code = row.CurrencyCode?.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const desc = row.Description?.trim();
    out.push({
      code,
      label: desc ? `${code} – ${desc}` : code,
      pre: currencyPrefix(code),
      decimals: null,
      roundingFromIfs: false,
    });
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

/** Enriquecer divisas del portal con CurrencyRounding nativo de IFS. */
export function mergeCurrencyRounding(
  divisas: DivisaOption[],
  formats: Array<{ code: string; description?: string; decimals: number | null }>,
): DivisaOption[] {
  if (!formats.length) return divisas;
  const byCode = new Map(formats.map((f) => [f.code, f]));
  return divisas.map((d) => {
    const fmt = byCode.get(d.code);
    if (!fmt) return d;
    return {
      ...d,
      label:
        fmt.description && !d.label.includes("–")
          ? `${d.code} – ${fmt.description}`
          : d.label,
      decimals: fmt.decimals,
      roundingFromIfs: fmt.decimals != null,
    };
  });
}

/** País, Región, Municipio — orden de negocio. */
export function buildDestinoLabel(
  pais: string,
  region: string,
  municipio: string,
): string {
  return [pais, region, municipio].filter(Boolean).join(", ");
}

export function mapIsoCountriesToDestinos(
  countries: IsoCountryRow[],
): DestinoSel[] {
  const seen = new Set<string>();
  const destinos: DestinoSel[] = [];

  for (const row of countries) {
    const code = row.Id?.trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const pais = row.Description?.trim() || code;
    destinos.push({
      ciudad: "",
      dpto: "",
      pais,
      pCode: code,
      label: pais,
    });
  }

  return destinos.sort((a, b) => a.pais.localeCompare(b.pais, "es"));
}

/** Catálogo local aplanado: "Colombia, Antioquia, Bello". */
export function flattenLocalDestinos(
  paisNamesByCode?: Map<string, string>,
): DestinoSel[] {
  const destinos: DestinoSel[] = [];
  for (const [pCode, pData] of Object.entries(DEST_CATALOG)) {
    const pais = paisNamesByCode?.get(pCode.toUpperCase()) || pData.nombre;
    for (const dData of Object.values(pData.departamentos)) {
      for (const ciudad of dData.ciudades) {
        destinos.push({
          ciudad,
          dpto: dData.nombre,
          pais,
          pCode,
          label: buildDestinoLabel(pais, dData.nombre, ciudad),
        });
      }
    }
  }
  return destinos;
}

/** Aplana país + regiones + municipios IFS. */
export function flattenGeoDestinos(
  paisCode: string,
  paisName: string,
  regiones: GeoOption[],
  municipiosByRegion: Map<string, GeoOption[]>,
): DestinoSel[] {
  const destinos: DestinoSel[] = [];
  for (const region of regiones) {
    const municipios = municipiosByRegion.get(region.code) ?? [];
    for (const mun of municipios) {
      destinos.push({
        ciudad: mun.name,
        dpto: region.name,
        pais: paisName,
        pCode: paisCode,
        label: buildDestinoLabel(paisName, region.name, mun.name),
      });
    }
  }
  return destinos;
}

/**
 * Busca por cualquier variación: "Bello", "Antioquia", "Colombia",
 * "bello antioquia", "Colombia, Bello", etc.
 */
export function searchDestinosConfig(
  all: DestinoSel[],
  query: string,
): DestinoSel[] {
  const raw = query.trim().toLowerCase();
  if (!raw) {
    const preferidos = all.filter(
      (r) => r.pCode === "CO" || r.pCode === "COL",
    );
    return (preferidos.length ? preferidos : all).slice(0, 24);
  }

  const normalized = raw.replace(/\s*,\s*/g, ", ");
  const tokens = raw.split(/[,\s]+/).filter((t) => t.length > 0);

  const scored = all
    .map((r) => {
      const hay =
        `${r.label} ${r.pais} ${r.dpto} ${r.ciudad} ${r.pCode}`.toLowerCase();
      if (hay.includes(normalized) || hay.includes(raw)) {
        return { r, score: 0 };
      }
      if (tokens.every((t) => hay.includes(t))) {
        // Prefer matches that hit ciudad first
        const ciudadHit = tokens.some((t) =>
          r.ciudad.toLowerCase().includes(t),
        );
        return { r, score: ciudadHit ? 1 : 2 };
      }
      return null;
    })
    .filter((x): x is { r: DestinoSel; score: number } => x !== null)
    .sort((a, b) => a.score - b.score || a.r.label.localeCompare(b.r.label, "es"));

  return scored.map((x) => x.r).slice(0, 40);
}
