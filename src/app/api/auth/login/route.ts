import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isIfsAuthReady } from "@/src/lib/ifs/config";
import { expireStalePortalCookies } from "@/src/lib/ifs/clear-portal-cookies";
import {
  LEGACY_SESSION_COOKIE,
  OAUTH_BUNDLE_COOKIE,
  SESSION_COOKIE,
} from "@/src/lib/ifs/constants";
import {
  completeUserLoginFromTokens,
  IfsLoginFlowError,
} from "@/src/lib/ifs/complete-user-login";
import { sealOAuthBundle } from "@/src/lib/ifs/oauth-cookie-bundle";
import {
  buildAuthorizationUrl,
  classifyPasswordGrantError,
  createOAuthState,
  createPkcePair,
  exchangePasswordGrant,
  resolveOAuthRedirectUri,
  resolvePublicOrigin,
} from "@/src/lib/ifs/oauth-user";
import {
  destroyPersistedIfsSession,
  isSystemPortalEmail,
  resolveSessionEmail,
  sessionCookieOptions,
} from "@/src/lib/ifs/session";

function safeNext(raw: unknown): string {
  return typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")
    ? raw
    : "/hoja-tiempo";
}

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

function oauthStartUrl(origin: string, email: string, next: string): string {
  const dest = new URL("/api/auth/login", origin);
  dest.searchParams.set("next", next);
  dest.searchParams.set("email", email);
  return dest.pathname + dest.search;
}

/** Abre el login de IFS (el que sí funciona con liz). */
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

export async function POST(request: Request) {
  if (!isIfsAuthReady()) {
    return NextResponse.json({ error: "auth_unavailable" }, { status: 503 });
  }

  let emailRaw = "";
  let password = "";
  let next = "/hoja-tiempo";

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        email?: unknown;
        password?: unknown;
        next?: unknown;
      };
      emailRaw = typeof body.email === "string" ? body.email.trim() : "";
      password = typeof body.password === "string" ? body.password : "";
      next = safeNext(body.next);
    } else {
      const form = await request.formData();
      emailRaw = String(form.get("email") ?? "").trim();
      password = String(form.get("password") ?? "");
      next = safeNext(form.get("next"));
    }
  } catch {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });
  }

  const loginEmail = resolveSessionEmail({
    email: emailRaw,
    preferred_username: emailRaw,
    username: emailRaw,
  });
  if (!loginEmail || !password) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });
  }
  if (isSystemPortalEmail(loginEmail)) {
    return NextResponse.json(
      { error: "system_account_email" },
      { status: 400 },
    );
  }

  const jar = await cookies();
  const sessionRaw = jar.get(SESSION_COOKIE)?.value;
  const legacyRaw = jar.get(LEGACY_SESSION_COOKIE)?.value;
  if (sessionRaw || legacyRaw) {
    await destroyPersistedIfsSession(sessionRaw ?? legacyRaw);
  }

  const origin = resolvePublicOrigin(request);
  const oauth = oauthStartUrl(origin, loginEmail, next);

  try {
    const tokens = await exchangePasswordGrant({
      username: loginEmail,
      password,
    });
    const login = await completeUserLoginFromTokens({
      tokens,
      typedEmail: loginEmail,
    });
    const secure = origin.startsWith("https://");
    const response = NextResponse.json({ ok: true, next });
    response.cookies.set(
      SESSION_COOKIE,
      login.cookieValue,
      sessionCookieOptions(login.expiresIn),
    );
    expireStalePortalCookies(response, secure);
    return response;
  } catch (err) {
    if (err instanceof IfsLoginFlowError) {
      return NextResponse.json({ error: err.code, oauth }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth/login] fallo al iniciar sesión:", message);
    if (message.includes("PortalIfsSession") || message.includes("prisma")) {
      return NextResponse.json({ error: "session_store" }, { status: 500 });
    }
    const code = classifyPasswordGrantError(err);
    return NextResponse.json({ error: code, oauth }, { status: 401 });
  }
}
