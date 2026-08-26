import {
  cempPortalUserPath,
  ifsFetch,
  odataStringKey,
  type IfsRequestInit,
} from "@/src/lib/ifs/client";
import { IfsApiError } from "@/src/lib/ifs/errors";
import { getIfsTargetEmpNo } from "@/src/lib/ifs/config";
import type {
  CempPortalUser,
  CurrencyCodesQuery,
  CutOffDateParams,
  EmployeeInfoQuery,
  EmpTimeApproval,
  EmpTimeDelete,
  EmpTimeReg,
  EmpTimeUpdate,
  HoursSummary,
  IfsCompany,
  PaymentAddress,
  ProjectInfoQuery,
  UserInfo,
  ValidActReportCodeParams,
} from "@/src/lib/ifs/types";

type ODataCollection<T> = { value?: T[] };

export type CempPortalSession = {
  emailId: string;
  accessToken: string;
  etag: string;
  user: CempPortalUser;
  refreshEtag: () => Promise<string>;
};

async function loadPortalUser(
  emailId: string,
  accessToken: string,
): Promise<CempPortalUser> {
  const data = await ifsFetch<CempPortalUser>(
    `${cempPortalUserPath(emailId)}?$select=EmailId,CompanyId,EmpId`,
    { accessToken },
  );
  if (!data?.EmailId) {
    throw new Error(
      `CEmpPortalUserSet: no hay usuario para EmailId=${emailId}`,
    );
  }
  return data;
}

export async function openCempPortalSession(
  emailId: string,
  accessToken: string,
): Promise<CempPortalSession> {
  const user = await loadPortalUser(emailId, accessToken);
  const etag = user["@odata.etag"];
  if (!etag) {
    throw new Error("CEmpPortalUserSet: falta @odata.etag (If-Match)");
  }

  return {
    emailId,
    accessToken,
    etag,
    user,
    refreshEtag: async () => {
      const fresh = await loadPortalUser(emailId, accessToken);
      const next = fresh["@odata.etag"];
      if (!next) throw new Error("CEmpPortalUserSet: etag vacío al refrescar");
      return next;
    },
  };
}

function sessionRequest(
  session: CempPortalSession,
  init: Omit<IfsRequestInit, "accessToken" | "ifMatch"> = {},
): IfsRequestInit {
  return {
    ...init,
    accessToken: session.accessToken,
    ifMatch: session.etag,
  };
}

const FN = {
  getUserInfo: "IfsApp.CEmpPortalServices.CEmpPortalUser_GetUserInfo()",
  getHoursSummary:
    "IfsApp.CEmpPortalServices.CEmpPortalUser_GetHoursSummary()",
  getEmployeeTimesheet:
    "IfsApp.CEmpPortalServices.CEmpPortalUser_GetEmployeeTimesheet()",
  getApprovalTimesheets:
    "IfsApp.CEmpPortalServices.CEmpPortalUser_GetApprovalTimesheets()",
  getValidEmpPrjAct:
    "IfsApp.CEmpPortalServices.CEmpPortalUser_GetValidEmpPrjAct",
  getValidActReportCode:
    "IfsApp.CEmpPortalServices.CEmpPortalUser_GetValidActReportCode",
  getCutOffdate: "IfsApp.CEmpPortalServices.CEmpPortalUser_GetCutOffdate",
  regList:
    "IfsApp.CEmpPortalServices.CEmpPortalUser_EmpPortalTimeRegList",
  updateList:
    "IfsApp.CEmpPortalServices.CEmpPortalUser_EmpPortalTimeUpdateList",
  deleteList:
    "IfsApp.CEmpPortalServices.CEmpPortalUser_EmpPortalTimeDeleteList",
  approvalList:
    "IfsApp.CEmpPortalServices.CEmpPortalUser_EmpPortalTimeApprovalList",
} as const;

function fnPath(session: CempPortalSession, fn: string): string {
  return `${cempPortalUserPath(session.emailId)}/${fn}`;
}

export async function getUserInfo(session: CempPortalSession): Promise<UserInfo> {
  return ifsFetch<UserInfo>(fnPath(session, FN.getUserInfo), sessionRequest(session));
}

export async function getHoursSummary(
  session: CempPortalSession,
): Promise<HoursSummary> {
  return ifsFetch<HoursSummary>(
    fnPath(session, FN.getHoursSummary),
    sessionRequest(session),
  );
}

export async function getEmployeeTimesheet(
  session: CempPortalSession,
): Promise<unknown> {
  return ifsFetch(fnPath(session, FN.getEmployeeTimesheet), sessionRequest(session));
}

export async function getApprovalTimesheets(
  session: CempPortalSession,
): Promise<unknown> {
  return ifsFetch(
    fnPath(session, FN.getApprovalTimesheets),
    sessionRequest(session),
  );
}

