import type { CurrencyCodeRow, IsoCountryRow } from "@/src/lib/ifs/types";
import type { DestinoSel } from "@/src/lib/anticipos-catalog";
import { DEST_CATALOG, PRE_MAP } from "@/src/lib/anticipos-catalog";
import type { GeoOption } from "@/src/lib/ifs/address-geo";
import type { AdvanceCityCode } from "@/src/lib/ifs/cemp-advance";

/** Código que cabe en CEmpAdvances.Destination (max 20) y no es un label. */
export function isIfsDestinationCode(value: string | undefined): boolean {
  const v = value?.trim() || "";
  return Boolean(v) && v.length <= 20 && !v.includes(",") && /[\d-]/.test(v);
}

export function destinoIfsCode(dest: DestinoSel | null | undefined): string | undefined {
  const code = dest?.destinationCode?.trim();
  return isIfsDestinationCode(code) ? code : undefined;
}

export function looksLikeDestinationCode(value: string | undefined): boolean {
  const v = value?.trim() || "";
  if (!v) return false;
  if (v.includes(",")) return false;
  return isIfsDestinationCode(v) || /^[A-Z]{2}-[\dA-Z-]+$/i.test(v);
}

export function parseDestinationConcat(value: string): {
  countryCode?: string;
  stateCode?: string;
  countyCode?: string;
  cityCode?: string;
} {
  const parts = value.split("-").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 4) {
    return {
      countryCode: parts[0],
      stateCode: parts[1],
      countyCode: parts[2],
      cityCode: parts.slice(3).join("-"),
    };
  }
  if (parts.length === 1) return { cityCode: parts[0] };
  return {};
}

export function destinoConsultaLabel(row: AdvanceCityCode): string {
  const country = (row.CountryCode || "").trim().toUpperCase();
  const { corto } = resolvePaisNombres(country);
  const path = parseDestinoPath(row.DestinationDesc).filter(
    (part) => part.toLowerCase() !== corto.toLowerCase(),
  );
  const ciudad = placeName(row.CityName) || placeName(path.at(-1));
  const estado = placeName(path[0]);
  return joinDestinoNombres(corto, estado, ciudad) || ciudad || "";
}

/** Evita pintar códigos DANE/IFS (58, CL-58-5802, CMX) en la etiqueta del usuario. */
export function looksLikeGeoCode(value: string | undefined): boolean {
  const v = value?.trim() || "";
  if (!v) return false;
  if (/^[\d._-]+$/.test(v)) return true;
  if (/^[A-Z]{2}-[\dA-Z-]+$/i.test(v)) return true;
  return false;
}

/** Un solo nombre de lugar. Rechaza códigos, inglés y concatenaciones IFS. */
function isCleanPlaceName(value: string): boolean {
  const v = value.trim();
  if (!v || looksLikeGeoCode(v)) return false;
  if (v.includes("-")) return false;
  if (v.includes(",")) return false;
  if (/\b(the\s+)?republic of\b/i.test(v)) return false;
  if (/\b(united states)\b/i.test(v) && !/[áéíóúñü]/i.test(v)) return false;
  return true;
}

function placeName(
  value: string | undefined,
  ...fallbacks: Array<string | undefined>
): string {
  for (const candidate of [value, ...fallbacks]) {
    const v = candidate?.trim() || "";
    if (v && isCleanPlaceName(v)) return v;
  }
  return "";
}

/** Nombres de país en español cuando IsoCountry viene en inglés o en MAYÚSCULAS. */
const PAIS_NOMBRES_ES: Record<string, { oficial: string; corto: string }> = {
  CL: { oficial: "República de Chile", corto: "Chile" },
  CO: { oficial: "República de Colombia", corto: "Colombia" },
  EC: { oficial: "República del Ecuador", corto: "Ecuador" },
  MX: { oficial: "Estados Unidos Mexicanos", corto: "México" },
  PE: { oficial: "República del Perú", corto: "Perú" },
  US: { oficial: "Estados Unidos de América", corto: "Estados Unidos" },
};

export function resolvePaisNombres(
  countryCode: string,
  iso?: Pick<IsoCountryRow, "Description" | "Country" | "Name">,
): { oficial: string; corto: string } {
  const known = PAIS_NOMBRES_ES[countryCode.toUpperCase()];
  if (known) return known;
  const oficial = placeName(iso?.Description, iso?.Country, iso?.Name);
  const corto = placeName(iso?.Country, iso?.Name, oficial);
  return {
    oficial: oficial || countryCode,
    corto: corto || oficial || countryCode,
  };
}

/** País, estado, ciudad — sin repetir el país. */
export function joinDestinoNombres(
  pais?: string,
  estado?: string,
  ciudad?: string,
): string {
  const unique: string[] = [];
  for (const part of [pais, estado, ciudad]) {
    const v = placeName(part);
    if (!v) continue;
    if (unique.some((seen) => seen.toLowerCase() === v.toLowerCase())) continue;
    unique.push(v);
  }
  return unique.join(", ");
}

/**
 * DestinationDesc de IFS: "the Republic of Chile-Antofagasta-Antofagasta-Mejillones"
 * → [Antofagasta, Mejillones]
 */
export function parseDestinoPath(raw?: string): string[] {
  if (!raw?.trim()) return [];
  const parts = raw.split(/[-,]/).map((part) => part.trim()).filter(Boolean);
  const names: string[] = [];
  for (const part of parts) {
    if (looksLikeGeoCode(part)) continue;
    if (/\b(the\s+)?republic of\b/i.test(part)) continue;
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(part)) continue;
    if (names.at(-1)?.toLowerCase() === part.toLowerCase()) continue;
    names.push(part);
  }
  return names;
}

