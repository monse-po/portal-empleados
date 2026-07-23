/** Tipos derivados de docs/ifs/CEmpPortalServices.openapi.json */

export type CempPortalUser = {
  "@odata.etag"?: string;
  EmailId: string;
  CompanyId: string;
  EmpId: string;
};

export type UserInfo = {
  CompanyId?: string;
  CompanyName?: string;
  EmpNo?: string;
  EmpName?: string;
  PersonId?: string;
  ActivePeriod?: string;
  SupplierId?: string;
};

export type EmployeeScheduleDay = {
  AccountDate?: string;
  DayType?: string;
  DayTypeDesc?: string;
  ScheduleLength?: number;
  ScheduleHours?: number;
  ColorName?: string;
};

export type HoursSummary = {
  CompanyId?: string;
  EmpNo?: string;
  JobHours?: number;
  ScheduleHours?: number;
  RemainingJobHours?: number;
  ConfirmedHours?: number;
  PendingApprovalHours?: number;
  EmployeeSchedule?: EmployeeScheduleDay[];
};

export type EmpTimeReg = {
  AccountDate: string;
  ShortName: string;
  ReportCostCode: string;
  DayHours: number;
  Comments?: string;
  ErrorMsg?: string;
  Status?: string;
};

export type EmpTimeUpdate = EmpTimeReg & {
  ProjectTransactionSeq?: number;
};

export type EmpTimeDelete = {
  ProjectTransactionSeq: number;
  ErrorMsg?: string;
  Status?: string;
};

export type EmpTimeApproval = {
  ProjectTransactionSeq: number;
  Event: string;
  RejectNote?: string;
  ErrorMsg?: string;
  Status?: string;
};

export type CutOffDateParams = {
  CompanyId: string;
  AccountDate: string;
  ReportCodeGroupId: string;
  TimeEntryType: string;
};

export type ValidActReportCodeParams = {
  CompanyId: string;
  ProjectId: string;
  SubProjectId: string;
  AccountDate: string;
  ActivitySeq: number;
};

/** Fila de GetValidEmpPrjAct (proyecto / subproyecto / actividad). */
export type ValidEmpPrjActRow = {
  CompanyId?: string;
  ShortName?: string;
  ProjectId?: string;
  Name?: string;
  SubProjectId?: string;
  SubProjectDesc?: string;
  ActivityNo?: string;
  Description?: string;
  ReportCode?: string;
  ActivitySeq?: number;
};

/** Fila de GetValidActReportCode (tipo de hora / report cost code). */
export type LovReportCostCodeRow = {
  ReportCostCode?: string;
  ReportCostName?: string;
  ReportCostType?: "Time" | "Cost" | "Material" | string;
  ReportCode?: string;
};
