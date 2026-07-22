import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isIfsAuthReady } from "@/src/lib/ifs/config";
import {
  buildAuthorizationUrl,
  createOAuthState,
  createPkcePair,
} from "@/src/lib/ifs/oauth-user";
import { sessionCookieOptions } from "@/src/lib/ifs/session";

const PKCE_COOKIE = "hmv_oauth_pkce";
const STATE_COOKIE = "hmv_oauth_state";

export async function GET(request: Request) {
  if (!isIfsAuthReady()) {
    return NextResponse.json(
      { error: "IFS_AUTH_ENABLED requiere IFS_OAUTH_CLIENT_ID, SECRET y REDIRECT_URI" },
      { status: 503 },
    );
  }

  const { verifier, challenge } = createPkcePair();
  const state = createOAuthState();
  const jar = await cookies();
  const opts = sessionCookieOptions(600);

  jar.set(PKCE_COOKIE, verifier, opts);
  jar.set(STATE_COOKIE, state, opts);

  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  if (next?.startsWith("/")) {
    jar.set("hmv_oauth_next", next, opts);
  }

  const authUrl = buildAuthorizationUrl({ state, codeChallenge: challenge });
  return NextResponse.redirect(authUrl);
}
