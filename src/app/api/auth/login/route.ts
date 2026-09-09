import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isIfsAuthReady } from "@/src/lib/ifs/config";
import { expireStalePortalCookies } from "@/src/lib/ifs/clear-portal-cookies";
import {
  LEGACY_SESSION_COOKIE,
  SESSION_COOKIE,
} from "@/src/lib/ifs/constants";
import {
  completeUserLoginFromTokens,
  IfsLoginFlowError,
} from "@/src/lib/ifs/complete-user-login";
import {
  classifyPasswordGrantError,
  exchangePasswordGrant,
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

/** Enlaces viejos → formulario. La clave se valida aquí, no en la pantalla de IFS. */
export async function GET(request: Request) {
  const origin = resolvePublicOrigin(request);
  const url = new URL(request.url);
  const dest = new URL("/login", origin);
  const next = url.searchParams.get("next");
  const email = url.searchParams.get("email")?.trim();
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    dest.searchParams.set("next", next);
  }
  if (email) dest.searchParams.set("email", email);
  return NextResponse.redirect(dest);
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

  try {
    const tokens = await exchangePasswordGrant({
      username: loginEmail,
      password,
    });
    const login = await completeUserLoginFromTokens({
      tokens,
      typedEmail: loginEmail,
    });
    const origin = resolvePublicOrigin(request);
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
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth/login] fallo al iniciar sesión:", message);
    if (message.includes("PortalIfsSession") || message.includes("prisma")) {
      return NextResponse.json({ error: "session_store" }, { status: 500 });
    }
    const code = classifyPasswordGrantError(err);
    const status = code === "invalid_credentials" ? 401 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
