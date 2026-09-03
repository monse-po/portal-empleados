import { NextResponse, type NextRequest } from "next/server";
import { expireStalePortalCookies } from "@/src/lib/ifs/clear-portal-cookies";

/**
 * Expira cookies legacy y OAuth sueltas en cada respuesta.
 * La cookie JWT vieja (`hmv_ifs_session`) puede provocar 400 Cookie Too Large
 * en Cloudflare antes de llegar a Node.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const secure = request.nextUrl.protocol === "https:";
  expireStalePortalCookies(response, secure);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
