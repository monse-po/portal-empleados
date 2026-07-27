import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import {
  getIfsDevBypassCredentials,
  isIfsAuthEnabled,
} from "@/src/lib/ifs/config";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";
import { expiredSessionCookieOptions } from "@/src/lib/ifs/session-cookie";

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

export async function persistIfsSession(session: IfsUserSession): Promise<void> {
  const jar = await cookies();
  const maxAgeSec = Math.max(
    60,
    Math.floor((session.expiresAt - Date.now()) / 1000),
  );
  jar.set(
    SESSION_COOKIE,
    sealSession(session),
    sessionCookieOptions(maxAgeSec),
  );
}

export async function clearServerIfsSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", expiredSessionCookieOptions());
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

export type TokenIdentityClaims = {
  email?: string;
  name?: string;
  preferred_username?: string;
  upn?: string;
  username?: string;
  sub?: string;
  unique_name?: string;
};

function stringClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function parseIdTokenClaims(idToken: string): TokenIdentityClaims {
  const payload = parseJwtPayload(idToken);
  return {
    email: stringClaim(payload.email),
    name: stringClaim(payload.name),
    preferred_username: stringClaim(payload.preferred_username),
    upn: stringClaim(payload.upn),
    username: stringClaim(payload.username),
    sub: stringClaim(payload.sub),
    unique_name: stringClaim(payload.unique_name),
  };
}

export function parseAccessTokenClaims(accessToken: string): TokenIdentityClaims {
  const payload = parseJwtPayload(accessToken);
  return {
    email: stringClaim(payload.email),
    name: stringClaim(payload.name),
    preferred_username: stringClaim(payload.preferred_username),
    upn: stringClaim(payload.upn),
    username: stringClaim(payload.username),
    sub: stringClaim(payload.sub),
    unique_name: stringClaim(payload.unique_name),
  };
}

function parseJwtPayload(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) return {};
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
}

export function isSystemPortalEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  if (!lower.includes("@")) return true;
  if (lower.endsWith("@local")) return true;
  if (lower.startsWith("ifsapp@")) return true;
  if (lower.includes("service-account")) return true;
  if (isUuidLike(lower.split("@")[0] ?? "")) return true;
  return false;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function portalEmailDomain(): string | undefined {
  const configured = process.env.IFS_PORTAL_EMAIL_DOMAIN?.trim().replace(/^@/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "h-mv.com";
  return undefined;
}

function normalizeToPortalEmail(raw: string): string | undefined {
  const value = raw.trim().toLowerCase();
  if (!value || isUuidLike(value)) return undefined;

  if (value.includes("@")) {
    if (isSystemPortalEmail(value)) return undefined;
    return value;
  }

  const domain = portalEmailDomain();
  if (!domain) return undefined;
  const email = `${value}@${domain}`;
  if (isSystemPortalEmail(email)) return undefined;
  return email;
}

export function resolveSessionEmail(claims: TokenIdentityClaims): string | undefined {
  const candidates = [
    claims.email,
    claims.preferred_username,
    claims.upn,
    claims.username,
    claims.unique_name,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const email = normalizeToPortalEmail(raw);
    if (email) return email;
  }
  return undefined;
}