export async function getValidEmpPrjAct(
  session: CempPortalSession,
  accountDate: string,
): Promise<unknown> {
  const base = fnPath(session, FN.getValidEmpPrjAct);
  const attempts: Array<{ label: string; path: string; init?: Omit<IfsRequestInit, "accessToken" | "ifMatch"> }> = [
    { label: "date", path: `${base}(AccountDate=${accountDate})` },
    { label: "date-quoted", path: `${base}(AccountDate='${accountDate}')` },
    { label: "date-literal", path: `${base}(AccountDate=date'${accountDate}')` },
    { label: "query", path: `${base}?AccountDate=${accountDate}` },
    { label: "query-date-literal", path: `${base}?AccountDate=date'${accountDate}'` },
  ];

  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      return await ifsFetch(attempt.path, sessionRequest(session, attempt.init));
    } catch (err) {
      lastErr = err;
      if (!(err instanceof IfsApiError) || err.status !== 404) throw err;
    }
  }

  try {
    return await ifsFetch(base, {
      ...sessionRequest(session, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ AccountDate: accountDate }),
      }),
    });
  } catch (err) {
    lastErr = err;
    if (!(err instanceof IfsApiError) || err.status !== 404) throw err;
  }

  throw lastErr;
}

export async function getValidActReportCode(
  session: CempPortalSession,
  params: ValidActReportCodeParams,
): Promise<unknown> {
  const fn =
    `${FN.getValidActReportCode}` +
    `(CompanyId='${params.CompanyId}',ProjectId='${params.ProjectId}',` +
    `SubProjectId='${params.SubProjectId}',AccountDate=${params.AccountDate},` +
    `ActivitySeq=${params.ActivitySeq})`;
  return ifsFetch(fnPath(session, fn), sessionRequest(session));
}

export async function getCutOffdate(
  session: CempPortalSession,
  params: CutOffDateParams,
): Promise<unknown> {
  const fn =
    `${FN.getCutOffdate}` +
    `(CompanyId='${params.CompanyId}',AccountDate=${params.AccountDate},` +
    `ReportCodeGroupId='${params.ReportCodeGroupId}',TimeEntryType='${params.TimeEntryType}')`;
  return ifsFetch(fnPath(session, fn), sessionRequest(session));
}

