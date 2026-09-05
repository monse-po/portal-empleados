"use server";

import {
  getBankDetails,
  getCompanies,
  getCurrencyCodes,
  getExpenseCompanies,
  getIsoCountries,
  getProjectsByCompany,
  getUserInfo,
  resolvePersonDisplayName,
} from "@/src/lib/ifs/cemp-portal";
import { openPortalActor } from "@/src/server/portal-actor";
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
  looksLikeGeoCode,
  mapAdvanceCityCodesToDestinos,
  mapCurrencyCodesToDivisas,
  mapIsoCountriesToDestinos,
  mergeCurrencyRounding,
  type DivisaOption,
} from "@/src/lib/anticipos-ifs-catalog";
import { listAdvanceCityCodes } from "@/src/lib/ifs/cemp-advance";
import { mapIfsBank } from "@/src/lib/ifs/anticipos-catalog";
import type { DestinoSel } from "@/src/lib/anticipos-catalog";
import {
  DEST_CATALOG,
  DIVISAS_POR_COMPANIA,
} from "@/src/lib/anticipos-catalog";
import { getCompanyCurrencyFormats } from "@/src/lib/ifs/currency-codes-handling";

/** Proyecto de GetProjects(Company) para el form Employee Advances. */
export type AnticiposProyectoOption = {
  id: string;
  nombre: string;
  companyId: string;
  /** PersonId / Identity del Manager en IFS (p. ej. JCORREA). */
  managerCode: string | null;
};

export type AnticiposFormBootstrap = {
  companyId: string;
  companyName: string;
  empNo: string;
  empName: string;
  /** PersonId / Identity IFS (CreatedBy / GetYourRequests). */
  personId: string;
  /** SupplierId para GetExpenseCompany / CEmpAdvances. */
  supplierId: string;
  companiasGasto: { id: string; label: string }[];
  proyectos: AnticiposProyectoOption[];
  divisas: DivisaOption[];
  banco: string;
  tipoCuenta: string;
  cuenta: string;
  cuentaLabel: string;
};

function fallbackDivisas(company: string): DivisaOption[] {
  return (DIVISAS_POR_COMPANIA[company] || DIVISAS_POR_COMPANIA.HMVINGCO).map(
    (d) => ({
      code: d.code,
      label: d.label,
      pre: d.pre,
      decimals: null,
      roundingFromIfs: false,
    }),
  );
}

function formatCuentaLabel(bank: {
  banco: string;
  tipo: string;
  cuenta: string;
}): string {
  if (!bank.cuenta) return "";
  const raw = bank.cuenta.replace(/[\s-]/g, "");
  const masked =
    raw.length > 4 ? `${"•".repeat(raw.length - 4)}${raw.slice(-4)}` : raw;
  const bits = [bank.banco, bank.tipo, masked].filter(Boolean);
  return bits.join(" · ");
}

async function loadCompanyBundle(
  accessToken: string,
  companyId: string,
  empNo: string,
): Promise<{
  proyectos: AnticiposProyectoOption[];
  divisas: DivisaOption[];
  banco: string;
  tipoCuenta: string;
  cuenta: string;
  cuentaLabel: string;
}> {
  const company = companyId.trim();
  const [projectsSettled, currenciesSettled, bankSettled, roundingSettled] =
    await Promise.allSettled([
      getProjectsByCompany(accessToken, company),
      getCurrencyCodes(accessToken, company),
      empNo
        ? getBankDetails(accessToken, company, empNo)
        : Promise.resolve([]),
      getCompanyCurrencyFormats(accessToken, company),
    ]);

  const proyectos: AnticiposProyectoOption[] = [];
  if (projectsSettled.status === "fulfilled") {
    for (const row of projectsSettled.value) {
      const id = row.ProjectId?.trim();
      if (!id) continue;
      proyectos.push({
        id,
        nombre: row.Name?.trim() || row.Description?.trim() || id,
        companyId: row.Company?.trim() || company,
        managerCode: row.Manager?.trim() || null,
      });
    }
    proyectos.sort((a, b) => a.id.localeCompare(b.id, "es"));
  }

  let divisas = fallbackDivisas(company);
  if (currenciesSettled.status === "fulfilled") {
    const mapped = mapCurrencyCodesToDivisas(currenciesSettled.value);
    if (mapped.length) divisas = mapped;
  }
  if (roundingSettled.status === "fulfilled" && roundingSettled.value.formats.length) {
    divisas = mergeCurrencyRounding(divisas, roundingSettled.value.formats);
  }

  const bank =
    bankSettled.status === "fulfilled"
      ? mapIfsBank(bankSettled.value)
      : { banco: "", tipo: "", cuenta: "" };

  return {
    proyectos,
    divisas,
    banco: bank.banco,
    tipoCuenta: bank.tipo,
    cuenta: bank.cuenta,
    cuentaLabel: formatCuentaLabel(bank),
  };
}

