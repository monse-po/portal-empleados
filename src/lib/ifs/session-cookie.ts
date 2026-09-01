/** Validación ligera de cookie de sesión (Edge middleware + Node). */
export function isSessionCookieAlive(raw: string | undefined): boolean {
  if (!raw) return false;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return false;

  try {
    const json = Buffer.from(raw.slice(0, dot), "base64url").toString("utf8");
    const payload = JSON.parse(json) as {
      sid?: string;
      email?: string;
      accessToken?: string;
      expiresAt?: number;
    };
    // Cookie nueva (sid) o legacy (accessToken). Legacy viva sigue contando
    // hasta que el usuario vuelva a autenticarse.
    const hasIdentity = Boolean(payload.sid || payload.accessToken);
    return (
      Boolean(payload.email) &&
      hasIdentity &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export function expiredSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
