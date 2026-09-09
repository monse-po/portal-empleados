import { fetchOidcUserInfo, type OAuthTokens } from "@/src/lib/ifs/oauth-user";
import {
  createPersistedIfsSession,
  isSystemPortalEmail,
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

  const expiresIn = Math.max(tokens.expiresIn || 0, 3600);
  const { cookieValue } = await createPersistedIfsSession({
    email,
    name: mergedClaims.name,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return { cookieValue, expiresIn, email };
}
