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

/** Igual que Aurena/APEX: Default() inicializa colecciones internas del LU. */
export async function defaultEmpAdvance(
  accessToken: string,
): Promise<CEmpAdvances> {
  return ifsFetch<CEmpAdvances>(
    "/CEmpAdvancesSet/IfsApp.CEmpAdvanceHandling.CEmpAdvances_Default()",
    init(accessToken),
  );
}

export async function createEmpAdvance(
  accessToken: string,
  body: CEmpAdvancesInsert,
): Promise<CEmpAdvances> {
  let defaults: Record<string, unknown> = {};
  try {
    defaults = stripOdataMeta(
      (await defaultEmpAdvance(accessToken)) as unknown as Record<string, unknown>,
    );
  } catch (err) {
    console.warn("[anticipos] CEmpAdvances_Default() failed; POST without defaults", err);
  }
  const payload = { ...defaults, ...body };
  return ifsFetch<CEmpAdvances>("/CEmpAdvancesSet", {
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

export async function getAdvanceQuery(
  accessToken: string,
  requestNo: string,
): Promise<CEmpAdvanceQuery> {
  return ifsFetch<CEmpAdvanceQuery>(
    `/CEmpAdvanceQuerySet(RequestNo='${odataStringKey(requestNo)}')`,
    init(accessToken),
  );
}

export async function listAdvanceQueries(
  accessToken: string,
  filter: string,
): Promise<CEmpAdvanceQuery[]> {
  const data = await ifsFetch<ODataCollection<CEmpAdvanceQuery>>(
    `/CEmpAdvanceQuerySet?$filter=${encodeURIComponent(filter)}&$top=200&$orderby=RequestDate desc`,
    init(accessToken),
  );
  return collection<CEmpAdvanceQuery>(data);
}

function stateBlob(row: Pick<CEmpAdvances, "Objstate"> & { State?: string }): string {
  return `${row.Objstate || ""} ${row.State || ""}`.toLowerCase();
}

export function isAdvanceApproved(row: Pick<CEmpAdvances, "Objstate"> & { State?: string }): boolean {
  const raw = stateBlob(row);
  return raw.includes("approv") || raw.includes("aprob");
}

export function isAdvanceRejected(row: Pick<CEmpAdvances, "Objstate"> & { State?: string }): boolean {
  const raw = stateBlob(row);
  return raw.includes("reject") || raw.includes("rechaz");
}

function compactActionBody(body: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    const trimmed = value.trim();
    if (trimmed) next[key] = trimmed;
  }
  return next;
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
      body: JSON.stringify(compactActionBody(body)),
    }),
  );
}

async function readAdvanceOrNull(
  accessToken: string,
  requestNo: string,
): Promise<CEmpAdvances | null> {
  try {
    return await getEmpAdvance(accessToken, requestNo);
  } catch {
    return null;
  }
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
): Promise<CEmpAdvances> {
  const fields = {
    Approver: aprobador.slice(0, 20),
    ApproverComment: comentario.slice(0, 200),
  };
  const hasFields = Boolean(fields.Approver.trim() || fields.ApproverComment.trim());
  const sequence = hasFields
    ? (["Approve", "SetApproved"] as const)
    : (["Approve"] as const);
  let lastErr: unknown;
  for (const action of sequence) {
    try {
      await postAdvanceAction(
        accessToken,
        requestNo,
        action,
        action === "SetApproved" ? fields : {},
      );
      const row = await getEmpAdvance(accessToken, requestNo);
      if (isAdvanceApproved(row)) return row;
    } catch (err) {
      lastErr = err;
      const row = await readAdvanceOrNull(accessToken, requestNo);
      if (row && isAdvanceApproved(row)) return row;
      console.warn(`[anticipos] ${action} failed on ${requestNo}`, err);
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`IFS ${requestNo}: no se pudo aprobar`);
}

export async function rejectEmpAdvance(
  accessToken: string,
  requestNo: string,
  aprobador: string,
  comentario: string,
): Promise<CEmpAdvances> {
  const fields = {
    Approver: aprobador.slice(0, 20),
    ApproverComment: comentario.slice(0, 200),
  };
  let lastErr: unknown;
  for (const action of ["Reject", "SetReject"] as const) {
    try {
      await postAdvanceAction(
        accessToken,
        requestNo,
        action,
        action === "SetReject" ? fields : {},
      );
      const row = await getEmpAdvance(accessToken, requestNo);
      if (isAdvanceRejected(row)) return row;
    } catch (err) {
      lastErr = err;
      const row = await readAdvanceOrNull(accessToken, requestNo);
      if (row && isAdvanceRejected(row)) return row;
      console.warn(`[anticipos] ${action} failed on ${requestNo}`, err);
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`IFS ${requestNo}: no se pudo rechazar`);
}
