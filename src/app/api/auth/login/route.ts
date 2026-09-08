import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isIfsAuthReady } from "@/src/lib/ifs/config";
import { expireStalePortalCookies } from "@/src/lib/ifs/clear-portal-cookies";
import {
  LEGACY_SESSION_COOKIE,
  OAUTH_BUNDLE_COOKIE,
  SESSION_COOKIE,
} from "@/src/lib/ifs/constants";
import { sealOAuthBundle } from "@/src/lib/ifs/oauth-cookie-bundle";
import {
  buildAuthorizationUrl,
  createOAuthState,
  createPkcePair,
  resolveOAuthRedirectUri,
} from "@/src/lib/ifs/oauth-user";
import {
  destroyPersistedIfsSession,
  resolveSessionEmail,
  sessionCookieOptions,
} from "@/src/lib/ifs/session";

/** 127.0.0.1 y localhost no comparten cookies: alinear con el callback de IFS. */
function canonicalizeLocalLoginHost(
  requestUrl: URL,
  redirectUri: string,
): URL | null {
  if (requestUrl.hostname !== "127.0.0.1") return null;
  try {
    const callback = new URL(redirectUri);
    if (callback.hostname !== "localhost") return null;
    const aligned = new URL(
      `${requestUrl.pathname}${requestUrl.search}`,
      callback.origin,
    );
    return aligned;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  if (!isIfsAuthReady()) {
    return NextResponse.json(
      { error: "IFS_AUTH_ENABLED requiere IFS_OAUTH_CLIENT_ID, SECRET y REDIRECT_URI" },
      { status: 503 },
    );
  }

  const jar = await cookies();
  const sessionRaw = jar.get(SESSION_COOKIE)?.value;
  const legacyRaw = jar.get(LEGACY_SESSION_COOKIE)?.value;
  if (sessionRaw || legacyRaw) {
    await destroyPersistedIfsSession(sessionRaw ?? legacyRaw);
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
  const redirectUri = resolveOAuthRedirectUri(request);
  const localLogin = canonicalizeLocalLoginHost(url, redirectUri);
  if (localLogin) {
    return NextResponse.redirect(localLogin);
  }
  const authUrl = buildAuthorizationUrl({
    state,
    codeChallenge: challenge,
    loginHint: loginEmail ?? loginHint,
    redirectUri,
  });
  const response = NextResponse.redirect(authUrl);

  response.cookies.set(
    OAUTH_BUNDLE_COOKIE,
    sealOAuthBundle({
      verifier,
      state,
      redirectUri,
      next: next?.startsWith("/") ? next : undefined,
      email: loginEmail ?? loginHint,
    }),
    opts,
  );
  expireStalePortalCookies(response, opts.secure ?? false);

  return response;
}
