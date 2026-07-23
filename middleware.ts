import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isIfsDevTokenBypass } from "@/src/lib/ifs/config";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";

const PUBLIC_PREFIXES = ["/login", "/api/auth", "/dev", "/api/dev"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  if (
    process.env.IFS_AUTH_ENABLED !== "true" ||
    isIfsDevTokenBypass()
  ) {
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

  if (request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
