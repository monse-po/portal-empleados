import type { NextResponse } from "next/server";
import {
  IMPERSONATE_COOKIE,
  LEGACY_OAUTH_COOKIES,
  LEGACY_SESSION_COOKIE,
  OAUTH_BUNDLE_COOKIE,
  SESSION_COOKIE,
} from "@/src/lib/ifs/constants";

export function expirePortalCookie(
  response: NextResponse,
  name: string,
  secure: boolean,
) {
  response.cookies.set(name, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Expira cookies legacy / OAuth sueltas (mitiga 400 Cookie Too Large).
 * No toca `hmv_oauth_ctx`: hace falta entre /login → IFS → callback.
 */
export function expireStalePortalCookies(
  response: NextResponse,
  secure: boolean,
) {
  expirePortalCookie(response, LEGACY_SESSION_COOKIE, secure);
  for (const name of LEGACY_OAUTH_COOKIES) {
    expirePortalCookie(response, name, secure);
  }
}

export function expireAllPortalAuthCookies(
  response: NextResponse,
  secure: boolean,
) {
  expirePortalCookie(response, SESSION_COOKIE, secure);
  expirePortalCookie(response, IMPERSONATE_COOKIE, secure);
  expirePortalCookie(response, OAUTH_BUNDLE_COOKIE, secure);
  expireStalePortalCookies(response, secure);
}
