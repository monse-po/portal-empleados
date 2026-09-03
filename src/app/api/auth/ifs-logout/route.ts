import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { expireAllPortalAuthCookies } from "@/src/lib/ifs/clear-portal-cookies";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";
import { resolvePublicOrigin } from "@/src/lib/ifs/oauth-user";
import { destroyPersistedIfsSession } from "@/src/lib/ifs/session";
import { getFocusModule, getHomePathForRole } from "@/src/lib/modules";

/** Limpia cookies del portal. No redirige a IFS (evita 400 por cookies enormes en ifs360.cloud). */
export async function GET(request: Request) {
  const jar = await cookies();
  await destroyPersistedIfsSession(jar.get(SESSION_COOKIE)?.value);

  const origin = resolvePublicOrigin(request);
  const defaultNext = getFocusModule()
    ? getHomePathForRole("empleado")
    : "/hoja-tiempo";
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("next", defaultNext);
  loginUrl.searchParams.set("hint", "clear_ifs_cookies");

  const response = NextResponse.redirect(loginUrl);
  expireAllPortalAuthCookies(response, origin.startsWith("https://"));
  return response;
}
