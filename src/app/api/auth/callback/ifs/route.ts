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
  const clearOAuthCookies = () => {
    jar.delete(PKCE_COOKIE);
    jar.delete(STATE_COOKIE);
    jar.delete(NEXT_COOKIE);
  };

  if (oauthError) {
    clearOAuthCookies();
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(oauthError)}`, url.origin),
    );
  }

  if (!code || !state) {
    clearOAuthCookies();
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const expectedState = jar.get(STATE_COOKIE)?.value;
  const verifier = jar.get(PKCE_COOKIE)?.value;
  if (!expectedState || expectedState !== state || !verifier) {
    clearOAuthCookies();
    return NextResponse.redirect(new URL("/login?error=invalid_state", url.origin));
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
      clearOAuthCookies();
      return NextResponse.redirect(
        new URL("/login?error=no_email_in_token", url.origin),
      );
    }

    const sealed = sealSession({
      email,
      name: claims.name,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + tokens.expiresIn * 1000,
    });

    jar.set(SESSION_COOKIE, sealed, sessionCookieOptions(tokens.expiresIn));
    clearOAuthCookies();

    const dest = next?.startsWith("/") ? next : "/";
    return NextResponse.redirect(new URL(dest, url.origin));
  } catch {
    clearOAuthCookies();
    return NextResponse.redirect(new URL("/login?error=token_exchange", url.origin));
  }
}
