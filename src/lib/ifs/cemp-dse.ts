import {
  ifsFetch,
  ifsFetchAllPages,
  odataStringKey,
} from "@/src/lib/ifs/client";
import { getIfsConfig } from "@/src/lib/ifs/config";

export type CDseRequestState =
  | "Requested"
  | "Approved"
  | "Sent"
  | "Issued"
  | "Voided"
  | "Cancelled"
  | "Rejected";

/** Literal OData del enum IFS — no comparar Objstate con Edm.String. */
export function dseStateLiteral(state: CDseRequestState): string {
  return `IfsApp.CDseRequestHandling.CDseRequestState'${state}'`;
}

export type CDseDocType = "DSE" | "NA";

export type CDseRequestSource = "EMPPORTAL" | "IFSCLOUD";

export type CDseRequestInsert = {
  RequestSource: CDseRequestSource;
  Description: string;
  RegisteredBy: string;
  Company: string;
  EmpCompany: string;
  EmpNo: string;
  DocType: CDseDocType;
  Nif: string;
  OrgDocNo: string;
  DocDate: string;
  CurrencyCode: string;
  Amount: number;
  Iva: number;
  Riva: number;
  Rfte: number;
  Rica: number;
  FileName?: string;
  FileData?: string;
  CreditCardNo?: number;
  Project?: string;
  SupplierId?: string;
  AmountCop?: number;
};

export type CDseRequest = CDseRequestInsert & {
  "@odata.etag"?: string;
  RequestNo?: number;
  RequestDate?: string;
  Objstate?: CDseRequestState | string;
  Approver?: string | null;
  ApprovedDate?: string | null;
  ApproverComment?: string | null;
  FileName?: string | null;
  IsFileExist?: string | null;
  IsEditAllowed?: string | null;
  PersonId?: string | null;
  CUserPersonId?: string | null;
  InvoiceId?: number | null;
  Cuds?: string | null;
  AdjustmentType?: string | null;
  ReferDse?: string | null;
};

export type CDseSupplier = {
  VendorNo?: string;
  VendorName?: string;
  Company?: string;
  AssociationNo?: string;
};

export type CDseProject = {
  ProjectId?: string;
  Name?: string;
  Description?: string;
  Objstate?: string;
};

/** LOV de divisa por compañía — `CDseRequestHandling.Reference_CurrencyCode`. */
export type DseCurrencyCode = {
  Company?: string;
  CurrencyCode?: string;
  Description?: string;
  CurrencyRounding?: number | string | null;
  ConvFactor?: number | null;
  DecimalsInRate?: number | null;
  Inverted?: boolean;
};

/** LOV de empresa — `CDseRequestHandling.Reference_LovPersonCompany`. */
export type DseLovCompany = {
  CompanyId?: string;
  CompanyName?: string;
  Country?: string;
  CountryCode?: string;
};

/** LOV de empleado — `ActiveEmployees` / `Reference_LovCompanyPerson`. */
export type DseLovEmployee = {
  CompanyId?: string;
  CompanyName?: string;
  PersonId?: string;
  EmpNo?: string;
  EmployeeName?: string;
  InternalDisplayName?: string;
};

type ODataCollection<T> = { value?: T[] };

function dseBase(): string {
  return getIfsConfig().cempDseBaseUrl;
}

function init(
  accessToken: string,
  extra: Omit<Parameters<typeof ifsFetch>[1], "accessToken" | "baseUrl"> = {},
) {
  return { ...extra, accessToken, baseUrl: dseBase() };
}

function collection<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const value = (raw as ODataCollection<T> | null)?.value;
  return Array.isArray(value) ? value : [];
}

function stripOdataMeta(row: Record<string, unknown>): Record<string, unknown> {
  const skip = new Set([
    "@odata.etag",
    "@odata.context",
    "@odata.id",
    "luname",
    "keyref",
    "Objgrants",
  ]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (skip.has(key) || key.startsWith("@")) continue;
    if (value === null || value === undefined || value === "") continue;
    out[key] = value;
  }
  return out;
}

function requestPath(requestNo: number): string {
  return `/CDseRequestSet(RequestNo=${requestNo})`;
}

export async function defaultDseRequest(
  accessToken: string,
  company: string,
): Promise<CDseRequest> {
  const companyKey = odataStringKey(company);
  return ifsFetch<CDseRequest>(
    `/CDseRequestSet/IfsApp.CDseRequestHandling.CDseRequest_Default(Company='${companyKey}')`,
    init(accessToken),
  );
}

export async function createDseRequest(
  accessToken: string,
  body: CDseRequestInsert,
): Promise<CDseRequest> {
  let defaults: Record<string, unknown> = {};
  try {
    defaults = stripOdataMeta(
      (await defaultDseRequest(
        accessToken,
        body.Company,
      )) as unknown as Record<string, unknown>,
    );
  } catch (err) {
    console.warn("[dse] CDseRequest_Default() failed; POST without defaults", err);
  }
  const payload = { ...defaults, ...body };
  return ifsFetch<CDseRequest>("/CDseRequestSet", {
    ...init(accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    }),
  });
}

export async function getDseRequest(
  accessToken: string,
  requestNo: number,
): Promise<CDseRequest> {
  return ifsFetch<CDseRequest>(requestPath(requestNo), init(accessToken));
}

export async function updateDseRequest(
  accessToken: string,
  requestNo: number,
  body: Record<string, unknown>,
  etag?: string,
): Promise<CDseRequest> {
  return ifsFetch<CDseRequest>(requestPath(requestNo), {
    ...init(accessToken, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    }),
    ifMatch: etag,
  });
}

