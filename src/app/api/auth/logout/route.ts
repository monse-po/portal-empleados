import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";
import { expiredSessionCookieOptions } from "@/src/lib/ifs/session-cookie";

const OAUTH_COOKIES = ["hmv_oauth_pkce", "hmv_oauth_state", "hmv_oauth_next", "hmv_oauth_email"] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/login", url.origin));
  const expired = expiredSessionCookieOptions();

  response.cookies.set(SESSION_COOKIE, "", expired);
  for (const name of OAUTH_COOKIES) {
    response.cookies.set(name, "", expired);
  }

  return response;
}
