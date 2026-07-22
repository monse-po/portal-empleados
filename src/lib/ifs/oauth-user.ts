import { randomBytes, createHash } from "node:crypto";
import { getIfsConfig } from "@/src/lib/ifs/config";
import { IfsApiError } from "@/src/lib/ifs/errors";

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
};

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOAuthState(): string {
  return randomBytes(16).toString("base64url");
}

function authorizationEndpoint(): string {
  const { systemUrl, realm } = getOAuthRealmConfig();
  return `${systemUrl}/auth/realms/${realm}/protocol/openid-connect/auth`;
}

function getOAuthRealmConfig() {
  const systemUrl = (
    process.env.IFS_SYSTEM_URL?.trim() || "https://hmvdev.ifs360.cloud"
  ).replace(/\/$/, "");
  const realm = process.env.IFS_REALM?.trim() || "hmvdev";
  return { systemUrl, realm };
}

export function buildAuthorizationUrl(input: {
  state: string;
  codeChallenge: string;
}): string {
  const { oauthClientId, oauthRedirectUri, oauthScope } = getIfsConfig();
  if (!oauthClientId || !oauthRedirectUri) {
    throw new Error("Faltan IFS_OAUTH_CLIENT_ID o IFS_OAUTH_REDIRECT_URI");
  }

  const params = new URLSearchParams({
    client_id: oauthClientId,
    response_type: "code",
    scope: oauthScope,
    redirect_uri: oauthRedirectUri,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });

  return `${authorizationEndpoint()}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<OAuthTokens> {
  const { oauthClientId, oauthClientSecret, oauthTokenUrl, oauthRedirectUri } =
    getIfsConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: oauthClientId,
    client_secret: oauthClientSecret,
    code: input.code,
    redirect_uri: oauthRedirectUri,
    code_verifier: input.codeVerifier,
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
      `OAuth token ${res.status} ${res.statusText}`,
      res.status,
      text,
    );
  }

  const json = JSON.parse(text) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
  };

  if (!json.access_token) {
    throw new Error("OAuth: respuesta sin access_token");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    idToken: json.id_token,
    expiresIn: json.expires_in ?? 3600,
  };
}
