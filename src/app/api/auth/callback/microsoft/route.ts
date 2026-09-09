import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  expirePortalCookie,
  expireStalePortalCookies,
} from "@/src/lib/ifs/clear-portal-cookies";
import { OAUTH_BUNDLE_COOKIE, SESSION_COOKIE } from "@/src/lib/ifs/constants";
import {
  completeUserLoginFromVerifiedEmail,
  IfsLoginFlowError,
} from "@/src/lib/ifs/complete-user-login";
import { exchangeEntraCode } from "@/src/lib/ifs/entra";
import { unsealOAuthBundle } from "@/src/lib/ifs/oauth-cookie-bundle";
import { resolvePublicOrigin } from "@/src/lib/ifs/oauth-user";
import { sessionCookieOptions } from "@/src/lib/ifs/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const origin = resolvePublicOrigin(request);
  const secure = origin.startsWith("https://");
  const jar = await cookies();

  const fail = (error: string) => {
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, origin),
    );
    expirePortalCookie(response, OAUTH_BUNDLE_COOKIE, secure);
    expireStalePortalCookies(response, secure);
    return response;
  };

  if (oauthError) return fail(oauthError);
  if (!code || !state) return fail("missing_code");

  const bundle = unsealOAuthBundle(jar.get(OAUTH_BUNDLE_COOKIE)?.value ?? "");
  if (!bundle || bundle.state !== state) return fail("invalid_state");

  try {
    const { email } = await exchangeEntraCode({
      code,
      codeVerifier: bundle.verifier,
      redirectUri: bundle.redirectUri,
    });
    const loginEmail = email ?? bundle.email;
    if (!loginEmail) return fail("no_email_in_token");

    const login = await completeUserLoginFromVerifiedEmail(loginEmail);
    const dest = bundle.next?.startsWith("/") ? bundle.next : "/hoja-tiempo";
    const response = NextResponse.redirect(new URL(dest, origin));
    response.cookies.set(
      SESSION_COOKIE,
      login.cookieValue,
      sessionCookieOptions(login.expiresIn),
    );
    expirePortalCookie(response, OAUTH_BUNDLE_COOKIE, secure);
    expireStalePortalCookies(response, secure);
    return response;
  } catch (err) {
    if (err instanceof IfsLoginFlowError) {
      return fail(err.code);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth/callback/microsoft] fallo:", message);
    if (message.includes("PortalIfsSession") || message.includes("prisma")) {
      return fail("session_store");
    }
    return fail("token_exchange");
  }
}
