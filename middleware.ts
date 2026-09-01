import { NextResponse, type NextRequest } from "next/server";
import {
  LEGACY_SESSION_COOKIE,
  SESSION_COOKIE,
} from "@/src/lib/ifs/constants";

const OAUTH_COOKIES = [
  "hmv_oauth_pkce",
  "hmv_oauth_state",
  "hmv_oauth_next",
  "hmv_oauth_email",
  "hmv_oauth_redirect",
] as const;

function expireCookie(
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
 * Expira la cookie JWT legacy en cada respuesta para ir bajando el tamaño
 * del header Cookie (mitiga 400 Cookie Too Large en visitas siguientes).
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const secure = request.nextUrl.protocol === "https:";
  const hasLegacy = Boolean(request.cookies.get(LEGACY_SESSION_COOKIE)?.value);
  if (hasLegacy) {
    expireCookie(response, LEGACY_SESSION_COOKIE, secure);
  }
  // Si alguien llegó con ambas, no tocamos SESSION_COOKIE nueva.
  void SESSION_COOKIE;
  void OAUTH_COOKIES;
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