export async function listDseRequests(
  accessToken: string,
  filter?: string,
): Promise<CDseRequest[]> {
  const qs = filter
    ? `?$filter=${encodeURIComponent(filter)}&$orderby=RequestNo desc`
    : "?$orderby=RequestNo desc";
  return ifsFetchAllPages<CDseRequest>(`/CDseRequestSet${qs}`, init(accessToken));
}

export async function filterSupplierByNif(
  accessToken: string,
  company: string,
  nif: string,
): Promise<CDseSupplier[]> {
  const q = nif.replace(/\s+/g, "").trim();
  if (!q) return [];
  const path =
    `/FilterSupplier(Company='${odataStringKey(company)}',Nif='${odataStringKey(q)}')` +
    "?$top=20&$select=VendorNo,VendorName,Company";
  const data = await ifsFetch<ODataCollection<CDseSupplier>>(
    path,
    init(accessToken),
  );
  return collection<CDseSupplier>(data);
}

export async function searchDseSuppliers(
  accessToken: string,
  company: string,
  query: string,
): Promise<CDseSupplier[]> {
  const q = query.replace(/\s+/g, "").trim();
  if (!q || q.length < 3) return [];
  const byNif = await filterSupplierByNif(accessToken, company, q).catch(
    () => [] as CDseSupplier[],
  );
  if (byNif.length) return byNif;

  const escaped = odataStringKey(q);
  const filter =
    `contains(VendorNo,'${escaped}') or contains(VendorName,'${escaped}')`;
  const path =
    `/Reference_Supplier?$filter=${encodeURIComponent(filter)}` +
    `&$top=20&$select=VendorNo,VendorName,Company`;
  const data = await ifsFetch<ODataCollection<CDseSupplier>>(
    path,
    init(accessToken),
  );
  return collection<CDseSupplier>(data);
}

export async function listDseProjects(
  accessToken: string,
): Promise<CDseProject[]> {
  return ifsFetchAllPages<CDseProject>(
    "/Reference_Project?$select=ProjectId,Name,Description,Objstate&$orderby=ProjectId",
    init(accessToken),
  );
}

/** Empresas visibles en el LOV de DSE (no GetExpenseCompany de Anticipos). */
export async function listDseCompanies(
  accessToken: string,
): Promise<DseLovCompany[]> {
  return ifsFetchAllPages<DseLovCompany>(
    "/Reference_LovPersonCompany?$select=CompanyId,CompanyName,Country,CountryCode&$orderby=CompanyId",
    init(accessToken),
  );
}

/** Empleados activos de la compañía del DSE (no GetEmployees de Anticipos). */
export async function listDseEmployees(
  accessToken: string,
  company: string,
): Promise<DseLovEmployee[]> {
  const companyKey = odataStringKey(company.trim());
  if (!companyKey) return [];
  const filter = `CompanyId eq '${companyKey}'`;
  const qs =
    `?$filter=${encodeURIComponent(filter)}` +
    "&$select=CompanyId,CompanyName,PersonId,EmpNo,EmployeeName,InternalDisplayName" +
    "&$orderby=EmployeeName";
  try {
    return await ifsFetchAllPages<DseLovEmployee>(
      `/ActiveEmployees${qs}`,
      init(accessToken),
    );
  } catch {
    return ifsFetchAllPages<DseLovEmployee>(
      `/Reference_LovCompanyPerson${qs}`,
      init(accessToken),
    );
  }
}

/** Divisas habilitadas en la compañía del DSE (no el LOV de Anticipos). */
export async function listDseCurrencyCodes(
  accessToken: string,
  company: string,
): Promise<DseCurrencyCode[]> {
  const companyKey = odataStringKey(company.trim());
  if (!companyKey) return [];
  const filter = `Company eq '${companyKey}'`;
  const qs =
    `?$filter=${encodeURIComponent(filter)}` +
    "&$select=Company,CurrencyCode,Description,CurrencyRounding,ConvFactor,DecimalsInRate" +
    "&$orderby=CurrencyCode";
  return ifsFetchAllPages<DseCurrencyCode>(
    `/Reference_CurrencyCode${qs}`,
    init(accessToken),
  );
}

export async function getDsePersonName(
  accessToken: string,
  companyId: string,
  empNo: string,
): Promise<{ personId?: string; name?: string } | null> {
  try {
    const data = await ifsFetch<{
      PersonId?: string;
      InternalDisplayName?: string;
    }>(
      `/GetIntDispNameAndPersId(CompanyId='${odataStringKey(companyId)}',EmpNo='${odataStringKey(empNo)}')`,
      init(accessToken),
    );
    const name = data.InternalDisplayName?.trim();
    const personId = data.PersonId?.trim();
    if (!name && !personId) return null;
    return { personId, name };
  } catch {
    return null;
  }
}

export async function attachDseFile(
  accessToken: string,
  requestNo: number,
  fileName: string,
  fileData: string,
): Promise<void> {
  const created = await ifsFetch<{ Objkey?: string }>("/VrtImportFiles", {
    ...init(accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        RequestNo: requestNo,
        FileName: fileName,
        FileData: fileData,
      }),
    }),
  });
  const objkey = created.Objkey?.trim();
  if (!objkey) return;
  await ifsFetch<void>("/UploadFile", {
    ...init(accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Objkey: objkey }),
    }),
  });
}
