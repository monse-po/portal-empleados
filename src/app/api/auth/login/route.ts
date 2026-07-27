import { NextResponse } from "next/server";
import { isIfsAuthReady } from "@/src/lib/ifs/config";
import {
  buildAuthorizationUrl,
  createOAuthState,
  createPkcePair,
} from "@/src/lib/ifs/oauth-user";
import { sessionCookieOptions, resolveSessionEmail } from "@/src/lib/ifs/session";

const PKCE_COOKIE = "hmv_oauth_pkce";
const STATE_COOKIE = "hmv_oauth_state";
const EMAIL_COOKIE = "hmv_oauth_email";

export async function GET(request: Request) {
  if (!isIfsAuthReady()) {
    return NextResponse.json(
      { error: "IFS_AUTH_ENABLED requiere IFS_OAUTH_CLIENT_ID, SECRET y REDIRECT_URI" },
      { status: 503 },
    );
  }

  const { verifier, challenge } = createPkcePair();
  const state = createOAuthState();
  const opts = sessionCookieOptions(600);

  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const loginHint = url.searchParams.get("email")?.trim();
  const loginEmail = loginHint
    ? resolveSessionEmail({
        email: loginHint,
        preferred_username: loginHint,
        username: loginHint,
      })
    : undefined;
  const authUrl = buildAuthorizationUrl({
    state,
    codeChallenge: challenge,
    loginHint: loginEmail ?? loginHint,
  });
  const response = NextResponse.redirect(authUrl);

  // Cookies en la respuesta de redirect (cookies() del jar no siempre viajan en Vercel).
  response.cookies.set(PKCE_COOKIE, verifier, opts);
  response.cookies.set(STATE_COOKIE, state, opts);
  if (next?.startsWith("/")) {
    response.cookies.set("hmv_oauth_next", next, opts);
  }
  if (loginEmail) {
    response.cookies.set(EMAIL_COOKIE, loginEmail, opts);
  }

  return response;
}
