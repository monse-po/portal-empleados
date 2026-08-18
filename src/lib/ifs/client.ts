import { getIfsConfig } from "@/src/lib/ifs/config";
import { assertIfsOk } from "@/src/lib/ifs/errors";

export type IfsRequestInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  accessToken: string;
  ifMatch?: string;
  /** Si se omite, usa CEmpPortalServices (`int`). */
  baseUrl?: string;
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
    Authorization: `Bearer ${init.accessToken}`,
    ...init.headers,
  };

  if (init.ifMatch) {
    headers["If-Match"] = init.ifMatch;
  }

  const { accessToken: _token, ifMatch: _etag, baseUrl: _base, ...rest } =
    init;

  const res = await fetch(url, { ...rest, headers });
  const text = await res.text();
  assertIfsOk(res, text);

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
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