async function postAction<TBody, TResult>(
  session: CempPortalSession,
  action: string,
  body: TBody,
): Promise<TResult> {
  return ifsFetch<TResult>(fnPath(session, action), {
    ...sessionRequest(session, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
}

export async function registerTimeEntries(
  session: CempPortalSession,
  entries: EmpTimeReg[],
): Promise<unknown> {
  return postAction(session, FN.regList, { EmpTimeReg: entries });
}

export async function updateTimeEntries(
  session: CempPortalSession,
  entries: EmpTimeUpdate[],
): Promise<unknown> {
  return postAction(session, FN.updateList, { EmpTimeUpdate: entries });
}

export async function deleteTimeEntries(
  session: CempPortalSession,
  entries: EmpTimeDelete[],
): Promise<unknown> {
  return postAction(session, FN.deleteList, { EmpTimeDelete: entries });
}

export async function approveTimeEntries(
  session: CempPortalSession,
  entries: EmpTimeApproval[],
): Promise<unknown> {
  return postAction(session, FN.approvalList, { EmpTimeApproval: entries });
}

/** Horas programadas para un día (reemplaza tope fijo 8.5h). */
export async function getScheduleHoursForDate(
  session: CempPortalSession,
  accountDate: string,
): Promise<number | undefined> {
  const map = await getEmployeeScheduleHoursByDate(session);
  return map[accountDate.slice(0, 10)];
}

/** Mapa AccountDate → ScheduleHours del programa del empleado (GetHoursSummary). */
export async function getEmployeeScheduleHoursByDate(
  session: CempPortalSession,
): Promise<Record<string, number>> {
  const summary = await getHoursSummary(session);
  const map: Record<string, number> = {};
  for (const day of summary.EmployeeSchedule ?? []) {
    const iso = (day.AccountDate ?? "").slice(0, 10);
    if (!iso) continue;
    const hours = day.ScheduleHours;
    if (typeof hours === "number" && Number.isFinite(hours)) {
      map[iso] = hours;
    }
  }
  return map;
}

export async function listPortalUsers(
  accessToken: string,
): Promise<CempPortalUser[]> {
  const data = await ifsFetch<ODataCollection<CempPortalUser>>(
    "/CEmpPortalUserSet?$select=EmailId,CompanyId,EmpId",
    { accessToken },
  );
  return data.value ?? [];
}

export async function findPortalUserByEmpId(
  accessToken: string,
  empId: string,
): Promise<CempPortalUser | null> {
  const id = odataStringKey(empId.trim());
  if (!id) return null;
  const data = await ifsFetch<ODataCollection<CempPortalUser>>(
    `/CEmpPortalUserSet?$select=EmailId,CompanyId,EmpId&$filter=EmpId eq '${id}'&$top=5`,
    { accessToken },
  );
  return data.value?.[0] ?? null;
}

/**
 * Abre CEmpPortalUser del email de sesión, o del EmpNo de prueba
 * (`IFS_DEV_EMP_NO`, en local 1001138468) si existe en CEmpPortalUserSet.
 */
export async function openCempPortalActor(
  sessionEmail: string,
  accessToken: string,
): Promise<CempPortalSession> {
  const targetEmpNo = getIfsTargetEmpNo();
  if (targetEmpNo) {
    try {
      const match = await findPortalUserByEmpId(accessToken, targetEmpNo);
      if (match?.EmailId) {
        return openCempPortalSession(match.EmailId, accessToken);
      }
    } catch {
      /* el token puede no listar otros EmpId; usar email de sesión */
    }
  }
  return openCempPortalSession(sessionEmail, accessToken);
}

export async function getReportItemsByEmpNo(
  session: CempPortalSession,
  empNo: string,
): Promise<unknown> {
  const id = odataStringKey(empNo.trim());
  return ifsFetch(
    `${cempPortalUserPath(session.emailId)}/ReportItemSet?$filter=EmpNo eq '${id}'&$top=500`,
    sessionRequest(session),
  );
}

export async function getReferenceReportItemsByEmpNo(
  accessToken: string,
  empNo: string,
): Promise<unknown> {
  const id = odataStringKey(empNo.trim());
  return ifsFetch(
    `/Reference_EmpReportItem?$filter=EmpNo eq '${id}'&$top=500`,
    { accessToken },
  );
}

/** GetEmployeeTimesheet del actor; si viene vacío, ReportItemSet / Reference por EmpNo. */
export async function getEmployeeTimesheetForEmp(
  session: CempPortalSession,
  empNo?: string,
): Promise<unknown> {
  try {
    const raw = await getEmployeeTimesheet(session);
    if (!empNo) return raw;
    const rows = Array.isArray(raw)
      ? raw
      : ((raw as { value?: unknown[] } | null)?.value ?? []);
    if (rows.length > 0) return raw;
  } catch (err) {
    if (!empNo) throw err;
  }

  if (!empNo) return { value: [] };

  try {
    return await getReportItemsByEmpNo(session, empNo);
  } catch {
    return getReferenceReportItemsByEmpNo(session.accessToken, empNo);
  }
}

/** Gerente del proyecto (aprobador) desde Reference_ProjectInfoQuery. */
export async function getProjectInfo(
  accessToken: string,
  projectId: string,
): Promise<ProjectInfoQuery> {
  return ifsFetch<ProjectInfoQuery>(
    `/Reference_ProjectInfoQuery(ProjectId='${odataStringKey(projectId)}')?$select=ProjectId,Manager,Name`,
    { accessToken },
  );
}

function odataCollection<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const value = (raw as { value?: T[] } | null)?.value;
  return Array.isArray(value) ? value : [];
}

/** Compañías del portal (CompanySet). */
export async function getCompanies(
  accessToken: string,
): Promise<IfsCompany[]> {
  const data = await ifsFetch<ODataCollection<IfsCompany>>(
    "/CompanySet?$select=Company,Name&$top=200",
    { accessToken },
  );
  return odataCollection<IfsCompany>(data);
}

/** Empleados de una compañía (GetEmployees). */
export async function getEmployeesByCompany(
  accessToken: string,
  company: string,
): Promise<EmployeeInfoQuery[]> {
  const data = await ifsFetch<ODataCollection<EmployeeInfoQuery>>(
    `/GetEmployees(Company='${odataStringKey(company)}')?$top=500`,
    { accessToken },
  );
  return odataCollection<EmployeeInfoQuery>(data);
}

/** Proyectos de una compañía (GetProjects). */
export async function getProjectsByCompany(
  accessToken: string,
  company: string,
): Promise<ProjectInfoQuery[]> {
  const data = await ifsFetch<ODataCollection<ProjectInfoQuery>>(
    `/GetProjects(Company='${odataStringKey(company)}')?$select=ProjectId,Name,Description,Manager,Company&$top=500`,
    { accessToken },
  );
  return odataCollection<ProjectInfoQuery>(data);
}

/** Cuenta bancaria del empleado (GetBankDetails). */
export async function getBankDetails(
  accessToken: string,
  companyId: string,
  empNo: string,
): Promise<PaymentAddress[]> {
  const data = await ifsFetch<ODataCollection<PaymentAddress>>(
    `/GetBankDetails(CompanyId='${odataStringKey(companyId)}',EmpNo='${odataStringKey(empNo)}')`,
    { accessToken },
  );
  return odataCollection<PaymentAddress>(data);
}

/** Divisas de la compañía (GetCurrencyCodes). */
export async function getCurrencyCodes(
  accessToken: string,
  company: string,
): Promise<CurrencyCodesQuery[]> {
  const data = await ifsFetch<ODataCollection<CurrencyCodesQuery>>(
    `/GetCurrencyCodes(Company='${odataStringKey(company)}')`,
    { accessToken },
  );
  return odataCollection<CurrencyCodesQuery>(data);
}

/** Compañías de gasto del proveedor/empleado (GetExpenseCompany). */
export async function getExpenseCompanies(
  accessToken: string,
  supplierId: string,
): Promise<IfsCompany[]> {
  const data = await ifsFetch<ODataCollection<IfsCompany>>(
    `/GetExpenseCompany(SupplierId='${odataStringKey(supplierId)}')`,
    { accessToken },
  );
  return odataCollection<IfsCompany>(data);
}
