import { getIfsConfig, isIfsConfigured } from "@/src/lib/ifs/config";
import { IfsApiError } from "@/src/lib/ifs/errors";

export type IfsAccessToken = {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  scope?: string;
};

let cachedToken: { value: IfsAccessToken; expiresAt: number } | null = null;

/** Token OAuth vía client_credentials (Oracle IDCS). */
export async function fetchIfsAccessToken(): Promise<IfsAccessToken> {
  if (!isIfsConfigured()) {
    throw new Error(
      "IFS no configurado: faltan IFS_IDCS_CLIENT_ID, IFS_IDCS_CLIENT_SECRET o token URL",
    );
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const { oauthClientId, oauthClientSecret, oauthTokenUrl, oauthScope } =
    getIfsConfig();

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: oauthClientId,
    client_secret: oauthClientSecret,
    scope: oauthScope,
  });

  const res = await fetch(oauthTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new IfsApiError(
      `IDCS token ${res.status} ${res.statusText}`,
      res.status,
      text,
    );
  }

  const json = JSON.parse(text) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
  };

  if (!json.access_token) {
    throw new Error("IDCS: respuesta sin access_token");
  }

  const value: IfsAccessToken = {
    accessToken: json.access_token,
    tokenType: json.token_type ?? "Bearer",
    expiresIn: json.expires_in,
    scope: json.scope,
  };

  cachedToken = {
    value,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };

  return value;
}

export function clearIfsTokenCache(): void {
  cachedToken = null;
}
