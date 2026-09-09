import { NextResponse, type NextRequest } from "next/server";
import { expireStalePortalCookies } from "@/src/lib/ifs/clear-portal-cookies";
import { isPortalLoginRequired } from "@/src/lib/ifs/config";
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

const LOGIN_REQUIRED = isPortalLoginRequired();

/**
 * Expira cookies legacy y, con login IFS encendido, no deja ver el portal
 * sin sesión (shell, DSE maqueta, listas vacías).
 */
export function proxy(request: NextRequest) {
  const secure = request.nextUrl.protocol === "https:";
  const { pathname, search } = request.nextUrl;

  if (LOGIN_REQUIRED && !isPublicPath(pathname) && !hasLiveSession(request)) {
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
