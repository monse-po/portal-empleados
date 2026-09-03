import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { expireAllPortalAuthCookies } from "@/src/lib/ifs/clear-portal-cookies";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";
import { resolvePublicOrigin } from "@/src/lib/ifs/oauth-user";
import { destroyPersistedIfsSession } from "@/src/lib/ifs/session";

/** Limpia cookies del portal y vuelve al login (útil tras 400 Cookie Too Large). */
export async function GET(request: Request) {
  const jar = await cookies();
  await destroyPersistedIfsSession(jar.get(SESSION_COOKIE)?.value);

  const origin = resolvePublicOrigin(request);
  const response = NextResponse.redirect(new URL("/login", origin));
  expireAllPortalAuthCookies(response, origin.startsWith("https://"));
  return response;
}
