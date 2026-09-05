import { ifsFetch, ifsFetchAllPages, odataStringKey } from "@/src/lib/ifs/client";
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

/** LOV de Destination en CEmpAdvanceHandling (`CityCodeSet` / DestinationRef). */
export type AdvanceCityCode = {
  CountryCode?: string;
  Country?: string;
  StateCode?: string;
  State?: string;
  StateName?: string;
  CountyCode?: string;
  County?: string;
  CountyName?: string;
  CityCode?: string;
  City?: string;
  CityName?: string;
  DestinationCode?: string;
  DestinationDesc?: string;
  Description?: string;
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

function cityCodeRowKey(row: AdvanceCityCode): string {
  return [
    row.CountryCode,
    row.StateCode,
    row.CountyCode,
    row.CityCode,
    row.CityName,
  ]
    .join("|")
    .toLowerCase();
}

function mergeCityCodes(
  target: AdvanceCityCode[],
  seen: Set<string>,
  rows: AdvanceCityCode[],
) {
  for (const row of rows) {
    const key = cityCodeRowKey(row);
    if (!key.replace(/\|/g, "") || seen.has(key)) continue;
    seen.add(key);
    target.push(row);
  }
}

/**
 * CityCodeSet sin filtro a menudo devuelve 1–2 filas “de muestra”.
 * El LOV real aparece al pedir por CountryCode y seguir nextLink.
 */
export async function listAdvanceCityCodes(
  accessToken: string,
): Promise<AdvanceCityCode[]> {
  const all: AdvanceCityCode[] = [];
  const seen = new Set<string>();
  const cfg = init(accessToken);

  mergeCityCodes(
    all,
    seen,
    await ifsFetchAllPages<AdvanceCityCode>("/CityCodeSet", cfg, 80),
  );

  const countries = new Set(["CL", "CO", "EC", "MX", "PE", "US"]);
  for (const row of all) {
    const country = row.CountryCode?.trim().toUpperCase();
    if (country) countries.add(country);
  }

  await Promise.all(
    [...countries].map(async (country) => {
      const rows = await ifsFetchAllPages<AdvanceCityCode>(
        `/CityCodeSet?$filter=CountryCode eq '${country}'`,
        cfg,
        80,
      );
      mergeCityCodes(all, seen, rows);
    }),
  );

  return all;
}

export async function getAdvanceCityByDestination(
  accessToken: string,
  destination: string,
): Promise<AdvanceCityCode | null> {
  const raw = destination.trim();
  if (!raw) return null;
  const parts = raw.split("-").map((part) => part.trim()).filter(Boolean);
  const parsed =
    parts.length >= 4
      ? {
          countryCode: parts[0],
          stateCode: parts[1],
          countyCode: parts[2],
          cityCode: parts.slice(3).join("-"),
        }
      : parts.length === 1
        ? { cityCode: parts[0] }
        : {};
  const cfg = init(accessToken);

  if (parsed.countryCode && parsed.cityCode) {
    const key =
      `/CityCodeSet(CountryCode='${odataStringKey(parsed.countryCode)}'` +
      `,StateCode='${odataStringKey(parsed.stateCode || "")}'` +
      `,CountyCode='${odataStringKey(parsed.countyCode || "")}'` +
      `,CityCode='${odataStringKey(parsed.cityCode)}')`;
    try {
      return await ifsFetch<AdvanceCityCode>(key, cfg);
    } catch {
      /* probar filtro */
    }
  }

  const filters: string[] = [];
  if (parsed.countryCode && parsed.cityCode) {
    filters.push(
      `CountryCode eq '${odataStringKey(parsed.countryCode)}' and CityCode eq '${odataStringKey(parsed.cityCode)}'`,
    );
  }
  if (parsed.cityCode) {
    filters.push(`CityCode eq '${odataStringKey(parsed.cityCode)}'`);
  }
  filters.push(`DestinationCode eq '${odataStringKey(raw)}'`);

  for (const filter of filters) {
    try {
      const data = await ifsFetch<ODataCollection<AdvanceCityCode>>(
        `/CityCodeSet?$filter=${encodeURIComponent(filter)}&$top=5`,
        cfg,
      );
      const rows = collection<AdvanceCityCode>(data);
      if (rows[0]) return rows[0];
    } catch {
      /* siguiente filtro */
    }
  }
  return null;
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
