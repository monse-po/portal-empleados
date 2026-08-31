import {
  ifsFetch,
  odataStringKey,
  projectionSiblingBaseUrl,
} from "@/src/lib/ifs/client";
import { getIfsConfig } from "@/src/lib/ifs/config";
import { IfsApiError } from "@/src/lib/ifs/errors";

type ODataCollection<T> = { value?: T[] };

export type GeoOption = {
  code: string;
  name: string;
  label: string;
};

export type StateCodeRow = {
  CountryCode?: string;
  Country?: string;
  StateCode?: string;
  State?: string;
  StateName?: string;
  Description?: string;
  Id?: string;
};

export type CountyCodeRow = {
  CountryCode?: string;
  Country?: string;
  StateCode?: string;
  State?: string;
  CountyCode?: string;
  County?: string;
  CountyName?: string;
  Description?: string;
  Id?: string;
};

export type CityCodeRow = {
  CountryCode?: string;
  Country?: string;
  StateCode?: string;
  State?: string;
  CountyCode?: string;
  County?: string;
  CityCode?: string;
  City?: string;
  CityName?: string;
  Description?: string;
  Id?: string;
};

/** Primero el portal empleado; luego proyecciones de dirección. */
const GEO_SOURCES: Array<{ label: string; baseUrl: () => string }> = [
  {
    label: "CEmpPortalServices",
    baseUrl: () => getIfsConfig().cempPortalBaseUrl.replace(/\/$/, ""),
  },
  {
    label: "AddressInfoHandling",
    baseUrl: () => projectionSiblingBaseUrl("AddressInfoHandling"),
  },
  {
    label: "AddressSetupHandling",
    baseUrl: () => projectionSiblingBaseUrl("AddressSetupHandling"),
  },
  {
    label: "EnterpAddressInfoHandling",
    baseUrl: () => projectionSiblingBaseUrl("EnterpAddressInfoHandling"),
  },
  {
    label: "CreateCompanyBasicDataHandling",
    baseUrl: () => projectionSiblingBaseUrl("CreateCompanyBasicDataHandling"),
  },
];

const STATE_PATHS = [
  "/Lookup_StateCode_EntitySet",
  "/Lookup_IsoState_EntitySet",
  "/Reference_StateCode",
  "/Reference_StateCodes",
  "/StateCodes",
  "/StateCodeSet",
  "/StateCodeLov",
];

const CITY_PATHS = [
  "/Lookup_CityCode_EntitySet",
  "/Reference_CityCode",
  "/Reference_CityCodes",
  "/CityCodes",
  "/CityCodeSet",
  "/CityCodeLov",
];

const COUNTY_PATHS = [
  "/Lookup_CountyCode_EntitySet",
  "/Reference_CountyCode",
  "/Reference_CountyCodes",
  "/CountyCodes",
  "/CountyCodeSet",
  "/CountyCodeLov",
];

type GeoEndpoints = {
  source: string;
  baseUrl: string;
  statesPath: string;
  citiesPath: string;
  countiesPath?: string;
};

let cachedEndpoints: GeoEndpoints | null | undefined;

function pickName(
  ...candidates: Array<string | undefined | null>
): string {
  for (const c of candidates) {
    const v = c?.trim();
    if (v) return v;
  }
  return "";
}

function toOption(code: string, name: string): GeoOption | null {
  const c = code.trim();
  if (!c) return null;
  const n = name.trim() || c;
  return { code: c, name: n, label: n === c ? c : `${n} (${c})` };
}