/**
 * Bootstrap del formulario Anticipos = catálogos de la ventana Employee Advances:
 * GetExpenseCompany / CompanySet, GetProjects, GetCurrencyCodes, GetBankDetails.
 * Una sola sesión IFS; no usa GetValidEmpPrjAct (eso es Tiempo).
 */
export async function fetchAnticiposFormBootstrapAction(): Promise<{
  catalog: AnticiposFormBootstrap | null;
  fromIfs: boolean;
  error?: string;
  sessionExpired?: boolean;
}> {
  try {
    return await withValidIfsSession(async (session) => {
      try {
        const portal = await openPortalActor(
          session.email,
          session.accessToken,
        );
        const info = await getUserInfo(portal);
        const companyId =
          info.CompanyId?.trim() || portal.user.CompanyId?.trim() || "";
        const empNo = info.EmpNo?.trim() || portal.user.EmpId?.trim() || "";
        const empName = info.EmpName?.trim() || "";
        const companyName = info.CompanyName?.trim() || companyId;
        let personId = info.PersonId?.trim() || "";
        let supplierId = info.SupplierId?.trim() || "";

        // Completar PersonId / SupplierId desde GetEmployees si GetUserInfo no los trae.
        if (companyId && empNo && (!personId || !supplierId)) {
          try {
            const { getEmployeesByCompany } = await import(
              "@/src/lib/ifs/cemp-portal"
            );
            const employees = await getEmployeesByCompany(
              session.accessToken,
              companyId,
            );
            const match = employees.find(
              (e) =>
                e.CEmpNo?.trim() === empNo ||
                e.PersonId?.trim() === empNo ||
                e.Identity?.trim() === empNo,
            );
            if (match) {
              personId =
                personId ||
                match.PersonId?.trim() ||
                match.Identity?.trim() ||
                "";
              // Identity = proveedor vinculado; CEmpNo solo como último respaldo.
              supplierId =
                supplierId ||
                match.Identity?.trim() ||
                match.CEmpNo?.trim() ||
                empNo;
            }
          } catch {
            /* best-effort */
          }
        }
        if (!supplierId) supplierId = empNo;
        if (!personId) personId = empNo;

        if (!companyId) {
          return {
            catalog: null,
            fromIfs: false,
            error: "IFS no devolvió compañía para el empleado",
          };
        }

        let companiasGasto: { id: string; label: string }[] = [];
        try {
          const expense = supplierId
            ? await getExpenseCompanies(session.accessToken, supplierId)
            : [];
          companiasGasto = expense
            .map((c) => {
              const id = c.Company?.trim();
              if (!id) return null;
              const name = c.Name?.trim();
              return { id, label: name ? `${id} – ${name}` : id };
            })
            .filter((c): c is { id: string; label: string } => Boolean(c));
        } catch {
          /* fallback CompanySet abajo */
        }

        if (!companiasGasto.length) {
          try {
            const all = await getCompanies(session.accessToken);
            companiasGasto = all
              .map((c) => {
                const id = c.Company?.trim();
                if (!id) return null;
                const name = c.Name?.trim();
                return { id, label: name ? `${id} – ${name}` : id };
              })
              .filter((c): c is { id: string; label: string } => Boolean(c));
          } catch {
            companiasGasto = [
              {
                id: companyId,
                label: companyName
                  ? `${companyId} – ${companyName}`
                  : companyId,
              },
            ];
          }
        }

        if (!companiasGasto.some((c) => c.id === companyId)) {
          companiasGasto = [
            {
              id: companyId,
              label: companyName ? `${companyId} – ${companyName}` : companyId,
            },
            ...companiasGasto,
          ];
        }

        const bundle = await loadCompanyBundle(
          session.accessToken,
          companyId,
          empNo,
        );

        return {
          catalog: {
            companyId,
            companyName,
            empNo,
            empName,
            personId,
            supplierId,
            companiasGasto,
            ...bundle,
          },
          fromIfs: true,
        };
      } catch (err) {
        return {
          catalog: null,
          fromIfs: false,
          error: formatIfsError(err),
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        catalog: null,
        fromIfs: false,
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      catalog: null,
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}

/** Recarga proyectos + divisas + banco al cambiar compañía de gasto. */
export async function fetchAnticiposCompanyBundleAction(
  companyId: string,
  empNo: string,
): Promise<{
  proyectos: AnticiposProyectoOption[];
  divisas: DivisaOption[];
  banco: string;
  tipoCuenta: string;
  cuenta: string;
  cuentaLabel: string;
  fromIfs: boolean;
  error?: string;
  sessionExpired?: boolean;
}> {
  const company = companyId.trim();
  const empty = {
    proyectos: [] as AnticiposProyectoOption[],
    divisas: fallbackDivisas(company || "HMVINGCO"),
    banco: "",
    tipoCuenta: "",
    cuenta: "",
    cuentaLabel: "",
    fromIfs: false,
  };
  if (!company) {
    return { ...empty, error: "Sin compañía" };
  }

  try {
    return await withValidIfsSession(async (session) => {
      try {
        const bundle = await loadCompanyBundle(
          session.accessToken,
          company,
          empNo.trim(),
        );
        return { ...bundle, fromIfs: true };
      } catch (err) {
        return { ...empty, error: formatIfsError(err) };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return { ...empty, sessionExpired: true, error: err.message };
    }
    return { ...empty, error: formatIfsError(err) };
  }
}

/** Resuelve Manager (PersonId) → nombre para el campo Aprobador. */
export async function resolveAnticipoAprobadorAction(input: {
  managerCode: string;
  companyId?: string;
}): Promise<{
  aprobador: string | null;
  error?: string;
  sessionExpired?: boolean;
}> {
  const code = input.managerCode.trim();
  if (!code) return { aprobador: null };

  try {
    return await withValidIfsSession(async (session) => {
      try {
        const name = await resolvePersonDisplayName(
          session.accessToken,
          code,
          input.companyId,
        );
        return { aprobador: name || code };
      } catch (err) {
        return { aprobador: code, error: formatIfsError(err) };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return { aprobador: code, sessionExpired: true, error: err.message };
    }
    return { aprobador: code, error: formatIfsError(err) };
  }
}

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
        const isoByCode = new Map<string, (typeof countries)[number]>();
        for (const row of countries) {
          const code = row.Id?.trim().toUpperCase();
          if (code) isoByCode.set(code, row);
        }

        try {
          const cityCodes = await listAdvanceCityCodes(session.accessToken);
          console.info("[anticipos] CityCodeSet", {
            raw: cityCodes.length,
          });
          const countryCodes = [
            ...new Set(
              cityCodes
                .map((row) => row.CountryCode?.trim().toUpperCase() || "")
                .filter(Boolean),
            ),
          ].slice(0, 12);
          const stateNames = new Map<string, string>();
          await Promise.all(
            countryCodes.map(async (country) => {
              const states = await getGeoStates(session.accessToken, country);
              for (const state of states.options) {
                const code = state.code.trim().toUpperCase();
                const name = state.name.trim();
                if (!code || !name || looksLikeGeoCode(name)) continue;
                stateNames.set(`${country}|${code}`, name);
                if (/^\d+$/.test(code)) {
                  stateNames.set(
                    `${country}|${code.replace(/^0+/, "") || "0"}`,
                    name,
                  );
                  stateNames.set(`${country}|${code.padStart(2, "0")}`, name);
                }
              }
            }),
          );
          const fromLov = mapAdvanceCityCodesToDestinos(
            cityCodes,
            paisMap,
            isoByCode,
            stateNames,
          );
          console.info("[anticipos] destinos mapeados", fromLov.length, {
            sample: fromLov.slice(0, 4).map((d) => d.label),
          });
          if (fromLov.length) {
            return {
              destinos: fromLov,
              fromIfs: true,
              projection: "CEmpAdvanceHandling.CityCodeSet",
            };
          }
        } catch (err) {
          console.error("[anticipos] CityCodeSet failed", err);
        }

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
