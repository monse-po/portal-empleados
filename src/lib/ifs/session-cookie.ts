/** Validación ligera de cookie de sesión (Edge middleware + Node). */
export function isSessionCookieAlive(raw: string | undefined): boolean {
  if (!raw) return false;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return false;

  try {
    const json = Buffer.from(raw.slice(0, dot), "base64url").toString("utf8");
    const payload = JSON.parse(json) as {
      email?: string;
      accessToken?: string;
      expiresAt?: number;
    };
    return (
      Boolean(payload.email) &&
      Boolean(payload.accessToken) &&
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
