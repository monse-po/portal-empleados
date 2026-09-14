import { NextResponse } from "next/server";
import { isIfsAuthReady } from "@/src/lib/ifs/config";
import { expireStalePortalCookies } from "@/src/lib/ifs/clear-portal-cookies";
import { OAUTH_BUNDLE_COOKIE } from "@/src/lib/ifs/constants";
import {
  buildEntraAuthorizationUrl,
  entraRedirectUri,
  isEntraLoginReady,
  newEntraPkce,
} from "@/src/lib/ifs/entra";
import { sealOAuthBundle } from "@/src/lib/ifs/oauth-cookie-bundle";
import { createOAuthState, resolvePublicOrigin } from "@/src/lib/ifs/oauth-user";
import { sessionCookieOptions } from "@/src/lib/ifs/session";

/**
 * Como APEX: manda a login.microsoftonline.com.
 * El callback es este portal, no /ords/apex_authentication.callback.
 */
export async function GET(request: Request) {
  const origin = resolvePublicOrigin(request);
  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const email = url.searchParams.get("email")?.trim();

  if (!isIfsAuthReady() || !isEntraLoginReady()) {
    const dest = new URL("/login", origin);
    dest.searchParams.set("error", "microsoft_not_configured");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      dest.searchParams.set("next", next);
    }
    if (email) dest.searchParams.set("email", email);
    return NextResponse.redirect(dest);
  }

  const { verifier, challenge } = newEntraPkce();
  const state = createOAuthState();
  const redirectUri = entraRedirectUri(request);
  const secure = origin.startsWith("https://");
  const authUrl = buildEntraAuthorizationUrl({
    state,
    codeChallenge: challenge,
    redirectUri,
    loginHint: email,
  });
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    OAUTH_BUNDLE_COOKIE,
    sealOAuthBundle({
      verifier,
      state,
      redirectUri,
      next: next?.startsWith("/") && !next.startsWith("//") ? next : undefined,
      email,
    }),
    sessionCookieOptions(600),
  );
  expireStalePortalCookies(response, secure);
  return response;
}
