"use server";

import {
  getCurrencyCodes,
  getIsoCountries,
} from "@/src/lib/ifs/cemp-portal";
import {
  getGeoMunicipalities,
  getGeoStates,
  listCempPortalEntitySets,
  type GeoOption,
} from "@/src/lib/ifs/address-geo";
import { formatIfsError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import {
  flattenGeoDestinos,
  flattenLocalDestinos,
  mapCurrencyCodesToDivisas,
  mapIsoCountriesToDestinos,
  mergeCurrencyRounding,
  type DivisaOption,
} from "@/src/lib/anticipos-ifs-catalog";
import type { DestinoSel } from "@/src/lib/anticipos-catalog";
import {
  DEST_CATALOG,
  DIVISAS_POR_COMPANIA,
} from "@/src/lib/anticipos-catalog";
import { getCompanyCurrencyFormats } from "@/src/lib/ifs/currency-codes-handling";

export async function fetchDivisasAnticipoAction(companyId: string): Promise<{
  divisas: DivisaOption[];
  fromIfs: boolean;
  /** True si CurrencyRounding vino de CurrencyCodesHandling. */
  roundingFromIfs?: boolean;
  error?: string;
  sessionExpired?: boolean;
}> {
  const company = companyId.trim();
  const fallback: DivisaOption[] = (
    DIVISAS_POR_COMPANIA[company] || DIVISAS_POR_COMPANIA.HMVINGCO
  ).map((d) => ({
    code: d.code,
    label: d.label,
    pre: d.pre,
    decimals: null,
    roundingFromIfs: false,
  }));

  if (!company) {
    return { divisas: fallback, fromIfs: false, error: "Sin compañía" };
  }

  try {
    return await withValidIfsSession(async (session) => {
      try {
        const rows = await getCurrencyCodes(session.accessToken, company);
        let divisas = mapCurrencyCodesToDivisas(rows);
        if (!divisas.length) {
          return {
            divisas: fallback,
            fromIfs: false,
            error: `Sin divisas IFS para ${company}`,
          };
        }

        // Decimales nativos: CurrencyCodesHandling.CurrencyRounding (puede 403).
        const detailed = await getCompanyCurrencyFormats(
          session.accessToken,
          company,
        );
        if (detailed.formats.length) {
          divisas = mergeCurrencyRounding(divisas, detailed.formats);
        }

        const roundingFromIfs = divisas.some((d) => d.roundingFromIfs);
        return {
          divisas,
          fromIfs: true,
          roundingFromIfs,
          error:
            !roundingFromIfs && detailed.unauthorized
              ? "Divisas IFS OK; sin permiso a CurrencyCodesHandling (CurrencyRounding)."
              : detailed.error && !roundingFromIfs
                ? detailed.error
                : undefined,
        };
      } catch (err) {
        return {
          divisas: fallback,
          fromIfs: false,
          error: formatIfsError(err),
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        divisas: fallback,
        fromIfs: false,
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      divisas: fallback,
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}

function mockPaises(): GeoOption[] {
  return Object.entries(DEST_CATALOG).map(([code, data]) => ({
    code,
    name: data.nombre,
    label: `${data.nombre} (${code})`,
  }));
}

function mockRegiones(countryCode: string): GeoOption[] {
  const pais = DEST_CATALOG[countryCode];
  if (!pais) return [];
  return Object.entries(pais.departamentos).map(([code, d]) => ({
    code,
    name: d.nombre,
    label: d.nombre,
  }));
}

function mockMunicipios(countryCode: string, regionCode: string): GeoOption[] {
  const dpto = DEST_CATALOG[countryCode]?.departamentos[regionCode];
  if (!dpto) return [];
  return dpto.ciudades.map((ciudad) => ({
    code: ciudad,
    name: ciudad,
    label: ciudad,
  }));
}

/** País (IsoCountry) — 1.er factor del destino. */
export async function fetchPaisesDestinoAction(): Promise<{
  options: GeoOption[];
  fromIfs: boolean;
  error?: string;
  sessionExpired?: boolean;
}> {
  try {
    return await withValidIfsSession(async (session) => {
      try {
        const countries = await getIsoCountries(session.accessToken);
        const destinos = mapIsoCountriesToDestinos(countries);
        const options: GeoOption[] = destinos.map((d) => ({
          code: d.pCode,
          name: d.pais,
          label: d.label,
        }));
        if (!options.length) {
          return {
            options: mockPaises(),
            fromIfs: false,
            error: "Lookup_IsoCountry vacío",
          };
        }
        return { options, fromIfs: true };
      } catch (err) {
        return {
          options: mockPaises(),
          fromIfs: false,
          error: formatIfsError(err),
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        options: mockPaises(),
        fromIfs: false,
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      options: mockPaises(),
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}

/** Región / estado (StateCode) — 2.º factor. */
export async function fetchRegionesDestinoAction(
  countryCode: string,
): Promise<{
  options: GeoOption[];
  fromIfs: boolean;
  projection?: string;
  error?: string;
  sessionExpired?: boolean;
}> {
  const country = countryCode.trim().toUpperCase();
  const fallback = mockRegiones(country);

  if (!country) return { options: [], fromIfs: false, error: "Sin país" };

  try {
    return await withValidIfsSession(async (session) => {
      try {
        const result = await getGeoStates(session.accessToken, country);
        if (result.options.length) {
          return {
            options: result.options,
            fromIfs: true,
            projection: result.projection,
          };
        }
        return {
          options: fallback,
          fromIfs: false,
          projection: result.projection,
          error:
            result.error ||
            "Sin StateCode en IFS — se usó catálogo local si existe",
        };
      } catch (err) {
        return {
          options: fallback,
          fromIfs: false,
          error: formatIfsError(err),
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        options: fallback,
        fromIfs: false,
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      options: fallback,
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}

/** Municipio / ciudad / zona (CityCode o CountyCode) — 3.er factor. */
export async function fetchMunicipiosDestinoAction(
  countryCode: string,
  regionCode: string,
): Promise<{
  options: GeoOption[];
  fromIfs: boolean;
  projection?: string;
  error?: string;
  sessionExpired?: boolean;
}> {
  const country = countryCode.trim().toUpperCase();
  const region = regionCode.trim();
  const fallback = mockMunicipios(country, region);

  if (!country || !region) {
    return { options: [], fromIfs: false, error: "Falta país o región" };
  }

  try {
    return await withValidIfsSession(async (session) => {
      try {
        const result = await getGeoMunicipalities(
          session.accessToken,
          country,
          region,
        );
        if (result.options.length) {
          return {
            options: result.options,
            fromIfs: true,
            projection: result.projection,
          };
        }
        return {
          options: fallback,
          fromIfs: false,
          projection: result.projection,
          error:
            result.error ||
            "Sin CityCode/CountyCode en IFS — se usó catálogo local si existe",
        };
      } catch (err) {
        return {
          options: fallback,
          fromIfs: false,
          error: formatIfsError(err),
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        options: fallback,
        fromIfs: false,
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      options: fallback,
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}

/** Diagnóstico: qué EntitySets trae CEmpPortalServices (país/región/ciudad). */
export async function probeDestinoIfsAction(): Promise<{
  entitySets: string[];
  geoRelated: string[];
  error?: string;
  sessionExpired?: boolean;
}> {
  try {
    return await withValidIfsSession(async (session) => {
      try {
        const entitySets = await listCempPortalEntitySets(session.accessToken);
        const geoRelated = entitySets.filter((n) =>
          /country|state|city|county|region|address|iso|zip|geo/i.test(n),
        );
        return { entitySets, geoRelated };
      } catch (err) {
        return {
          entitySets: [],
          geoRelated: [],
          error: formatIfsError(err),
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        entitySets: [],
        geoRelated: [],
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      entitySets: [],
      geoRelated: [],
      error: formatIfsError(err),
    };
  }
}

/** Destinos planos "País, Región, Municipio" para un solo input de búsqueda. */
export async function fetchDestinosAnticipoAction(): Promise<{
  destinos: DestinoSel[];
  fromIfs: boolean;
  projection?: string;
  error?: string;
  sessionExpired?: boolean;
}> {
  const local = flattenLocalDestinos();

  try {
    return await withValidIfsSession(async (session) => {
      try {
        const countries = await getIsoCountries(session.accessToken);
        const paisMap = new Map(
          mapIsoCountriesToDestinos(countries).map(
            (d) => [d.pCode.toUpperCase(), d.pais] as const,
          ),
        );

        // IFS geo solo para países prioritarios (evita cientos de llamadas).
        const priority = ["CO", "MX", "PE", "US"];
        const flat: DestinoSel[] = [];
        let projection: string | undefined;

        for (const code of priority) {
          const paisName =
            paisMap.get(code) || DEST_CATALOG[code]?.nombre || code;
          const states = await getGeoStates(session.accessToken, code);
          if (!states.options.length) continue;

          projection = states.projection ?? projection;
          const byRegion = new Map<string, GeoOption[]>();

          // Limitar regiones en paralelo (máx. 12) para no saturar IFS
          const regions = states.options.slice(0, 40);
          await Promise.all(
            regions.map(async (region) => {
              const mun = await getGeoMunicipalities(
                session.accessToken,
                code,
                region.code,
              );
              byRegion.set(region.code, mun.options);
              if (mun.projection) projection = mun.projection;
            }),
          );

          flat.push(
            ...flattenGeoDestinos(code, paisName, regions, byRegion),
          );
        }

        const merged = flattenLocalDestinos(paisMap);
        if (flat.length) {
          const keys = new Set(flat.map((d) => d.label.toLowerCase()));
          for (const d of merged) {
            if (!keys.has(d.label.toLowerCase())) flat.push(d);
          }
          return {
            destinos: flat.sort((a, b) =>
              a.label.localeCompare(b.label, "es"),
            ),
            fromIfs: true,
            projection,
          };
        }

        return {
          destinos: merged,
          fromIfs: false,
          error:
            "Portal sin State/City — catálogo local con nombres de país IFS",
        };
      } catch (err) {
        return {
          destinos: local,
          fromIfs: false,
          error: formatIfsError(err),
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        destinos: local,
        fromIfs: false,
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      destinos: local,
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}
