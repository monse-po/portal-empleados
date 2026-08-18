import { ifsFetch, odataStringKey } from "@/src/lib/ifs/client";
import { getIfsConfig } from "@/src/lib/ifs/config";

export type CRequestType = "Expenses" | "Travel";

export type CEmpAdvancesState =
  | "Released"
  | "Approved"
  | "Rejected"
  | "Cancelled";

export type CEmpAdvancesInsert = {
  Description: string;
  RequestType: CRequestType;
  CreatedBy: string;
  ProjectId: string;
  EmpNo: string;
  Company: string;
  InvCompany: string;
  SupplierId: string;
  CurrencyCode: string;
  Amount: number;
  DepartureDate?: string;
  ReturnDate?: string;
  Destination?: string;
  ProjectManager?: string;
};

export type CEmpAdvances = CEmpAdvancesInsert & {
  "@odata.etag"?: string;
  RequestNo?: string;
  RequestDate?: string;
  RequestedBy?: string;
  Approver?: string;
  ApprovedDate?: string;
  ApproverComment?: string;
  Objstate?: CEmpAdvancesState;
};

export type CEmpAdvanceQuery = {
  RequestNo?: string;
  Description?: string;
  Company?: string;
  InvCompany?: string;
  CompanyName?: string;
  RequestDate?: string;
  RequestedBy?: string;
  RequesterName?: string;
  CreatedBy?: string;
  CreatorName?: string;
  PrepaymentType?: string;
  ProjectId?: string;
  EmpNo?: string;
  SupplierId?: string;
  CurrencyCode?: string;
  Amount?: number;
  ApproverId?: string;
  ApproverName?: string;
  ApprovedDate?: string;
  State?: string;
  Objstate?: CEmpAdvancesState | string;
  InvoiceId?: number;
  InvoiceNo?: string;
  InvoiceDate?: string;
  NcfReference?: string;
  EmployeeName?: string;
  InvObjstate?: string;
  InvState?: string;
  RequestType?: string;
  SeriesId?: string;
  InvoiceType?: string;
  DepartureDate?: string;
  ReturnDate?: string;
  Destination?: string;
  PaymentStatus?: string;
  ApproverComment?: string;
  DeliveryDate?: string;
};

type ODataCollection<T> = { value?: T[] };

function advanceBase(): string {
  return getIfsConfig().cempAdvanceBaseUrl;
}

function init(accessToken: string, extra: Omit<Parameters<typeof ifsFetch>[1], "accessToken" | "baseUrl"> = {}) {
  return { ...extra, accessToken, baseUrl: advanceBase() };
}

function collection<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const value = (raw as ODataCollection<T> | null)?.value;
  return Array.isArray(value) ? value : [];
}

export async function createEmpAdvance(
  accessToken: string,
  body: CEmpAdvancesInsert,
): Promise<CEmpAdvances> {
  return ifsFetch<CEmpAdvances>("/CEmpAdvancesSet", {
    ...init(accessToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    }),
  });
}

export async function getYourRequests(
  accessToken: string,
  personId: string,
): Promise<CEmpAdvanceQuery[]> {
  const data = await ifsFetch<ODataCollection<CEmpAdvanceQuery>>(
    `/GetYourRequests(PersonId='${odataStringKey(personId)}')?$top=200`,
    init(accessToken),
  );
  return collection<CEmpAdvanceQuery>(data);
}

export async function getRequestsForApproval(
  accessToken: string,
  personId: string,
): Promise<CEmpAdvanceQuery[]> {
  const data = await ifsFetch<ODataCollection<CEmpAdvanceQuery>>(
    `/GetRequestsForApproval(PersonId='${odataStringKey(personId)}')?$top=200`,
    init(accessToken),
  );
  return collection<CEmpAdvanceQuery>(data);
}

export async function getEmpAdvance(
  accessToken: string,
  requestNo: string,
): Promise<CEmpAdvances> {
  return ifsFetch<CEmpAdvances>(
    `/CEmpAdvancesSet(RequestNo='${odataStringKey(requestNo)}')`,
    init(accessToken),
  );
}

async function postAdvanceAction(
  accessToken: string,
  requestNo: string,
  action: "Cancel" | "SetApproved" | "SetReject" | "Approve" | "Reject",
  body: Record<string, string> = {},
): Promise<void> {
  const row = await getEmpAdvance(accessToken, requestNo);
  const etag = row["@odata.etag"];
  if (!etag) throw new Error(`IFS ${requestNo}: falta @odata.etag`);
  await ifsFetch(
    `/CEmpAdvancesSet(RequestNo='${odataStringKey(requestNo)}')/IfsApp.CEmpAdvanceHandling.CEmpAdvances_${action}`,
    init(accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      ifMatch: etag,
      body: JSON.stringify(body),
    }),
  );
}

export async function cancelEmpAdvance(
  accessToken: string,
  requestNo: string,
): Promise<void> {
  await postAdvanceAction(accessToken, requestNo, "Cancel");
}

export async function approveEmpAdvance(
  accessToken: string,
  requestNo: string,
  aprobador: string,
  comentario: string,
): Promise<void> {
  await postAdvanceAction(accessToken, requestNo, "SetApproved", {
    Approver: aprobador.slice(0, 20),
    ApproverComment: comentario.slice(0, 200),
  });
}

export async function rejectEmpAdvance(
  accessToken: string,
  requestNo: string,
  aprobador: string,
  comentario: string,
): Promise<void> {
  await postAdvanceAction(accessToken, requestNo, "SetReject", {
    Approver: aprobador.slice(0, 20),
    ApproverComment: comentario.slice(0, 200),
  });
}
