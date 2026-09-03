import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  expirePortalCookie,
  expireStalePortalCookies,
} from "@/src/lib/ifs/clear-portal-cookies";
import {
  OAUTH_BUNDLE_COOKIE,
  SESSION_COOKIE,
} from "@/src/lib/ifs/constants";
import { unsealOAuthBundle } from "@/src/lib/ifs/oauth-cookie-bundle";
import {
  exchangeAuthorizationCode,
  fetchOidcUserInfo,
  resolvePublicOrigin,
} from "@/src/lib/ifs/oauth-user";
import {
  createPersistedIfsSession,
  isSystemPortalEmail,
  parseAccessTokenClaims,
  parseIdTokenClaims,
  resolveSessionEmail,
  sessionCookieOptions,
} from "@/src/lib/ifs/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const jar = await cookies();
  const origin = resolvePublicOrigin(request);
  const secure = origin.startsWith("https://");

  const redirectToLogin = (error: string) => {
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, origin),
    );
    expirePortalCookie(response, OAUTH_BUNDLE_COOKIE, secure);
    expireStalePortalCookies(response, secure);
    return response;
  };

  if (oauthError) {
    return redirectToLogin(oauthError);
  }

  if (!code || !state) {
    return redirectToLogin("missing_code");
  }

  const bundle = unsealOAuthBundle(jar.get(OAUTH_BUNDLE_COOKIE)?.value ?? "");
  if (!bundle || bundle.state !== state) {
    return redirectToLogin("invalid_state");
  }

  try {
    const tokens = await exchangeAuthorizationCode({
      code,
      codeVerifier: bundle.verifier,
      redirectUri: bundle.redirectUri,
    });

    const idClaims = tokens.idToken ? parseIdTokenClaims(tokens.idToken) : {};
    const accessClaims = parseAccessTokenClaims(tokens.accessToken);
    const mergedClaims = { ...accessClaims, ...idClaims };

    let email = bundle.email
      ? resolveSessionEmail({
          email: bundle.email,
          preferred_username: bundle.email,
          username: bundle.email,
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
      return redirectToLogin("no_email_in_token");
    }
    if (isSystemPortalEmail(email)) {
      return redirectToLogin("system_account_email");
    }

    const expiresIn = Math.max(tokens.expiresIn || 0, 3600);
    const { cookieValue } = await createPersistedIfsSession({
      email,
      name: mergedClaims.name,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    });

    const dest = bundle.next?.startsWith("/") ? bundle.next : "/";
    const response = NextResponse.redirect(new URL(dest, origin));
    response.cookies.set(
      SESSION_COOKIE,
      cookieValue,
      sessionCookieOptions(expiresIn),
    );
    expirePortalCookie(response, OAUTH_BUNDLE_COOKIE, secure);
    expireStalePortalCookies(response, secure);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth/callback/ifs] fallo al completar login:", message);
    if (message.includes("PortalIfsSession") || message.includes("prisma")) {
      return redirectToLogin("session_store");
    }
    return redirectToLogin("token_exchange");
  }
}
