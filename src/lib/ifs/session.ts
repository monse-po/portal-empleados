import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/src/lib/db";
import {
  getIfsDevBypassCredentials,
  isIfsAuthEnabled,
} from "@/src/lib/ifs/config";
import { SESSION_COOKIE } from "@/src/lib/ifs/constants";
import { expiredSessionCookieOptions } from "@/src/lib/ifs/session-cookie";

export type IfsUserSession = {
  /** Id de fila en PortalIfsSession (cookie solo guarda esto). */
  sid?: string;
  email: string;
  name?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
};

/** Cookie firmada pequeña: { sid, email, expiresAt } — sin JWTs. */
type SessionCookieRef = {
  sid: string;
  email: string;
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

function signPayload(payload: string): string {
  const sig = createHmac("sha256", sessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

function verifySigned(token: string): string | null {
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
  return payload;
}

function sealCookieRef(ref: SessionCookieRef): string {
  const payload = Buffer.from(JSON.stringify(ref)).toString("base64url");
  return signPayload(payload);
}

function unsealCookieRef(token: string): SessionCookieRef | null {
  const payload = verifySigned(token);
  if (!payload) return null;
  try {
    const ref = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<SessionCookieRef> & { accessToken?: string };
    // Cookie legacy con JWT embebido: ya no la usamos (provoca Cookie Too Large).
    if (ref.accessToken) return null;
    if (!ref.sid || !ref.email || typeof ref.expiresAt !== "number") return null;
    if (ref.expiresAt < Date.now()) return null;
    return { sid: ref.sid, email: ref.email, expiresAt: ref.expiresAt };
  } catch {
    return null;
  }
}

/** @deprecated Prefer createPersistedIfsSession — no meter tokens en la cookie. */
export function sealSession(session: IfsUserSession): string {
  if (session.sid) {
    return sealCookieRef({
      sid: session.sid,
      email: session.email,
      expiresAt: session.expiresAt,
    });
  }
  // Compat local/dev: si no hay sid, aún firma email+expires (sin token).
  const payload = Buffer.from(
    JSON.stringify({
      email: session.email,
      expiresAt: session.expiresAt,
    }),
  ).toString("base64url");
  return signPayload(payload);
}

export function unsealSession(_token: string): IfsUserSession | null {
  // Tokens ya no viven en la cookie; usar getServerIfsSession.
  return null;
}

async function loadSessionRow(sid: string): Promise<IfsUserSession | null> {
  const row = await prisma.portalIfsSession.findUnique({ where: { id: sid } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.portalIfsSession.delete({ where: { id: sid } }).catch(() => {});
    return null;
  }
  return {
    sid: row.id,
    email: row.email,
    name: row.name ?? undefined,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken ?? undefined,
    expiresAt: row.expiresAt.getTime(),
  };
}

/** Crea fila en DB y devuelve cookie firmada pequeña. */
export async function createPersistedIfsSession(
  session: Omit<IfsUserSession, "sid">,
): Promise<{ cookieValue: string; sid: string }> {
  const sid = randomBytes(24).toString("base64url");
  await prisma.portalIfsSession.create({
    data: {
      id: sid,
      email: session.email.toLowerCase(),
      name: session.name,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: new Date(session.expiresAt),
    },
  });
  // Limpieza oportunista de sesiones vencidas (no bloquea el login).
  void prisma.portalIfsSession
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});

  return {
    sid,
    cookieValue: sealCookieRef({
      sid,
      email: session.email.toLowerCase(),
      expiresAt: session.expiresAt,
    }),
  };
}

export async function getServerIfsSession(): Promise<IfsUserSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const ref = unsealCookieRef(raw);
    if (ref) {
      const session = await loadSessionRow(ref.sid);
      if (session) return session;
    }
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

  let sid = session.sid;
  if (!sid) {
    const raw = jar.get(SESSION_COOKIE)?.value;
    const ref = raw ? unsealCookieRef(raw) : null;
    sid = ref?.sid;
  }

  if (sid) {
    await prisma.portalIfsSession.upsert({
      where: { id: sid },
      create: {
        id: sid,
        email: session.email.toLowerCase(),
        name: session.name,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: new Date(session.expiresAt),
      },
      update: {
        email: session.email.toLowerCase(),
        name: session.name,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: new Date(session.expiresAt),
      },
    });
    jar.set(
      SESSION_COOKIE,
      sealCookieRef({
        sid,
        email: session.email.toLowerCase(),
        expiresAt: session.expiresAt,
      }),
      sessionCookieOptions(maxAgeSec),
    );
    return;
  }

  const created = await createPersistedIfsSession(session);
  jar.set(SESSION_COOKIE, created.cookieValue, sessionCookieOptions(maxAgeSec));
}

export async function clearServerIfsSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const ref = unsealCookieRef(raw);
    if (ref) {
      await prisma.portalIfsSession
        .delete({ where: { id: ref.sid } })
        .catch(() => {});
    }
  }
  jar.set(SESSION_COOKIE, "", expiredSessionCookieOptions());
}

/** Borra la sesión de DB a partir del valor crudo de cookie (rutas de logout). */
export async function destroyPersistedIfsSession(
  cookieValue: string | undefined,
): Promise<void> {
  if (!cookieValue) return;
  const ref = unsealCookieRef(cookieValue);
  if (!ref) return;
  await prisma.portalIfsSession
    .delete({ where: { id: ref.sid } })
    .catch(() => {});
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

/** EmailId de CEmpPortalUserSet: @h-mv.com o correo de prueba (p.ej. @veyron.com.mx). */
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
