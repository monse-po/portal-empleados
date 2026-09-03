import { createHmac, timingSafeEqual } from "node:crypto";

export type OAuthCookieBundle = {
  verifier: string;
  state: string;
  redirectUri: string;
  next?: string;
  email?: string;
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

export function sealOAuthBundle(bundle: Omit<OAuthCookieBundle, "expiresAt">): string {
  const payload = Buffer.from(
    JSON.stringify({
      ...bundle,
      expiresAt: Date.now() + 600_000,
    }),
  ).toString("base64url");
  return signPayload(payload);
}

export function unsealOAuthBundle(token: string): OAuthCookieBundle | null {
  const payload = verifySigned(token);
  if (!payload) return null;
  try {
    const bundle = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<OAuthCookieBundle>;
    if (
      !bundle.verifier ||
      !bundle.state ||
      !bundle.redirectUri ||
      typeof bundle.expiresAt !== "number"
    ) {
      return null;
    }
    if (bundle.expiresAt < Date.now()) return null;
    return bundle as OAuthCookieBundle;
  } catch {
    return null;
  }
}
