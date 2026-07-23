import { NextResponse } from "next/server";
import { isIfsAuthReady } from "@/src/lib/ifs/config";
import { buildIfsLogoutUrl } from "@/src/lib/ifs/oauth-user";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const loginUrl = new URL("/login", url.origin).toString();

  if (isIfsAuthReady()) {
    return NextResponse.redirect(buildIfsLogoutUrl(loginUrl));
  }

  return NextResponse.redirect(loginUrl);
}
