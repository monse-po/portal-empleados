import { getIfsConfig } from "@/src/lib/ifs/config";
import { assertIfsOk } from "@/src/lib/ifs/errors";

export type IfsRequestInit = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  accessToken: string;
  ifMatch?: string;
};

export async function ifsFetch<T>(
  path: string,
  init: IfsRequestInit,
): Promise<T> {
  const { cempPortalBaseUrl } = getIfsConfig();
  const url = path.startsWith("http")
    ? path
    : `${cempPortalBaseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${init.accessToken}`,
    ...init.headers,
  };

  if (init.ifMatch) {
    headers["If-Match"] = init.ifMatch;
  }

  const { accessToken: _token, ifMatch: _etag, ...rest } = init;

  const res = await fetch(url, { ...rest, headers });
  const text = await res.text();
  assertIfsOk(res, text);

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** Escapa EmailId para clave OData: CEmpPortalUserSet(EmailId='…') */
export function odataEmailKey(emailId: string): string {
  return emailId.replace(/'/g, "''");
}

export function cempPortalUserPath(emailId: string): string {
  return `/CEmpPortalUserSet(EmailId='${odataEmailKey(emailId)}')`;
}
