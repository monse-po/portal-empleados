import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeAuthorizationCode } from "@/src/lib/ifs/oauth-user";
import {
  parseIdTokenClaims,
  resolveSessionEmail,
  sealSession,
  sessionCookieOptions,
} from "@/src/lib/ifs/session";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";

const PKCE_COOKIE = "hmv_oauth_pkce";
const STATE_COOKIE = "hmv_oauth_state";
const NEXT_COOKIE = "hmv_oauth_next";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const jar = await cookies();

  const redirectToLogin = (error: string) => {
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, url.origin),
    );
    response.cookies.delete(PKCE_COOKIE);
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(NEXT_COOKIE);
    return response;
  };

  if (oauthError) {
    return redirectToLogin(oauthError);
  }

  if (!code || !state) {
    return redirectToLogin("missing_code");
  }

  const expectedState = jar.get(STATE_COOKIE)?.value;
  const verifier = jar.get(PKCE_COOKIE)?.value;
  if (!expectedState || expectedState !== state || !verifier) {
    return redirectToLogin("invalid_state");
  }

  const next = jar.get(NEXT_COOKIE)?.value;

  try {
    const tokens = await exchangeAuthorizationCode({
      code,
      codeVerifier: verifier,
    });

    const claims = tokens.idToken ? parseIdTokenClaims(tokens.idToken) : {};
    const email = resolveSessionEmail(claims);
    if (!email) {
      return redirectToLogin("no_email_in_token");
    }

    const sealed = sealSession({
      email,
      name: claims.name,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    });

    const dest = next?.startsWith("/") ? next : "/";
    const response = NextResponse.redirect(new URL(dest, url.origin));
    response.cookies.set(
      SESSION_COOKIE,
      sealed,
      sessionCookieOptions(tokens.expiresIn),
    );
    response.cookies.delete(PKCE_COOKIE);
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(NEXT_COOKIE);
    return response;
  } catch {
    return redirectToLogin("token_exchange");
  }
}
