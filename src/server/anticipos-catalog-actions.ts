"use server";

import {
  getBankDetails,
  getCompanies,
  getCurrencyCodes,
  getEmployeesByCompany,
  getExpenseCompanies,
  getProjectInfo,
  getProjectsByCompany,
  getUserInfo,
  openCempPortalSession,
} from "@/src/lib/ifs/cemp-portal";
import { formatIfsError, IfsApiError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import {
  companyLabel,
  mapIfsBank,
  mapIfsCompanyToLov,
  mapIfsCurrency,
  mapIfsEmployee,
  mapIfsProjectToLov,
  mergeCompanyLovs,
  type AnticiposDivisaOption,
  type AnticiposIfsProfile,
} from "@/src/lib/ifs/anticipos-catalog";
import type { EmpleadoAnticipo, LovItem } from "@/src/lib/mis-anticipos-mock";

function expiredOrError(err: unknown): {
  sessionExpired?: boolean;
  error: string;
} {
  if (err instanceof IfsSessionExpiredError) {
    return { sessionExpired: true, error: err.message };
  }
  return { error: formatIfsError(err) };
}

export async function fetchAnticiposBootstrapAction(): Promise<{
  connected: boolean;
  sessionExpired?: boolean;
  error?: string;
  profile?: AnticiposIfsProfile;
  companies: LovItem[];
}> {
  try {
    return await withValidIfsSession(async (session) => {
      let ifs;
      try {
        ifs = await openCempPortalSession(session.email, session.accessToken);
      } catch (err) {
        if (err instanceof IfsApiError && err.status === 401) throw err;
        return {
          connected: false,
          companies: [],
          error: `CEmpPortalUserSet (${session.email}): ${formatIfsError(err)}`,
        };
      }

      const info = await getUserInfo(ifs);
      const companyId = (info.CompanyId || ifs.user.CompanyId || "").trim();
      const empNo = (info.EmpNo || ifs.user.EmpId || "").trim();
      const companyName = (info.CompanyName || companyId).trim();

      const [companiesRaw, bankRaw, expenseRaw] = await Promise.all([
        getCompanies(session.accessToken).catch(() => []),
        empNo && companyId
          ? getBankDetails(session.accessToken, companyId, empNo).catch(() => [])
          : Promise.resolve([]),
        info.SupplierId?.trim()
          ? getExpenseCompanies(session.accessToken, info.SupplierId.trim()).catch(
              () => [],
            )
          : Promise.resolve([]),
      ]);

      const companies = mergeCompanyLovs([
        companyId
          ? { id: companyId, nombre: companyName, sub: companyId }
          : null,
        ...companiesRaw.map(mapIfsCompanyToLov),
        ...expenseRaw.map(mapIfsCompanyToLov),
      ]);

      const bank = mapIfsBank(bankRaw);
      const companiasGasto = mergeCompanyLovs([
        companyId
          ? { id: companyId, nombre: companyName, sub: companyId }
          : null,
        ...expenseRaw.map(mapIfsCompanyToLov),
      ]).map((c) => ({
        id: c.id,
        label: c.nombre ? `${c.id} – ${c.nombre}` : c.id,
      }));

      const profile: AnticiposIfsProfile = {
        empNo,
        empName: (info.EmpName || "").trim() || session.email,
        companyId,
        companyName,
        personId: (info.PersonId || empNo).trim(),
        supplierId: info.SupplierId?.trim(),
        banco: bank.banco,
        tipoCuenta: bank.tipo,
        cuenta: bank.cuenta,
        companiasGasto:
          companiasGasto.length > 0
            ? companiasGasto
            : companyId
              ? [{ id: companyId, label: companyLabel({ Company: companyId, Name: companyName }) }]
              : [],
      };

      return { connected: true, profile, companies };
    });
  } catch (err) {
    const extra = expiredOrError(err);
    return { connected: false, companies: [], ...extra };
  }
}

export async function fetchAnticiposEmployeesAction(companyId: string): Promise<{
  employees: EmpleadoAnticipo[];
  error?: string;
  sessionExpired?: boolean;
}> {
  const company = companyId.trim();
  if (!company) return { employees: [] };
  try {
    return await withValidIfsSession(async (session) => {
      const rows = await getEmployeesByCompany(session.accessToken, company);
      const label =
        rows.find((r) => r.Company?.trim() === company)?.Company?.trim() ||
        company;
      const employees = rows
        .map((row) => mapIfsEmployee(row, label))
        .filter((e): e is EmpleadoAnticipo => e !== null);
      return { employees };
    });
  } catch (err) {
    return { employees: [], ...expiredOrError(err) };
  }
}

export async function fetchAnticiposProjectsAction(companyId: string): Promise<{
  projects: LovItem[];
  error?: string;
  sessionExpired?: boolean;
}> {
  const company = companyId.trim();
  if (!company) return { projects: [] };
  try {
    return await withValidIfsSession(async (session) => {
      const rows = await getProjectsByCompany(session.accessToken, company);
      const projects = rows
        .map(mapIfsProjectToLov)
        .filter((p): p is LovItem => p !== null);
      return { projects };
    });
  } catch (err) {
    return { projects: [], ...expiredOrError(err) };
  }
}

export async function fetchAnticiposCurrenciesAction(companyId: string): Promise<{
  currencies: AnticiposDivisaOption[];
  error?: string;
  sessionExpired?: boolean;
}> {
  const company = companyId.trim();
  if (!company) return { currencies: [] };
  try {
    return await withValidIfsSession(async (session) => {
      const rows = await getCurrencyCodes(session.accessToken, company);
      const currencies = rows
        .map(mapIfsCurrency)
        .filter((c): c is AnticiposDivisaOption => c !== null);
      return { currencies };
    });
  } catch (err) {
    return { currencies: [], ...expiredOrError(err) };
  }
}

export async function fetchAnticiposBankAction(input: {
  companyId: string;
  empNo: string;
}): Promise<{
  banco: string;
  tipo: string;
  cuenta: string;
  error?: string;
  sessionExpired?: boolean;
}> {
  const companyId = input.companyId.trim();
  const empNo = input.empNo.trim();
  if (!companyId || !empNo) {
    return { banco: "", tipo: "", cuenta: "" };
  }
  try {
    return await withValidIfsSession(async (session) => {
      const rows = await getBankDetails(session.accessToken, companyId, empNo);
      return mapIfsBank(rows);
    });
  } catch (err) {
    return { banco: "", tipo: "", cuenta: "", ...expiredOrError(err) };
  }
}

export async function fetchAnticiposAprobadorAction(projectId: string): Promise<{
  codigo?: string;
  nombre?: string;
  error?: string;
  sessionExpired?: boolean;
}> {
  const id = projectId.trim();
  if (!id) return {};
  try {
    return await withValidIfsSession(async (session) => {
      const info = await getProjectInfo(session.accessToken, id);
      const manager = info.Manager?.trim();
      if (!manager) return { error: "Sin gerente en IFS para este proyecto" };
      return { codigo: manager, nombre: manager };
    });
  } catch (err) {
    return expiredOrError(err);
  }
}
