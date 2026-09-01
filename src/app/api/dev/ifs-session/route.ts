import { NextResponse } from "next/server";
import { parseBearerToken, isLocalDevRuntime } from "@/src/lib/ifs/dev-local";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";
import {
  createPersistedIfsSession,
  resolveSessionEmail,
  sessionCookieOptions,
} from "@/src/lib/ifs/session";

export async function POST(request: Request) {
  if (!isLocalDevRuntime()) {
    return NextResponse.json({ error: "Solo disponible en localhost" }, { status: 403 });
  }

  let body: { email?: string; accessToken?: string };
  try {
    body = (await request.json()) as { email?: string; accessToken?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const accessToken = parseBearerToken(body.accessToken ?? "");
  const email = resolveSessionEmail({
    email: body.email?.trim(),
    preferred_username: body.email?.trim(),
    username: body.email?.trim(),
  });

  if (!accessToken || !email) {
    return NextResponse.json(
      { error: "Pega el EmailId asociado al empleado (p.ej. liz.lino@veyron.com.mx) y el token (empieza con eyJ…)" },
      { status: 400 },
    );
  }

  const { cookieValue } = await createPersistedIfsSession({
    email,
    accessToken,
    expiresAt: Date.now() + 3600_000,
  });

  const response = NextResponse.json({ ok: true, email });
  response.cookies.set(SESSION_COOKIE, cookieValue, sessionCookieOptions(3600));
  return response;
}
