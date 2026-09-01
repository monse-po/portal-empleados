import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { IMPERSONATE_COOKIE } from "@/src/lib/ifs/constants";
import { sessionCookieOptions } from "@/src/lib/ifs/session";

export type ImpersonationPayload = {
  /** Email del operador autenticado (sesión real). */
  operatorEmail: string;
  /** Email del usuario impersonado (debe existir en PortalAcceso). */
  targetEmail: string;
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

export function normalizePortalEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Operadores que pueden usar ?u= (allowlist env, no hardcode de negocio). */
export function listImpersonationOperators(): string[] {
  const raw = process.env.PORTAL_IMPERSONATION_OPERATORS?.trim() || "";
  return raw
    .split(/[,;\s]+/)
    .map((e) => normalizePortalEmail(e))
    .filter(Boolean);
}

export function isImpersonationOperator(email: string): boolean {
  const ops = listImpersonationOperators();
  if (!ops.length) return false;
  return ops.includes(normalizePortalEmail(email));
}

export function sealImpersonation(payload: ImpersonationPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function unsealImpersonation(token: string): ImpersonationPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", sessionSecret())
    .update(body)
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
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as ImpersonationPayload;
    if (!payload.operatorEmail || !payload.targetEmail || !payload.expiresAt) {
      return null;
    }
    if (payload.expiresAt < Date.now()) return null;
    return {
      operatorEmail: normalizePortalEmail(payload.operatorEmail),
      targetEmail: normalizePortalEmail(payload.targetEmail),
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function clearImpersonationCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}

export async function persistImpersonationCookie(
  payload: ImpersonationPayload,
): Promise<void> {
  const jar = await cookies();
  const maxAgeSec = Math.max(
    60,
    Math.floor((payload.expiresAt - Date.now()) / 1000),
  );
  jar.set(
    IMPERSONATE_COOKIE,
    sealImpersonation(payload),
    sessionCookieOptions(maxAgeSec),
  );
}

export async function readImpersonationCookie(): Promise<ImpersonationPayload | null> {
  const jar = await cookies();
  const raw = jar.get(IMPERSONATE_COOKIE)?.value;
  if (!raw) return null;
  return unsealImpersonation(raw);
}
