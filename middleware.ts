import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";
import {
  expiredSessionCookieOptions,
  isSessionCookieAlive,
} from "@/src/lib/ifs/session-cookie";

const PUBLIC_PREFIXES = ["/login", "/api/auth", "/dev", "/api/dev"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isDevTokenBypass(): boolean {
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV === "production") return false;
  return Boolean(
    process.env.IFS_DEV_ACCESS_TOKEN?.trim() &&
      process.env.IFS_DEV_EMAIL?.trim(),
  );
}

export function middleware(request: NextRequest) {
  if (process.env.IFS_AUTH_ENABLED !== "true" || isDevTokenBypass()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (
    isPublicPath(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (isSessionCookieAlive(raw)) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  if (raw) {
    login.searchParams.set("error", "session_expired");
  }

  const response = NextResponse.redirect(login);
  if (raw) {
    response.cookies.set(SESSION_COOKIE, "", expiredSessionCookieOptions());
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
