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

/** Origen público (Cloudflare / https://localhost). */
export function resolvePublicOrigin(request: Request): string {
  const url = new URL(request.url);
  const xfHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (xfHost) {
    return `${xfProto || "https"}://${xfHost}`;
  }
  return url.origin;
}

/**
 * redirect_uri del flujo actual.
 * - localhost → https://localhost:PORT/api/auth/callback/ifs (túnel)
 * - resto → IFS_OAUTH_REDIRECT_URI o origen público
 */
export function resolveOAuthRedirectUri(request: Request): string {
  const configured = getIfsConfig().oauthRedirectUri?.trim();
  const origin = resolvePublicOrigin(request).replace(/\/$/, "");
  const derived = `${origin}/api/auth/callback/ifs`;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    // Forzar https en callback local (IFS a veces manda https://localhost:3001)
    if (origin.startsWith("http://")) {
      return `https://${origin.slice("http://".length)}/api/auth/callback/ifs`;
    }
    return derived;
  }
  return configured || derived;
}

export function buildAuthorizationUrl(input: {
  state: string;
  codeChallenge: string;
  loginHint?: string;
  redirectUri?: string;
}): string {
  const { oauthClientId, oauthRedirectUri, oauthScope } = getIfsConfig();
  const redirectUri = input.redirectUri || oauthRedirectUri;
  if (!oauthClientId || !redirectUri) {
    throw new Error("Faltan IFS_OAUTH_CLIENT_ID o IFS_OAUTH_REDIRECT_URI");
  }

  const params = new URLSearchParams({
    client_id: oauthClientId,
    response_type: "code",
    scope: oauthScope,
    redirect_uri: redirectUri,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
  });

  const hint = input.loginHint?.trim();
  if (hint) {
    params.set("login_hint", hint);
  }

  return `${authorizationEndpoint()}?${params.toString()}`;
}

export function buildIfsLogoutUrl(postLogoutRedirect: string): string {
  const { systemUrl, realm } = getOAuthRealmConfig();
  const { oauthClientId } = getIfsConfig();
  const params = new URLSearchParams({
    client_id: oauthClientId,
    post_logout_redirect_uri: postLogoutRedirect,
  });
  return `${systemUrl}/auth/realms/${realm}/protocol/openid-connect/logout?${params.toString()}`;
}

export async function fetchOidcUserInfo(accessToken: string): Promise<{
  email?: string;
  name?: string;
  preferred_username?: string;
  upn?: string;
}> {
  const { systemUrl, realm } = getOAuthRealmConfig();
  const url = `${systemUrl}/auth/realms/${realm}/protocol/openid-connect/userinfo`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return {};

  try {
    return (await res.json()) as {
      email?: string;
      name?: string;
      preferred_username?: string;
      upn?: string;
    };
  } catch {
    return {};
  }
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri?: string;
}): Promise<OAuthTokens> {
  const { oauthClientId, oauthClientSecret, oauthTokenUrl, oauthRedirectUri } =
    getIfsConfig();
  const redirectUri = input.redirectUri || oauthRedirectUri;
  if (!redirectUri) {
    throw new Error("Falta redirect_uri para canjear el código OAuth");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: oauthClientId,
    client_secret: oauthClientSecret,
    code: input.code,
    redirect_uri: redirectUri,
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

export async function refreshAccessToken(
  refreshToken: string,
): Promise<OAuthTokens> {
  const { oauthClientId, oauthClientSecret, oauthTokenUrl } = getIfsConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: oauthClientId,
    client_secret: oauthClientSecret,
    refresh_token: refreshToken,
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
      `OAuth refresh ${res.status} ${res.statusText}`,
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
    throw new Error("OAuth refresh: respuesta sin access_token");
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    idToken: json.id_token,
    expiresIn: json.expires_in ?? 3600,
  };
}
