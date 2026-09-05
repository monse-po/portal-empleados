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

/** Payload EmpPortalTimeUpdateList (OpenAPI EmpTimeUpdateStructure). */
export type EmpTimeUpdate = {
  Module: string;
  AccountDate: string;
  ShortName: string;
  ReportCostCode: string;
  DayHours: number;
  Objid: string;
  Objversion: string;
  Comments?: string;
  ErrorMsg?: string;
  Status?: string;
};

/** Payload EmpPortalTimeDeleteList (OpenAPI EmpTimeDeleteStructure). */
export type EmpTimeDelete = {
  AccountDate: string;
  Module: string;
  Objid: string;
  Objversion: string;
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
  CApprover?: string;
  CApproverName?: string;
  CAutoApprover?: string;
  CAutoApproverName?: string;
  Manager?: string;
};

/** Ficha de proyecto (Reference_ProjectInfoQuery) — incluye gerente/aprobador. */
export type ProjectInfoQuery = {
  ProjectId?: string;
  Company?: string;
  Name?: string;
  Description?: string;
  /** Identidad / PersonId del gerente (abreviación IFS, p. ej. JCORREA). */
  Manager?: string;
};

/** Fila de GetEmployeeTimesheet (EmpReportItemStructure). */
export type EmpReportItemRow = {
  CompanyId?: string;
  EmpNo?: string;
  ProjectTransactionSeq?: number;
  ActivitySeq?: number;
  AccountDate?: string;
  Module?: string;
  ModuleDecoded?: string;
  Col2?: string;
  Hours?: string | number;
  /** Horas en ProjectTransactionsHandling.ProjectTransactionSet. */
  InternalQuantity?: string | number;
  EmployeeName?: string;
  InternalComments?: string;
  CStatus?: string;
  CStatusDb?: string;
  CRejectNote?: string;
  CApprover?: string;
  CApproverName?: string;
  CAutoApproverName?: string;
  ProjectId?: string;
  SubProjectId?: string;
  SubProjectDesc?: string;
  ActivityNo?: string;
  ActDescription?: string;
  /** Descripción de actividad (p. ej. Reference_Activity.Description). */
  Description?: string;
  ShortName?: string;
  ProjectName?: string;
  ReportCostCode?: string;
  Objid?: string;
  Objversion?: string;
};

/** Fila de GetCurrencyCodes / Reference_CurrencyCodesQuery. */
export type CurrencyCodeRow = {
  Company?: string;
  CurrencyCode?: string;
  Description?: string;
};

/** Fila de Lookup_IsoCountry_EntitySet. */
export type IsoCountryRow = {
  Id?: string;
  Description?: string;
  Country?: string;
  Name?: string;
};

/** Fila de Lookup_IsoCurrency_EntitySet. */
export type IsoCurrencyRow = {
  Id?: string;
  Description?: string;
};
export type LovReportCostCodeRow = {
  ReportCostCode?: string;
  ReportCostName?: string;
  ReportCostType?: "Time" | "Cost" | "Material" | string;
  ReportCode?: string;
};

/** CompanySet / GetExpenseCompany. */
export type IfsCompany = {
  Company?: string;
  Name?: string;
};

/** GetEmployees(Company) / Reference_EmployeeInfoQuery. */
export type EmployeeInfoQuery = {
  Company?: string;
  Identity?: string;
  SupplierName?: string;
  CEmpNo?: string;
  EmpName?: string;
  PersonId?: string;
};

/** GetBankDetails(CompanyId, EmpNo). */
export type PaymentAddress = {
  Company?: string;
  Identity?: string;
  Account?: string;
  Bank?: string;
  AccountType?: string;
  AccountTypeDb?: string;
};

/** GetCurrencyCodes(Company). */
export type CurrencyCodesQuery = {
  Company?: string;
  CurrencyCode?: string;
  Description?: string;
};
