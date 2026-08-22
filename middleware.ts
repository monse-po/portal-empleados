import { NextResponse } from "next/server";

/** Por ahora no hay puerta de login: se entra directo al portal. */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
