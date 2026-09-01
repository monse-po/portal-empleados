import { NextResponse } from "next/server";
import {
  IMPERSONATE_COOKIE,
  LEGACY_SESSION_COOKIE,
  SESSION_COOKIE,
} from "@/src/lib/ifs/constants";
import { destroyPersistedIfsSession } from "@/src/lib/ifs/session";
import { expiredSessionCookieOptions } from "@/src/lib/ifs/session-cookie";
import { cookies } from "next/headers";

const OAUTH_COOKIES = [
  "hmv_oauth_pkce",
  "hmv_oauth_state",
  "hmv_oauth_next",
  "hmv_oauth_email",
  "hmv_oauth_redirect",
] as const;

/** Limpia cookies del portal y vuelve al login (útil tras 400 Cookie Too Large). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  await destroyPersistedIfsSession(jar.get(SESSION_COOKIE)?.value);

  const response = NextResponse.redirect(new URL("/login", url.origin));
  const expired = expiredSessionCookieOptions();
  response.cookies.set(SESSION_COOKIE, "", expired);
  response.cookies.set(LEGACY_SESSION_COOKIE, "", expired);
  response.cookies.set(IMPERSONATE_COOKIE, "", expired);
  for (const name of OAUTH_COOKIES) {
    response.cookies.set(name, "", expired);
  }
  return response;
}
