import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { IMPERSONATE_COOKIE, SESSION_COOKIE } from "@/src/lib/ifs/constants";
import { destroyPersistedIfsSession } from "@/src/lib/ifs/session";
import { expiredSessionCookieOptions } from "@/src/lib/ifs/session-cookie";
import { getFocusModule, getHomePathForRole } from "@/src/lib/modules";

const OAUTH_COOKIES = ["hmv_oauth_pkce", "hmv_oauth_state", "hmv_oauth_next", "hmv_oauth_email"] as const;

/** Limpia cookies del portal. No redirige a IFS (evita 400 por cookies enormes en ifs360.cloud). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  await destroyPersistedIfsSession(jar.get(SESSION_COOKIE)?.value);

  const defaultNext = getFocusModule()
    ? getHomePathForRole("empleado")
    : "/hoja-tiempo";
  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("next", defaultNext);
  loginUrl.searchParams.set("hint", "clear_ifs_cookies");

  const response = NextResponse.redirect(loginUrl);
  const expired = expiredSessionCookieOptions();

  response.cookies.set(SESSION_COOKIE, "", expired);
  response.cookies.set(IMPERSONATE_COOKIE, "", expired);
  for (const name of OAUTH_COOKIES) {
    response.cookies.set(name, "", expired);
  }

  return response;
}
