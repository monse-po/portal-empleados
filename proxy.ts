import { NextResponse, type NextRequest } from "next/server";
import { expireStalePortalCookies } from "@/src/lib/ifs/clear-portal-cookies";
import {
  LEGACY_SESSION_COOKIE,
  SESSION_COOKIE,
} from "@/src/lib/ifs/constants";
import { isSessionCookieAlive } from "@/src/lib/ifs/session-cookie";

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname === "/icon.png") return true;
  return false;
}

function hasLiveSession(request: NextRequest): boolean {
  return (
    isSessionCookieAlive(request.cookies.get(SESSION_COOKIE)?.value) ||
    isSessionCookieAlive(request.cookies.get(LEGACY_SESSION_COOKIE)?.value)
  );
}

const AUTH_ENABLED =
  process.env.NEXT_PUBLIC_IFS_AUTH_ENABLED === "true" ||
  process.env.IFS_AUTH_ENABLED === "true";

/**
 * Expira cookies legacy y, con login IFS encendido, no deja ver el portal
 * sin sesión (shell, DSE maqueta, listas vacías).
 */
export function proxy(request: NextRequest) {
  const secure = request.nextUrl.protocol === "https:";
  const { pathname, search } = request.nextUrl;

  if (AUTH_ENABLED && !isPublicPath(pathname) && !hasLiveSession(request)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    const next = `${pathname}${search}`;
    if (next.startsWith("/") && !next.startsWith("//") && next !== "/login") {
      login.searchParams.set("next", next);
    }
    const redirect = NextResponse.redirect(login);
    expireStalePortalCookies(redirect, secure);
    return redirect;
  }

  const response = NextResponse.next();
  expireStalePortalCookies(response, secure);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