function lookupStateName(
  stateNamesByCountry: Map<string, string>,
  country: string,
  state: string,
): string | undefined {
  if (!state) return undefined;
  const upper = state.toUpperCase();
  return (
    stateNamesByCountry.get(`${country}|${upper}`) ||
    (/^\d+$/.test(upper)
      ? stateNamesByCountry.get(
          `${country}|${upper.replace(/^0+/, "") || "0"}`,
        )
      : undefined) ||
    (/^\d+$/.test(upper)
      ? stateNamesByCountry.get(`${country}|${upper.padStart(2, "0")}`)
      : undefined)
  );
}

/** País oficial, país, estado y ciudad — solo nombres, nunca códigos. */
export function applyDestinoPlaceNames(
  destinos: DestinoSel[],
  stateNamesByCountry: Map<string, string>,
  paisOficialByCountry?: Map<string, string>,
  paisCortoByCountry?: Map<string, string>,
): DestinoSel[] {
  return destinos.map((dest) => {
    const country = (dest.countryCode || dest.pCode || "").toUpperCase();
    const state = (dest.stateCode || "").toUpperCase();
    const known = PAIS_NOMBRES_ES[country];
    const pais = placeName(
      paisCortoByCountry?.get(country),
      known?.corto,
      dest.pais,
    );
    const region = placeName(
      lookupStateName(stateNamesByCountry, country, state),
      dest.dpto,
    );
    const ciudad = placeName(dest.ciudad);
    return {
      ...dest,
      dpto: region,
      pais,
      label: joinDestinoNombres(pais, region, ciudad) || dest.label,
    };
  });
}

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
  return joinDestinoNombres(pais, region, municipio);
}

/**
 * CityCodeSet no trae un array: trae 4 campos sueltos.
 * Destination = esos códigos concatenados, en este orden.
 */
export function concatAdvanceDestination(
  row: Pick<
    AdvanceCityCode,
    "CountryCode" | "StateCode" | "CountyCode" | "CityCode" | "DestinationCode"
  >,
): string {
  const parts = [
    row.CountryCode,
    row.StateCode,
    row.CountyCode,
    row.CityCode,
  ]
    .map((part) => part?.trim() || "")
    .filter(Boolean);
  const joined = parts.join("-");
  const rawDest = row.DestinationCode?.trim() || "";
  const city = row.CityCode?.trim() || "";
  if (isIfsDestinationCode(joined)) return joined;
  if (isIfsDestinationCode(rawDest)) return rawDest;
  if (isIfsDestinationCode(city)) return city;
  return joined || rawDest || city;
}

/** LOV real de Destination: CEmpAdvanceHandling.CityCodeSet. */
export function mapAdvanceCityCodesToDestinos(
  rows: AdvanceCityCode[],
  paisNamesByCode?: Map<string, string>,
  isoByCode?: Map<string, IsoCountryRow>,
  stateNamesByCountry?: Map<string, string>,
): DestinoSel[] {
  const destinos: DestinoSel[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const countryCode = (row.CountryCode || "").trim().toUpperCase();
    const stateCode = row.StateCode?.trim() || "";
    const countyCode = row.CountyCode?.trim() || "";
    const cityCode = row.CityCode?.trim() || "";
    const destinationCode = concatAdvanceDestination(row);
    const rowKey = [
      countryCode,
      stateCode,
      countyCode,
      cityCode,
      row.CityName?.trim() || "",
    ]
      .join("|")
      .toLowerCase();
    if (!rowKey.replace(/\|/g, "") || seen.has(rowKey)) continue;
    seen.add(rowKey);

    const { corto, oficial } = resolvePaisNombres(
      countryCode,
      isoByCode?.get(countryCode),
    );
    const pais = corto || paisNamesByCode?.get(countryCode) || oficial;
    const path = parseDestinoPath(row.DestinationDesc).filter(
      (part) => part.toLowerCase() !== pais.toLowerCase(),
    );
    const ciudad =
      placeName(row.CityName) ||
      placeName(row.City) ||
      placeName(path.at(-1));
    const estado =
      placeName(path[0]) ||
      placeName(
        stateNamesByCountry
          ? lookupStateName(stateNamesByCountry, countryCode, stateCode)
          : undefined,
      ) ||
      placeName(row.StateName);

    destinos.push({
      ciudad,
      dpto: estado,
      pais,
      pCode: countryCode,
      label: joinDestinoNombres(pais, estado, ciudad) || ciudad,
      destinationCode,
      countryCode,
      stateCode,
      countyCode,
      cityCode,
    });
  }

  return destinos.sort((a, b) => a.label.localeCompare(b.label, "es"));
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
    const { corto } = resolvePaisNombres(pCode, {
      Description: paisNamesByCode?.get(pCode.toUpperCase()) || pData.nombre,
    });
    for (const dData of Object.values(pData.departamentos)) {
      for (const ciudad of dData.ciudades) {
        destinos.push({
          ciudad,
          dpto: dData.nombre,
          pais: corto,
          pCode,
          label: joinDestinoNombres(corto, dData.nombre, ciudad),
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
  const { corto } = resolvePaisNombres(paisCode, {
    Description: paisName,
  });
  for (const region of regiones) {
    const municipios = municipiosByRegion.get(region.code) ?? [];
    for (const mun of municipios) {
      destinos.push({
        ciudad: mun.name,
        dpto: region.name,
        pais: corto,
        pCode: paisCode,
        label: joinDestinoNombres(corto, region.name, mun.name),
        destinationCode: isIfsDestinationCode(mun.code) ? mun.code : undefined,
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
        `${r.label} ${r.pais} ${r.dpto} ${r.ciudad} ${r.pCode} ${r.destinationCode || ""}`.toLowerCase();
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
