import { IfsApiError } from "@/src/lib/ifs/errors";
import { refreshAccessToken } from "@/src/lib/ifs/oauth-user";
import {
  clearServerIfsSession,
  getServerIfsSession,
  persistIfsSession,
  type IfsUserSession,
} from "@/src/lib/ifs/session";

const REFRESH_SKEW_MS = 120_000;

export class IfsSessionExpiredError extends Error {
  constructor(message = "Sesión IFS expirada") {
    super(message);
    this.name = "IfsSessionExpiredError";
  }
}

export async function refreshIfsSession(
  session: IfsUserSession,
): Promise<IfsUserSession | null> {
  if (!session.refreshToken) return null;

  try {
    const tokens = await refreshAccessToken(session.refreshToken);
    const expiresIn = Math.max(tokens.expiresIn || 0, 60);
    const next: IfsUserSession = {
      ...session,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? session.refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    await persistIfsSession(next);
    return next;
  } catch {
    return null;
  }
}

async function resolveFreshSession(): Promise<IfsUserSession | null> {
  const session = await getServerIfsSession();
  if (!session) return null;

  const nearExpiry = session.expiresAt - Date.now() < REFRESH_SKEW_MS;
  if (!nearExpiry || !session.refreshToken) return session;

  return (await refreshIfsSession(session)) ?? session;
}

/**
 * Ejecuta una operación IFS con sesión OAuth vigente.
 * Renueva el token si está por expirar o si IFS responde 401.
 */
export async function withValidIfsSession<T>(
  fn: (session: IfsUserSession) => Promise<T>,
): Promise<T> {
  let session = await resolveFreshSession();
  if (!session) {
    throw new IfsSessionExpiredError("Sin sesión IFS");
  }

  try {
    return await fn(session);
  } catch (err) {
    if (
      err instanceof IfsApiError &&
      err.status === 401 &&
      session.refreshToken
    ) {
      const refreshed = await refreshIfsSession(session);
      if (!refreshed) {
        await clearServerIfsSession();
        throw new IfsSessionExpiredError();
      }
      try {
        return await fn(refreshed);
      } catch (retryErr) {
        if (retryErr instanceof IfsApiError && retryErr.status === 401) {
          await clearServerIfsSession();
          throw new IfsSessionExpiredError();
        }
        throw retryErr;
      }
    }
    throw err;
  }
}
