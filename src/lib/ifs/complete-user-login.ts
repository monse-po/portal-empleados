import { fetchIfsAccessToken } from "@/src/lib/ifs/auth";
import { openCempPortalSession } from "@/src/lib/ifs/cemp-portal";
import { fetchOidcUserInfo, type OAuthTokens } from "@/src/lib/ifs/oauth-user";
import { IFS_SESSION_TTL_SEC } from "@/src/lib/ifs/constants";
import {
  createPersistedIfsSession,
  isSystemPortalEmail,
  nextIfsSessionExpiry,
  parseAccessTokenClaims,
  parseIdTokenClaims,
  resolveSessionEmail,
} from "@/src/lib/ifs/session";

export class IfsLoginFlowError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "IfsLoginFlowError";
  }
}

export type CompletedIfsLogin = {
  cookieValue: string;
  expiresIn: number;
  email: string;
};

export async function completeUserLoginFromTokens(input: {
  tokens: OAuthTokens;
  typedEmail?: string;
}): Promise<CompletedIfsLogin> {
  const { tokens, typedEmail } = input;
  const idClaims = tokens.idToken ? parseIdTokenClaims(tokens.idToken) : {};
  const accessClaims = parseAccessTokenClaims(tokens.accessToken);
  const mergedClaims = { ...accessClaims, ...idClaims };

  let email = typedEmail
    ? resolveSessionEmail({
        email: typedEmail,
        preferred_username: typedEmail,
        username: typedEmail,
      })
    : undefined;
  if (!email) {
    email = resolveSessionEmail(mergedClaims);
  }
  if (!email) {
    const userinfo = await fetchOidcUserInfo(tokens.accessToken);
    email = resolveSessionEmail({ ...mergedClaims, ...userinfo });
  }
  if (!email) {
    throw new IfsLoginFlowError("no_email_in_token");
  }
  if (isSystemPortalEmail(email)) {
    throw new IfsLoginFlowError("system_account_email");
  }

  const { cookieValue } = await createPersistedIfsSession({
    email,
    name: mergedClaims.name,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: nextIfsSessionExpiry(),
    tokenExpiresAt:
      Date.now() + Math.max(tokens.expiresIn || 0, 60) * 1000,
  });

  return { cookieValue, expiresIn: IFS_SESSION_TTL_SEC, email };
}

/**
 * Microsoft ya dijo quién es. Abrimos CEmp con el token del portal
 * (mismo patrón que catálogos M2M) y guardamos sesión de este sitio.
 */
export async function completeUserLoginFromVerifiedEmail(
  emailRaw: string,
): Promise<CompletedIfsLogin> {
  const email = resolveSessionEmail({
    email: emailRaw,
    preferred_username: emailRaw,
    username: emailRaw,
    upn: emailRaw,
  });
  if (!email) {
    throw new IfsLoginFlowError("no_email_in_token");
  }
  if (isSystemPortalEmail(email)) {
    throw new IfsLoginFlowError("system_account_email");
  }

  const m2m = await fetchIfsAccessToken();
  try {
    await openCempPortalSession(email, m2m.accessToken);
  } catch {
    throw new IfsLoginFlowError("user_not_in_ifs");
  }

  const { cookieValue } = await createPersistedIfsSession({
    email,
    accessToken: m2m.accessToken,
    expiresAt: nextIfsSessionExpiry(),
    tokenExpiresAt: Date.now() + Math.max(m2m.expiresIn || 0, 60) * 1000,
  });
  return { cookieValue, expiresIn: IFS_SESSION_TTL_SEC, email };
}
