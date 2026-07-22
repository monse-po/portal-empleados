import {
  cempPortalUserPath,
  ifsFetch,
  type IfsRequestInit,
} from "@/src/lib/ifs/client";
import type {
  CempPortalUser,
  CutOffDateParams,
  EmpTimeApproval,
  EmpTimeDelete,
  EmpTimeReg,
  EmpTimeUpdate,
  HoursSummary,
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
  const fn = `${FN.getValidEmpPrjAct}(AccountDate=${accountDate})`;
  return ifsFetch(fnPath(session, fn), sessionRequest(session));
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
  const day = summary.EmployeeSchedule?.find(
    (d) => d.AccountDate === accountDate,
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
