import {
  cempPortalMainBaseUrl,
  cempPortalUserPath,
  ifsFetch,
  odataStringKey,
  type IfsRequestInit,
} from "@/src/lib/ifs/client";
import { getIfsConfig } from "@/src/lib/ifs/config";
import { IfsApiError } from "@/src/lib/ifs/errors";
import type {
  CempPortalUser,
  CurrencyCodeRow,
  CutOffDateParams,
  EmpTimeApproval,
  EmpTimeDelete,
  EmpTimeReg,
  EmpTimeUpdate,
  EmployeeInfoQuery,
  HoursSummary,
  IsoCountryRow,
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

const HISTORICO_EXPAND = encodeURIComponent(
  "ProjectTransactionRef,ActivityRef,ReportCostRef",
);

/** ReportItemSet filtrado por fecha — histórico de varios meses (solo lectura, sin If-Match). */
export async function getEmployeeReportItemsHistorico(
  session: CempPortalSession,
  desdeIso: string,
): Promise<unknown> {
  const base = `${cempPortalUserPath(session.emailId)}/ReportItemSet`;
  const common = `$orderby=AccountDate desc&$expand=${HISTORICO_EXPAND}&$top=5000`;
  const filters = [
    `AccountDate ge date'${desdeIso}'`,
    `AccountDate ge ${desdeIso}`,
  ];
  const attempts = [
    ...filters.map((filter) => `${base}?$filter=${encodeURIComponent(filter)}&${common}`),
    `${base}?${common}`,
  ];

  let lastErr: unknown;
  for (const path of attempts) {
    for (const init of [
      sessionRequest(session),
      { accessToken: session.accessToken },
    ]) {
      try {
        return await ifsFetch(path, init);
      } catch (err) {
        lastErr = err;
        if (!(err instanceof IfsApiError)) throw err;
      }
    }
  }

  throw lastErr;
}

/** Reference_EmpReportItem — histórico por EmpNo (+ CompanyId) con filtro OData. */
export async function getReferenceEmpReportItemsHistorico(
  session: CempPortalSession,
  companyId: string,
  empNo: string,
  desdeIso: string,
): Promise<unknown> {
  const company = odataStringKey(companyId);
  const emp = odataStringKey(empNo);
  const common = `$orderby=AccountDate desc&$expand=${HISTORICO_EXPAND}&$top=5000`;
  const filters = [
    `CompanyId eq '${company}' and EmpNo eq '${emp}' and AccountDate ge date'${desdeIso}'`,
    `CompanyId eq '${company}' and EmpNo eq '${emp}' and AccountDate ge ${desdeIso}`,
    `CompanyId eq '${company}' and EmpNo eq '${emp}'`,
    `EmpNo eq '${emp}' and AccountDate ge date'${desdeIso}'`,
    `EmpNo eq '${emp}'`,
  ];

  let lastErr: unknown;
  for (const filter of filters) {
    const path = `/Reference_EmpReportItem?$filter=${encodeURIComponent(filter)}&${common}`;
    for (const init of [
      sessionRequest(session),
      { accessToken: session.accessToken },
    ]) {
      try {
        return await ifsFetch(path, init);
      } catch (err) {
        lastErr = err;
        if (!(err instanceof IfsApiError)) throw err;
      }
    }
  }

  throw lastErr;
}

/**
 * Lectura puntual de EmpReportItem / ProjectTransaction por secuencia
 * (la pantalla Aurena "Transacciones Proyecto").
 */
export async function getEmpReportItemByProjectTransactionSeq(
  session: CempPortalSession,
  projectTransactionSeq: number,
): Promise<unknown> {
  const expand = HISTORICO_EXPAND;
  const filters = [
    `ProjectTransactionSeq eq ${projectTransactionSeq}`,
  ];
  let lastErr: unknown;
  for (const filter of filters) {
    const path = `/Reference_EmpReportItem?$filter=${encodeURIComponent(filter)}&$expand=${expand}&$top=10`;
    for (const init of [
      sessionRequest(session),
      { accessToken: session.accessToken },
    ]) {
      try {
        return await ifsFetch(path, init);
      } catch (err) {
        lastErr = err;
        if (!(err instanceof IfsApiError)) throw err;
      }
    }
  }
  throw lastErr;
}

export async function getReferenceProjectTransactionBySeq(
  session: CempPortalSession,
  projectTransactionSeq: number,
): Promise<unknown> {
  const path = `/Reference_ProjectTransaction(ProjectTransactionSeq=${projectTransactionSeq})`;
  let lastErr: unknown;
  for (const init of [
    sessionRequest(session),
    { accessToken: session.accessToken },
  ]) {
    try {
      return await ifsFetch(path, init);
    } catch (err) {
      lastErr = err;
      if (!(err instanceof IfsApiError)) throw err;
    }
  }
  throw lastErr;
}

/** Filtra Reference_ProjectTransaction por estado Confirmado (sin EmpNo en el entity). */
export async function getReferenceProjectTransactionsConfirmed(
  session: CempPortalSession,
  top = 50,
): Promise<unknown> {
  const filters = [
    `CStatus eq IfsApp.CEmpPortalServices.CEmpProjTimeStatus'Confirmed'`,
    `CStatusDb eq 'Confirmed'`,
    `CStatus eq 'Confirmed'`,
  ];
  let lastErr: unknown;
  for (const filter of filters) {
    const path = `/Reference_ProjectTransaction?$filter=${encodeURIComponent(filter)}&$top=${top}&$orderby=ProjectTransactionSeq desc`;
    for (const init of [
      sessionRequest(session),
      { accessToken: session.accessToken },
    ]) {
      try {
        return await ifsFetch(path, init);
      } catch (err) {
        lastErr = err;
        if (!(err instanceof IfsApiError)) throw err;
      }
    }
  }
  throw lastErr;
}

/**
 * Intenta leer EmpReportItem / ReportItemSet por canal /main/ (el de Aurena).
 * En /int/ a veces llega vacío aunque Transacciones Proyecto tenga data.
 */
export async function getEmployeeReportItemsHistoricoMainChannel(
  session: CempPortalSession,
  companyId: string,
  empNo: string,
  desdeIso: string,
): Promise<unknown> {
  const mainBase = cempPortalMainBaseUrl();
  const intBase = getIfsConfig().cempPortalBaseUrl.replace(/\/$/, "");
  if (mainBase.replace(/\/$/, "") === intBase) {
    throw new IfsApiError("Canal main igual a int — skip", 0, "");
  }

  const company = odataStringKey(companyId);
  const emp = odataStringKey(empNo);
  const expand = HISTORICO_EXPAND;
  const common = `$orderby=AccountDate desc&$expand=${expand}&$top=5000`;
  const filters = [
    `CompanyId eq '${company}' and EmpNo eq '${emp}' and AccountDate ge date'${desdeIso}'`,
    `CompanyId eq '${company}' and EmpNo eq '${emp}'`,
    `EmpNo eq '${emp}'`,
  ];

  let lastErr: unknown;
  for (const filter of filters) {
    const path = `/Reference_EmpReportItem?$filter=${encodeURIComponent(filter)}&${common}`;
    try {
      return await ifsFetch(path, {
        accessToken: session.accessToken,
        baseUrl: mainBase,
      });
    } catch (err) {
      lastErr = err;
      if (!(err instanceof IfsApiError)) throw err;
    }
  }

  const reportBase = `${cempPortalUserPath(session.emailId)}/ReportItemSet`;
  for (const filter of [
    `AccountDate ge date'${desdeIso}'`,
    "",
  ]) {
    const path = filter
      ? `${reportBase}?$filter=${encodeURIComponent(filter)}&${common}`
      : `${reportBase}?${common}`;
    try {
      return await ifsFetch(path, {
        accessToken: session.accessToken,
        ifMatch: session.etag,
        baseUrl: mainBase,
      });
    } catch (err) {
      lastErr = err;
      if (!(err instanceof IfsApiError)) throw err;
    }
  }

  throw lastErr;
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
  const summary = await getHoursSummary(session);
  const target = accountDate.slice(0, 10);
  const day = summary.EmployeeSchedule?.find(
    (d) => (d.AccountDate ?? "").slice(0, 10) === target,
  );
  return day?.ScheduleHours;
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

/** Gerente del proyecto (aprobador) desde Reference_ProjectInfoQuery. */
export async function getProjectInfo(
  accessToken: string,
  projectId: string,
): Promise<ProjectInfoQuery> {
  return ifsFetch<ProjectInfoQuery>(
    `/Reference_ProjectInfoQuery(ProjectId='${odataStringKey(projectId)}')?$select=ProjectId,Manager,Name,Company`,
    { accessToken },
  );
}

/**
 * Resuelve Identity/PersonId (p. ej. JCORREA) → EmpName completo.
 * Manager de ProjectInfo es la abreviación IFS, no el nombre.
 */
export async function resolvePersonDisplayName(
  accessToken: string,
  identity: string,
  companyId?: string,
): Promise<string | null> {
  const id = identity.trim();
  if (!id) return null;

  const filters = [
    `PersonId eq '${odataStringKey(id)}'`,
    `Identity eq '${odataStringKey(id)}'`,
  ];
  if (companyId?.trim()) {
    const company = odataStringKey(companyId.trim());
    filters.unshift(
      `Company eq '${company}' and PersonId eq '${odataStringKey(id)}'`,
      `Company eq '${company}' and Identity eq '${odataStringKey(id)}'`,
    );
  }

  for (const filter of filters) {
    try {
      const path =
        `/Reference_EmployeeInfoQuery?$filter=${encodeURIComponent(filter)}` +
        `&$select=EmpName,Identity,PersonId,Company&$top=5`;
      const raw = await ifsFetch<ODataCollection<EmployeeInfoQuery>>(path, {
        accessToken,
      });
      const rows = raw.value ?? [];
      const name = rows
        .map((r) => r.EmpName?.trim())
        .find((n) => Boolean(n));
      if (name) return name;
    } catch (err) {
      if (!(err instanceof IfsApiError)) throw err;
    }
  }
  return null;
}

/** Divisas habilitadas por compañía (GetCurrencyCodes + fallback Reference). */
export async function getCurrencyCodes(
  accessToken: string,
  companyId: string,
): Promise<CurrencyCodeRow[]> {
  const company = odataStringKey(companyId);
  const attempts = [
    `/GetCurrencyCodes(Company='${company}')`,
    `/Reference_CurrencyCodesQuery?$filter=${encodeURIComponent(`Company eq '${company}'`)}&$orderby=CurrencyCode&$top=200`,
    `/Reference_CurrencyCodesQuery?$filter=${encodeURIComponent(`Company eq '${company}'`)}&$top=200`,
  ];

  let lastErr: unknown;
  for (const path of attempts) {
    try {
      const raw = await ifsFetch<ODataCollection<CurrencyCodeRow> | CurrencyCodeRow[]>(
        path,
        { accessToken },
      );
      if (Array.isArray(raw)) return raw;
      return raw.value ?? [];
    } catch (err) {
      lastErr = err;
      if (!(err instanceof IfsApiError)) throw err;
    }
  }
  throw lastErr;
}

/** Países ISO (destinos de viaje). */
export async function getIsoCountries(
  accessToken: string,
): Promise<IsoCountryRow[]> {
  const path =
    "/Lookup_IsoCountry_EntitySet?$select=Id,Description&$orderby=Description&$top=500";
  const raw = await ifsFetch<ODataCollection<IsoCountryRow>>(path, {
    accessToken,
  });
  return raw.value ?? [];
}
