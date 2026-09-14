"use server";

import {
  cloneInitialDocumentos,
  EMPRESAS_DS,
  findDuplicado,
  SESSION_DS,
  type DocumentoSoporte,
  type GuardarDocumentoSoporteInput,
} from "@/src/lib/documento-soporte-mock";
import { getEmployeesByCompany, getUserInfo } from "@/src/lib/ifs/cemp-portal";
import {
  attachDseFile,
  createDseRequest,
  getDsePersonName,
  getDseRequest,
  dseStateLiteral,
  listDseCompanies,
  listDseCurrencyCodes,
  listDseEmployees,
  listDseProjects,
  listDseRequests,
  searchDseSuppliers,
  updateDseRequest,
  type CDseRequest,
  type CDseSupplier,
  type DseCurrencyCode,
  type DseLovCompany,
  type DseLovEmployee,
} from "@/src/lib/ifs/cemp-dse";
import {
  currencyPrefix,
  type DivisaOption,
} from "@/src/lib/anticipos-ifs-catalog";
import { DIVISAS_POR_COMPANIA } from "@/src/lib/anticipos-catalog";
import { resolveCurrencyDecimals } from "@/src/lib/ifs/currency-codes-handling";
import { odataStringKey } from "@/src/lib/ifs/client";
import { isIfsAuthEnabled } from "@/src/lib/ifs/config";
import {
  requestToDocumento,
  toCDseRequestInsert,
  toCDseRequestPatch,
} from "@/src/lib/ifs/dse-ifs-map";
import { formatIfsError, IfsApiError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import { openPortalSession } from "@/src/server/portal-actor";

type DseActor = {
  fromIfs: boolean;
  ids: string[];
  nombre: string;
  empNo: string;
  companyId: string;
  personId: string;
  accessToken?: string;
};

function mockActor(): DseActor {
  return {
    fromIfs: false,
    ids: [SESSION_DS.id],
    nombre: SESSION_DS.nombre,
    empNo: SESSION_DS.id,
    companyId: "HMVINGCO",
    personId: SESSION_DS.id,
  };
}

function employeeNeedlesMatch(
  employee: {
    EmpNo?: string;
    CEmpNo?: string;
    PersonId?: string;
    Identity?: string;
  },
  needles: string[],
): boolean {
  const wanted = new Set(
    needles.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  if (!wanted.size) return false;
  return [employee.EmpNo, employee.CEmpNo, employee.PersonId, employee.Identity]
    .map((v) => (v || "").trim().toLowerCase())
    .some((key) => Boolean(key) && wanted.has(key));
}

/** EmpNo de `ActiveEmployees` DSE — nunca PersonId (p. ej. JCORREA). */
async function lookupCompanyEmpNo(
  accessToken: string,
  company: string,
  needles: string[],
): Promise<string> {
  if (!company.trim()) return "";
  const employees = await listDseEmployees(accessToken, company);
  const match = employees.find((e) => employeeNeedlesMatch(e, needles));
  return match?.EmpNo?.trim() || "";
}

async function resolveActor(): Promise<DseActor> {
  try {
    return await withValidIfsSession(async (session) => {
      try {
        const ifs = await openPortalSession(session.email, session.accessToken);
        const info = await getUserInfo(ifs);
        let empNo = (info.EmpNo || ifs.user.EmpId || "").trim();
        let personId = (info.PersonId || "").trim();
        const companyId = (info.CompanyId || ifs.user.CompanyId || "").trim();

        if (companyId) {
          try {
            const employees = await getEmployeesByCompany(
              session.accessToken,
              companyId,
            );
            const match = employees.find((e) =>
              employeeNeedlesMatch(e, [empNo, personId]),
            );
            if (match?.CEmpNo?.trim()) empNo = match.CEmpNo.trim();
            personId =
              personId ||
              match?.PersonId?.trim() ||
              match?.Identity?.trim() ||
              "";
          } catch {
            /* best-effort */
          }
        }

        const ids = [
          ...new Set(
            [empNo, personId, empNo.replace(/\D/g, ""), personId.replace(/\D/g, "")]
              .map((v) => v.trim())
              .filter(Boolean),
          ),
        ];
        return {
          fromIfs: true,
          ids: ids.length ? ids : [session.email],
          nombre: (info.EmpName || session.email).trim(),
          empNo,
          companyId,
          personId: personId || empNo,
          accessToken: session.accessToken,
        };
      } catch {
        return {
          fromIfs: true,
          ids: [session.email],
          nombre: session.email,
          empNo: "",
          companyId: "",
          personId: "",
          accessToken: session.accessToken,
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) return mockActor();
    if (err instanceof IfsApiError && err.status === 401) return mockActor();
    return mockActor();
  }
}

function requestNoOf(no: string): number | null {
  const n = Number(String(no).replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function odataOr(clauses: string[]): string {
  return clauses.filter(Boolean).join(" or ");
}

function idMatches(value: string, id: string): boolean {
  const a = value.trim().toLowerCase();
  const b = id.trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  const da = a.replace(/\D/g, "");
  const db = b.replace(/\D/g, "");
  return Boolean(da && db && da === db);
}

async function enrichNames(
  accessToken: string,
  rows: CDseRequest[],
): Promise<Map<string, string>> {
  const cache = new Map<string, string>();
  const seen = new Set<string>();
  for (const row of rows) {
    const empNo = row.EmpNo?.trim() || "";
    const company = row.EmpCompany?.trim() || row.Company?.trim() || "";
    const key = `${company}|${empNo}`;
    if (!empNo || seen.has(key)) continue;
    seen.add(key);
    const info = await getDsePersonName(accessToken, company, empNo);
    if (info?.name) cache.set(empNo, info.name);
  }
  return cache;
}

async function enrichProjects(
  accessToken: string,
): Promise<Map<string, string>> {
  const cache = new Map<string, string>();
  try {
    const projects = await listDseProjects(accessToken);
    for (const p of projects) {
      const id = p.ProjectId?.trim();
      if (!id) continue;
      const nombre = (p.Name || p.Description || "").trim();
      if (nombre) cache.set(id, nombre);
    }
  } catch {
    /* best-effort */
  }
  return cache;
}

function visibleForActor(d: DocumentoSoporte, actor: DseActor): boolean {
  return actor.ids.some(
    (id) => idMatches(d.solicitadoPorId, id) || idMatches(d.registradoPorId, id),
  );
}

export async function listMisDocumentosSoporteAction(): Promise<{
  documentos: Record<string, DocumentoSoporte>;
  sessionIds: string[];
  sessionEmpNo: string;
  sessionNombre: string;
  fromIfs: boolean;
}> {
  const actor = await resolveActor();

  if (isIfsAuthEnabled() && (!actor.fromIfs || !actor.accessToken)) {
    return {
      documentos: {},
      sessionIds: actor.ids,
      sessionEmpNo: actor.empNo,
      sessionNombre: actor.nombre,
      fromIfs: false,
    };
  }

  if (actor.fromIfs && actor.accessToken) {
    const clauses: string[] = [];
    if (actor.empNo) clauses.push(`EmpNo eq '${odataStringKey(actor.empNo)}'`);
    if (actor.personId) {
      clauses.push(`RegisteredBy eq '${odataStringKey(actor.personId)}'`);
    }
    if (actor.empNo && actor.empNo !== actor.personId) {
      clauses.push(`RegisteredBy eq '${odataStringKey(actor.empNo)}'`);
    }
    const filter = odataOr(clauses);
    if (!filter) {
      return {
        documentos: {},
        sessionIds: actor.ids,
        sessionEmpNo: actor.empNo,
        sessionNombre: actor.nombre,
        fromIfs: true,
      };
    }
    try {
      const rows = await listDseRequests(
        actor.accessToken,
        filter || undefined,
      );
      const names = await enrichNames(actor.accessToken, rows);
      const projects = await enrichProjects(actor.accessToken);
      const documentos: Record<string, DocumentoSoporte> = {};
      for (const row of rows) {
        const mapped = requestToDocumento(row, {
          emp: names.get(row.EmpNo || ""),
          company: row.Company,
          project: row.Project ? projects.get(row.Project) : undefined,
        });
        if (!mapped.no) continue;
        if (!visibleForActor(mapped, actor)) continue;
        documentos[mapped.no] = mapped;
      }
      return {
        documentos,
        sessionIds: actor.ids,
        sessionEmpNo: actor.empNo,
        sessionNombre: actor.nombre,
        fromIfs: true,
      };
    } catch (err) {
      throw new Error(formatIfsError(err));
    }
  }

  return {
    documentos: cloneInitialDocumentos(),
    sessionIds: [SESSION_DS.id],
    sessionEmpNo: SESSION_DS.id,
    sessionNombre: SESSION_DS.nombre,
    fromIfs: false,
  };
}

export async function guardarDocumentoSoporteAction(
  input: GuardarDocumentoSoporteInput,
  editNo?: string,
): Promise<{ ok: true; codigo: string } | { ok: false; error: string }> {
  const actor = await resolveActor();

  if (isIfsAuthEnabled() && (!actor.fromIfs || !actor.accessToken)) {
    return {
      ok: false,
      error: "No hay sesión IFS. Inicia sesión para enviar el DSE.",
    };
  }

  if (actor.fromIfs && actor.accessToken) {
    try {
      const nif = input.nif.replace(/\s+/g, "");
      const org = input.noDocumentoOriginal.trim();
      const dupFilter =
        `Nif eq '${odataStringKey(nif)}' and OrgDocNo eq '${odataStringKey(org)}'` +
        ` and Objstate ne ${dseStateLiteral("Cancelled")}` +
        ` and Objstate ne ${dseStateLiteral("Rejected")}`;
      const dups = await listDseRequests(actor.accessToken, dupFilter);
      const editNum = editNo ? requestNoOf(editNo) : null;
      const dup = dups.find((row) => row.RequestNo !== editNum);
      if (dup?.RequestNo != null) {
        return {
          ok: false,
          error: `El documento No. ${org} del proveedor ${nif} ya se encuentra registrado con la Solicitud ${dup.RequestNo}. No es posible crear una solicitud duplicada.`,
        };
      }

      if (editNo) {
        const no = requestNoOf(editNo);
        if (!no) return { ok: false, error: "Solicitud no encontrada" };
        const current = await getDseRequest(actor.accessToken, no);
        const mapped = requestToDocumento(current);
        if (!mapped.editable) {
          return {
            ok: false,
            error: "Solo se pueden editar solicitudes en estado Lanzado",
          };
        }
        const updated = await updateDseRequest(
          actor.accessToken,
          no,
          toCDseRequestPatch(input),
          current["@odata.etag"],
        );
        if (input.adjuntoBase64 && input.adjunto?.nombre) {
          try {
            await attachDseFile(
              actor.accessToken,
              no,
              input.adjunto.nombre.slice(0, 50),
              input.adjuntoBase64,
            );
          } catch (err) {
            console.warn("[dse] attach file failed", formatIfsError(err));
          }
        }
        return { ok: true, codigo: String(updated.RequestNo ?? no) };
      }

      const body = toCDseRequestInsert(input, {
        personId: actor.personId,
        empNo: actor.empNo,
        companyId: actor.companyId,
      });
      try {
        const resolvedEmpNo = await lookupCompanyEmpNo(
          actor.accessToken,
          body.EmpCompany || body.Company,
          [body.EmpNo, input.solicitadoPorId, actor.empNo, actor.personId],
        );
        if (!resolvedEmpNo) {
          return {
            ok: false,
            error:
              "Ese empleado no existe en la empresa IFS. Revisa la compañía o elige otro beneficiario.",
          };
        }
        body.EmpNo = resolvedEmpNo.slice(0, 10);
      } catch (err) {
        return { ok: false, error: formatIfsError(err) };
      }
      const missing: string[] = (
        [
          ["Company", body.Company],
          ["EmpCompany", body.EmpCompany],
          ["EmpNo", body.EmpNo],
          ["RegisteredBy", body.RegisteredBy],
          ["Nif", body.Nif],
          ["OrgDocNo", body.OrgDocNo],
          ["DocDate", body.DocDate],
          ["CurrencyCode", body.CurrencyCode],
          ["Description", body.Description],
        ] as const
      )
        .filter(([, value]) => !String(value || "").trim())
        .map(([key]) => key);
      if (!body.Amount) missing.push("Amount");
      if (missing.length) {
        return {
          ok: false,
          error: `Faltan datos para IFS: ${missing.join(", ")}`,
        };
      }

      const { FileData, ...withoutFile } = body;
      const created = await createDseRequest(actor.accessToken, withoutFile);
      const no = created.RequestNo;
      if (!no) {
        return {
          ok: false,
          error: "IFS creó la solicitud pero no devolvió RequestNo",
        };
      }
      if (FileData && body.FileName) {
        try {
          await attachDseFile(actor.accessToken, no, body.FileName, FileData);
        } catch (err) {
          console.warn("[dse] attach file failed", formatIfsError(err));
        }
      }
      return { ok: true, codigo: String(no) };
    } catch (err) {
      return { ok: false, error: formatIfsError(err) };
    }
  }

  const dup = findDuplicado(
    cloneInitialDocumentos(),
    input.nif,
    input.noDocumentoOriginal,
    editNo,
  );
  if (dup) {
    return {
      ok: false,
      error: `El documento No. ${input.noDocumentoOriginal.trim()} del proveedor ${input.nif} ya se encuentra registrado con la Solicitud ${dup.no}.`,
    };
  }
  return { ok: false, error: "Sin sesión IFS; no se puede guardar el DSE." };
}

export type DseSupplierMatch = {
  nif: string;
  vendorNo: string;
  nombre: string;
};

function mapSupplierMatches(
  rows: CDseSupplier[],
  typedNif: string,
): DseSupplierMatch[] {
  const seen = new Set<string>();
  const out: DseSupplierMatch[] = [];
  for (const row of rows) {
    const vendorNo = row.VendorNo?.trim() || "";
    const nombre = row.VendorName?.trim() || "";
    const nif = (row.AssociationNo || typedNif).replace(/\s+/g, "").trim();
    const key = `${vendorNo}|${nif}|${nombre}`.toLowerCase();
    if (!vendorNo && !nombre) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ nif: nif || vendorNo, vendorNo, nombre: nombre || vendorNo });
  }
  return out;
}

export async function lookupNifDseAction(
  company: string,
  nif: string,
): Promise<{ found: boolean; matches: DseSupplierMatch[] }> {
  const actor = await resolveActor();
  const typed = nif.replace(/\s+/g, "").trim();
  if (!actor.accessToken || !company.trim() || typed.length < 3) {
    return { found: false, matches: [] };
  }
  try {
    const rows = await searchDseSuppliers(
      actor.accessToken,
      company.trim(),
      typed,
    );
    const matches = mapSupplierMatches(rows, typed);
    return { found: matches.length > 0, matches };
  } catch {
    return { found: false, matches: [] };
  }
}

function uniqueProjects(
  rows: { ProjectId?: string; Name?: string; Description?: string }[],
): { id: string; nombre: string }[] {
  const seen = new Map<string, { id: string; nombre: string }>();
  for (const row of rows) {
    const id = row.ProjectId?.trim();
    if (!id || seen.has(id)) continue;
    seen.set(id, {
      id,
      nombre: row.Name?.trim() || row.Description?.trim() || id,
    });
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id, "es"));
}

export async function fetchDseProjectsAction(): Promise<{
  proyectos: { id: string; nombre: string }[];
  fromIfs: boolean;
  error?: string;
}> {
  const actor = await resolveActor();
  if (!actor.accessToken) {
    return { proyectos: [], fromIfs: false };
  }
  try {
    const rows = await listDseProjects(actor.accessToken);
    return { proyectos: uniqueProjects(rows), fromIfs: true };
  } catch (err) {
    return { proyectos: [], fromIfs: false, error: formatIfsError(err) };
  }
}

function fallbackDseCompanias(): { id: string; label: string }[] {
  return EMPRESAS_DS.map((c) => ({ id: c.id, label: c.label }));
}

function mapDseCompanies(rows: DseLovCompany[]): { id: string; label: string }[] {
  const seen = new Set<string>();
  const out: { id: string; label: string }[] = [];
  for (const row of rows) {
    const id = row.CompanyId?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = row.CompanyName?.trim();
    const country = row.Country?.trim() || row.CountryCode?.trim();
    const label = name
      ? country && country !== name
        ? `${id} – ${name} (${country})`
        : `${id} – ${name}`
      : id;
    out.push({ id, label });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id, "es"));
}

export type DseEmpleadoOption = {
  id: string;
  nombre: string;
  sub: string;
  empNo: string;
};

function mapDseEmployees(rows: DseLovEmployee[]): DseEmpleadoOption[] {
  const seen = new Set<string>();
  const out: DseEmpleadoOption[] = [];
  for (const row of rows) {
    const empNo = row.EmpNo?.trim();
    if (!empNo || seen.has(empNo)) continue;
    seen.add(empNo);
    const nombre =
      row.InternalDisplayName?.trim() || row.EmployeeName?.trim() || empNo;
    out.push({
      id: empNo,
      nombre,
      sub: empNo,
      empNo,
    });
  }
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Empresa de sesión + LOV `Reference_LovPersonCompany` (no GetExpenseCompany). */
export async function fetchDseFormBootstrapAction(): Promise<{
  companyId: string;
  companyName: string;
  companias: { id: string; label: string }[];
  fromIfs: boolean;
  error?: string;
}> {
  const fallback = fallbackDseCompanias();
  const actor = await resolveActor();
  if (!actor.accessToken) {
    return {
      companyId: actor.companyId || fallback[0]?.id || "HMVINGCO",
      companyName: actor.companyId || fallback[0]?.label || "HMVINGCO",
      companias: fallback,
      fromIfs: false,
    };
  }

  try {
    const rows = await listDseCompanies(actor.accessToken);
    const companias = mapDseCompanies(rows);
    const companyId = actor.companyId || companias[0]?.id || fallback[0]?.id || "";
    const companyName =
      companias.find((c) => c.id === companyId)?.label ||
      actor.companyId ||
      companyId;
    return {
      companyId,
      companyName,
      companias: companias.length ? companias : fallback,
      fromIfs: Boolean(companias.length),
    };
  } catch (err) {
    return {
      companyId: actor.companyId || fallback[0]?.id || "HMVINGCO",
      companyName: actor.companyId || fallback[0]?.label || "HMVINGCO",
      companias: fallback,
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}

export async function fetchDseEmpleadosAction(companyId: string): Promise<{
  empleados: DseEmpleadoOption[];
  fromIfs: boolean;
  error?: string;
}> {
  const company = companyId.trim();
  if (!company) {
    return { empleados: [], fromIfs: false, error: "Sin compañía" };
  }

  const actor = await resolveActor();
  if (!actor.accessToken) {
    return { empleados: [], fromIfs: false };
  }

  try {
    const rows = await listDseEmployees(actor.accessToken, company);
    return { empleados: mapDseEmployees(rows), fromIfs: true };
  } catch (err) {
    return {
      empleados: [],
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}

function fallbackDseDivisas(company: string): DivisaOption[] {
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

function mapDseCurrencyRows(rows: DseCurrencyCode[]): DivisaOption[] {
  const seen = new Set<string>();
  const out: DivisaOption[] = [];
  for (const row of rows) {
    const code = row.CurrencyCode?.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const desc = row.Description?.trim();
    const decimals = resolveCurrencyDecimals({
      CurrencyRounding: row.CurrencyRounding,
    });
    out.push({
      code,
      label: desc ? `${code} – ${desc}` : code,
      pre: currencyPrefix(code),
      decimals,
      roundingFromIfs: decimals != null,
    });
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

/** Divisas de `CDseRequestHandling.Reference_CurrencyCode` por empresa del beneficiario. */
export async function fetchDseDivisasAction(companyId: string): Promise<{
  divisas: DivisaOption[];
  fromIfs: boolean;
  roundingFromIfs?: boolean;
  error?: string;
}> {
  const company = companyId.trim();
  const fallback = fallbackDseDivisas(company || "HMVINGCO");
  if (!company) {
    return { divisas: fallback, fromIfs: false, error: "Sin compañía" };
  }

  const actor = await resolveActor();
  if (!actor.accessToken) {
    return { divisas: fallback, fromIfs: false };
  }

  try {
    const rows = await listDseCurrencyCodes(actor.accessToken, company);
    const divisas = mapDseCurrencyRows(rows);
    if (!divisas.length) {
      return {
        divisas: fallback,
        fromIfs: false,
        error: `Sin divisas IFS DSE para ${company}`,
      };
    }
    return {
      divisas,
      fromIfs: true,
      roundingFromIfs: divisas.some((d) => d.roundingFromIfs),
    };
  } catch (err) {
    return {
      divisas: fallback,
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}