function mapStates(rows: StateCodeRow[]): GeoOption[] {
  const seen = new Set<string>();
  const out: GeoOption[] = [];
  for (const row of rows) {
    const code = pickName(row.StateCode, row.State, row.Id);
    const name = pickName(row.StateName, row.Description, code);
    const opt = toOption(code, name);
    if (!opt || seen.has(opt.code)) continue;
    seen.add(opt.code);
    out.push(opt);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function mapCities(rows: CityCodeRow[]): GeoOption[] {
  const seen = new Set<string>();
  const out: GeoOption[] = [];
  for (const row of rows) {
    const code = pickName(row.CityCode, row.City, row.Id);
    const name = pickName(row.CityName, row.Description, code);
    const opt = toOption(code, name);
    if (!opt || seen.has(opt.code)) continue;
    seen.add(opt.code);
    out.push(opt);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function mapCounties(rows: CountyCodeRow[]): GeoOption[] {
  const seen = new Set<string>();
  const out: GeoOption[] = [];
  for (const row of rows) {
    const code = pickName(row.CountyCode, row.County, row.Id);
    const name = pickName(row.CountyName, row.Description, code);
    const opt = toOption(code, name);
    if (!opt || seen.has(opt.code)) continue;
    seen.add(opt.code);
    out.push(opt);
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function parseEntitySets(metadataXml: string): string[] {
  const names: string[] = [];
  const re = /EntitySet[^>]*Name="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(metadataXml))) names.push(m[1]);
  return names;
}

function guessPath(entitySets: string[], hints: string[]): string | undefined {
  const lower = entitySets.map((n) => ({ n, l: n.toLowerCase() }));
  for (const hint of hints) {
    const hit = lower.find((e) => e.l === hint.toLowerCase());
    if (hit) return `/${hit.n}`;
  }
  for (const hint of hints) {
    const hit = lower.find(
      (e) =>
        e.l.includes(hint.toLowerCase()) &&
        !e.l.includes("currency") &&
        !e.l.includes("country"),
    );
    if (hit) return `/${hit.n}`;
  }
  return undefined;
}

async function discoverFromSource(
  accessToken: string,
  source: string,
  baseUrl: string,
): Promise<GeoEndpoints | null> {
  try {
    const res = await fetch(`${baseUrl}/$metadata`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/xml",
      },
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const sets = parseEntitySets(xml);
    const statesPath = guessPath(sets, [
      "Lookup_StateCode_EntitySet",
      "StateCodes",
      "Reference_StateCode",
      "StateCodeSet",
      "StateCodeLov",
      "State",
    ]);
    const citiesPath = guessPath(sets, [
      "Lookup_CityCode_EntitySet",
      "CityCodes",
      "Reference_CityCode",
      "CityCodeSet",
      "CityCodeLov",
      "City",
    ]);
    const countiesPath = guessPath(sets, [
      "Lookup_CountyCode_EntitySet",
      "CountyCodes",
      "Reference_CountyCode",
      "CountyCodeSet",
      "County",
    ]);
    if (statesPath && (citiesPath || countiesPath)) {
      return {
        source,
        baseUrl,
        statesPath,
        citiesPath: citiesPath ?? countiesPath!,
        countiesPath: countiesPath,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function discoverEndpoints(
  accessToken: string,
): Promise<GeoEndpoints | null> {
  if (cachedEndpoints !== undefined) return cachedEndpoints;

  for (const src of GEO_SOURCES) {
    const found = await discoverFromSource(
      accessToken,
      src.label,
      src.baseUrl(),
    );
    if (found) {
      cachedEndpoints = found;
      return found;
    }
  }

  // Prefer portal paths even without metadata match
  cachedEndpoints = {
    source: "CEmpPortalServices",
    baseUrl: getIfsConfig().cempPortalBaseUrl.replace(/\/$/, ""),
    statesPath: STATE_PATHS[0],
    citiesPath: CITY_PATHS[0],
    countiesPath: COUNTY_PATHS[0],
  };
  return cachedEndpoints;
}

async function tryCollection<T>(
  accessToken: string,
  baseUrl: string,
  pathWithQuery: string,
): Promise<T[]> {
  const raw = await ifsFetch<ODataCollection<T> | T[]>(pathWithQuery, {
    accessToken,
    baseUrl,
  });
  if (Array.isArray(raw)) return raw;
  return raw.value ?? [];
}

function countryFilterVariants(countryCode: string): string[] {
  const c = odataStringKey(countryCode.trim());
  return [
    `CountryCode eq '${c}'`,
    `Country eq '${c}'`,
    `Id eq '${c}'`,
  ];
}

function stateFilterVariants(
  countryCode: string,
  stateCode: string,
): string[] {
  const c = odataStringKey(countryCode.trim());
  const s = odataStringKey(stateCode.trim());
  return [
    `CountryCode eq '${c}' and StateCode eq '${s}'`,
    `Country eq '${c}' and State eq '${s}'`,
    `CountryCode eq '${c}' and State eq '${s}'`,
    `Country eq '${c}' and StateCode eq '${s}'`,
  ];
}

async function probePaths<T>(
  accessToken: string,
  baseUrl: string,
  paths: string[],
  filters: string[],
  mapRows: (rows: T[]) => GeoOption[],
): Promise<{ options: GeoOption[]; path?: string } | { error: string }> {
  let lastErr = "";
  for (const entityPath of paths) {
    for (const filter of filters) {
      const path =
        `${entityPath}?$filter=${encodeURIComponent(filter)}` + `&$top=500`;
      try {
        const rows = await tryCollection<T>(accessToken, baseUrl, path);
        const options = mapRows(rows);
        if (options.length) return { options, path: entityPath };
      } catch (err) {
        lastErr =
          err instanceof IfsApiError
            ? `${err.status}: ${err.message}`
            : String(err);
        // 404 = path no existe en esta proyección → siguiente path
        if (err instanceof IfsApiError && err.status === 404) break;
      }
    }
  }
  return { error: lastErr || "sin datos" };
}

/** Lista EntitySets del portal (diagnóstico). */
export async function listCempPortalEntitySets(
  accessToken: string,
): Promise<string[]> {
  const baseUrl = getIfsConfig().cempPortalBaseUrl.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/$metadata`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/xml",
    },
  });
  if (!res.ok) {
    throw new IfsApiError(
      `IFS metadata ${res.status}`,
      res.status,
      await res.text(),
    );
  }
  return parseEntitySets(await res.text()).sort();
}

/** Regiones / estados — prioriza CEmpPortalServices. */
export async function getGeoStates(
  accessToken: string,
  countryCode: string,
): Promise<{ options: GeoOption[]; projection?: string; error?: string }> {
  const discovered = await discoverEndpoints(accessToken);
  const filters = countryFilterVariants(countryCode);

  // 1) Fuente descubierta (idealmente el portal)
  if (discovered) {
    const hit = await probePaths<StateCodeRow>(
      accessToken,
      discovered.baseUrl,
      [discovered.statesPath, ...STATE_PATHS.filter((p) => p !== discovered.statesPath)],
      filters,
      mapStates,
    );
    if ("options" in hit && hit.options.length) {
      return { options: hit.options, projection: discovered.source };
    }
  }

  // 2) Barrido de todas las fuentes empezando por el portal
  let lastErr = "";
  for (const src of GEO_SOURCES) {
    const hit = await probePaths<StateCodeRow>(
      accessToken,
      src.baseUrl(),
      STATE_PATHS,
      filters,
      mapStates,
    );
    if ("options" in hit && hit.options.length) {
      cachedEndpoints = {
        source: src.label,
        baseUrl: src.baseUrl(),
        statesPath: hit.path ?? STATE_PATHS[0],
        citiesPath: CITY_PATHS[0],
        countiesPath: COUNTY_PATHS[0],
      };
      return { options: hit.options, projection: src.label };
    }
    if ("error" in hit) lastErr = hit.error;
  }

  return {
    options: [],
    projection: discovered?.source,
    error: lastErr || `Sin regiones en portal IFS para ${countryCode}`,
  };
}

/** Municipios / ciudades / zona — prioriza CEmpPortalServices. */
export async function getGeoMunicipalities(
  accessToken: string,
  countryCode: string,
  stateCode: string,
): Promise<{ options: GeoOption[]; projection?: string; error?: string }> {
  const discovered = await discoverEndpoints(accessToken);
  const filters = stateFilterVariants(countryCode, stateCode);

  const trySource = async (source: string, baseUrl: string, paths: string[]) => {
    const cities = await probePaths<CityCodeRow>(
      accessToken,
      baseUrl,
      paths,
      filters,
      mapCities,
    );
    if ("options" in cities && cities.options.length) {
      return { options: cities.options, projection: source };
    }
    const counties = await probePaths<CountyCodeRow>(
      accessToken,
      baseUrl,
      COUNTY_PATHS,
      filters,
      mapCounties,
    );
    if ("options" in counties && counties.options.length) {
      return { options: counties.options, projection: source };
    }
    return {
      error:
        ("error" in cities ? cities.error : "") ||
        ("error" in counties ? counties.error : "") ||
        "sin datos",
    };
  };

  if (discovered) {
    const paths = [
      discovered.citiesPath,
      ...CITY_PATHS.filter((p) => p !== discovered.citiesPath),
    ];
    const hit = await trySource(discovered.source, discovered.baseUrl, paths);
    if ("options" in hit && hit.options) return hit;
  }

  let lastErr = "";
  for (const src of GEO_SOURCES) {
    const hit = await trySource(src.label, src.baseUrl(), CITY_PATHS);
    if ("options" in hit && hit.options) return hit;
    if ("error" in hit) lastErr = hit.error;
  }

  return {
    options: [],
    projection: discovered?.source,
    error:
      lastErr ||
      `Sin municipios en portal IFS para ${countryCode}/${stateCode}`,
  };
}
