import { getIfsConfig } from "@/src/lib/ifs/config";
import { assertIfsOk } from "@/src/lib/ifs/errors";

export type IfsRequestInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  accessToken: string;
  ifMatch?: string;
  /** Si se omite, usa CEmpPortalServices (`int`). Sobrescribe IFS_CEMP_PORTAL_BASE_URL (p. ej. canal /main/ vs /int/). */
  baseUrl?: string;
};

type ODataPage<T> = {
  value?: T[];
  "@odata.nextLink"?: string;
};

export async function ifsFetch<T>(
  path: string,
  init: IfsRequestInit,
): Promise<T> {
  const { cempPortalBaseUrl } = getIfsConfig();
  const root = (init.baseUrl || cempPortalBaseUrl).replace(/\/$/, "");
  const url = path.startsWith("http")
    ? path
    : `${root}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": "es-CO,es;q=0.9",
    Authorization: `Bearer ${init.accessToken}`,
    ...init.headers,
  };

  if (init.ifMatch) {
    headers["If-Match"] = init.ifMatch;
  }

  const { accessToken: _token, ifMatch: _etag, baseUrl: _base, ...rest } = init;

  const res = await fetch(url, { ...rest, headers });
  const text = await res.text();
  assertIfsOk(res, text);

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/**
 * Recorre @odata.nextLink. IFS Cloud a menudo ignora $top grande y corta
 * la primera página (20–25 filas) — sin esto el LOV parece “una categoría”.
 */
export async function ifsFetchAllPages<T>(
  path: string,
  init: IfsRequestInit,
  maxPages = 40,
): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let next: string | undefined = path;

  for (let page = 0; next && page < maxPages; page += 1) {
    if (seen.has(next)) break;
    seen.add(next);
    const data: ODataPage<T> | T[] = await ifsFetch<ODataPage<T> | T[]>(
      next,
      {
        ...init,
        headers: {
          Prefer: "odata.maxpagesize=500",
          ...init.headers,
        },
      },
    );
    if (Array.isArray(data)) {
      rows.push(...data);
      break;
    }
    rows.push(...(data.value ?? []));
    next = data["@odata.nextLink"];
  }

  return rows;
}

/** Convierte …/int/… → …/main/… (canal UI Aurena). */
export function cempPortalMainBaseUrl(intBaseUrl?: string): string {
  const { cempPortalBaseUrl } = getIfsConfig();
  const base = intBaseUrl ?? cempPortalBaseUrl;
  return base.replace("/int/ifsapplications/", "/main/ifsapplications/");
}

/** Base URL de otra proyección en el mismo host (p. ej. AddressInfoHandling.svc). */
export function projectionSiblingBaseUrl(serviceName: string): string {
  const { cempPortalBaseUrl } = getIfsConfig();
  const svc = serviceName.endsWith(".svc") ? serviceName : `${serviceName}.svc`;
  return cempPortalBaseUrl.replace(/\/[^/]+\.svc\/?$/, `/${svc}`);
}

/** Proyección hermana en el canal /main/ (Aurena). /int/ a menudo no publica el metadata. */
export function projectionMainSiblingBaseUrl(serviceName: string): string {
  return cempPortalMainBaseUrl().replace(
    /\/[^/]+\.svc\/?$/,
    `/${serviceName.endsWith(".svc") ? serviceName : `${serviceName}.svc`}`,
  );
}

/** Escapa comillas simples en literales OData entre comillas. */
export function odataStringKey(value: string): string {
  return value.replace(/'/g, "''");
}

/** Escapa EmailId para clave OData: CEmpPortalUserSet(EmailId='…') */
export function odataEmailKey(emailId: string): string {
  return odataStringKey(emailId);
}

export function cempPortalUserPath(emailId: string): string {
  return `/CEmpPortalUserSet(EmailId='${odataEmailKey(emailId)}')`;
}
