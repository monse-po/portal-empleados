import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  getIfsDevBypassCredentials,
  isIfsAuthEnabled,
} from "@/src/lib/ifs/config";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";

export type IfsUserSession = {
  email: string;
  name?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

function sessionSecret(): string {
  const secret = process.env.IFS_SESSION_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("IFS_SESSION_SECRET es obligatorio en producción");
  }
  return "dev-only-insecure-session-secret";
}

export function sealSession(session: IfsUserSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function unsealSession(token: string): IfsUserSession | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");

  try {
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as IfsUserSession;
    if (!session.email || !session.accessToken || !session.expiresAt) return null;
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getServerIfsSession(): Promise<IfsUserSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const session = unsealSession(raw);
    if (session) return session;
  }

  const bypass = getIfsDevBypassCredentials();
  if (bypass) {
    return {
      email: bypass.email,
      accessToken: bypass.accessToken,
      expiresAt: Date.now() + 3600_000,
    };
  }

  if (!isIfsAuthEnabled()) return null;
  return null;
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export function parseIdTokenClaims(idToken: string): {
  email?: string;
  name?: string;
  preferred_username?: string;
} {
  const part = idToken.split(".")[1];
  if (!part) return {};
  const json = Buffer.from(part, "base64url").toString("utf8");
  return JSON.parse(json) as {
    email?: string;
    name?: string;
    preferred_username?: string;
  };
}

export function resolveSessionEmail(claims: {
  email?: string;
  preferred_username?: string;
}): string | undefined {
  const email = claims.email?.trim() || claims.preferred_username?.trim();
  if (!email || !email.includes("@")) return undefined;
  return email.toLowerCase();
}
