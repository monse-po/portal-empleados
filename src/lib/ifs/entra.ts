import { createPkcePair, resolvePublicOrigin } from "@/src/lib/ifs/oauth-user";
import { resolveSessionEmail } from "@/src/lib/ifs/session";

export function getEntraConfig() {
  const clientId = (
    process.env.IFS_ENTRA_CLIENT_ID?.trim() ||
    process.env.ENTRA_CLIENT_ID?.trim() ||
    ""
  );
  const tenant =
    process.env.IFS_ENTRA_TENANT?.trim() ||
    process.env.ENTRA_TENANT?.trim() ||
    "common";
  const secret = process.env.IFS_ENTRA_CLIENT_SECRET?.trim() || "";
  return { clientId, tenant, secret };
}

export function isEntraLoginReady(): boolean {
  return Boolean(getEntraConfig().clientId);
}

export function entraRedirectUri(request: Request): string {
  const configured = process.env.IFS_ENTRA_REDIRECT_URI?.trim();
  if (configured) return configured;
  const origin = resolvePublicOrigin(request).replace(/\/$/, "");
  return `${origin}/api/auth/callback/microsoft`;
}

export function buildEntraAuthorizationUrl(input: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
  loginHint?: string;
}): string {
  const { clientId, tenant } = getEntraConfig();
  if (!clientId) throw new Error("Falta IFS_ENTRA_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "openid email profile User.Read",
    redirect_uri: input.redirectUri,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    response_mode: "query",
  });
  const hint = input.loginHint?.trim();
  if (hint) params.set("login_hint", hint);
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

export function newEntraPkce() {
  return createPkcePair();
}

export async function exchangeEntraCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ email?: string }> {
  const { clientId, tenant, secret } = getEntraConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code: input.code,
    redirect_uri: input.redirectUri,
    code_verifier: input.codeVerifier,
    scope: "openid email profile User.Read",
  });
  if (secret) body.set("client_secret", secret);

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Entra token ${res.status}`);
  }
  let json: { id_token?: string; access_token?: string };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    throw new Error("Entra token: respuesta no JSON");
  }
  const email = emailFromJwt(json.id_token) ?? (await graphMeEmail(json.access_token));
  return { email };
}

function emailFromJwt(idToken?: string): string | undefined {
  if (!idToken) return undefined;
  const part = idToken.split(".")[1];
  if (!part) return undefined;
  try {
    const payload = JSON.parse(
      Buffer.from(part, "base64url").toString("utf8"),
    ) as {
      email?: string;
      preferred_username?: string;
      upn?: string;
      unique_name?: string;
    };
    return resolveSessionEmail({
      email: payload.email,
      preferred_username: payload.preferred_username,
      upn: payload.upn,
      unique_name: payload.unique_name,
    });
  } catch {
    return undefined;
  }
}

async function graphMeEmail(accessToken?: string): Promise<string | undefined> {
  if (!accessToken) return undefined;
  const res = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return undefined;
  try {
    const me = (await res.json()) as { mail?: string; userPrincipalName?: string };
    return resolveSessionEmail({
      email: me.mail,
      preferred_username: me.userPrincipalName,
      upn: me.userPrincipalName,
    });
  } catch {
    return undefined;
  }
}
