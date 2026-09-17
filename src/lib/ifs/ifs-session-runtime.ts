import { fetchIfsAccessToken } from "@/src/lib/ifs/auth";
import { IfsApiError } from "@/src/lib/ifs/errors";
import { refreshAccessToken } from "@/src/lib/ifs/oauth-user";
import {
  accessTokenExpiresAt,
  clearServerIfsSession,
  getServerIfsSession,
  nextIfsSessionExpiry,
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

function tokenExpiryMs(session: IfsUserSession): number {
  if (session.tokenExpiresAt) return session.tokenExpiresAt;
  return accessTokenExpiresAt(session.accessToken) ?? 0;
}

function isTokenStale(session: IfsUserSession): boolean {
  return tokenExpiryMs(session) - Date.now() < REFRESH_SKEW_MS;
}

function withNewToken(
  session: IfsUserSession,
  accessToken: string,
  extras: { refreshToken?: string; expiresIn?: number } = {},
): IfsUserSession {
  const tokenTtlMs = Math.max(extras.expiresIn || 0, 60) * 1000;
  return {
    ...session,
    accessToken,
    refreshToken: extras.refreshToken ?? session.refreshToken,
    expiresAt: nextIfsSessionExpiry(),
    tokenExpiresAt:
      accessTokenExpiresAt(accessToken) ?? Date.now() + tokenTtlMs,
  };
}

export async function refreshIfsSession(
  session: IfsUserSession,
): Promise<IfsUserSession | null> {
  if (session.refreshToken) {
    try {
      const tokens = await refreshAccessToken(session.refreshToken);
      const next = withNewToken(session, tokens.accessToken, {
        refreshToken: tokens.refreshToken ?? session.refreshToken,
        expiresIn: tokens.expiresIn,
      });
      await persistIfsSession(next);
      return next;
    } catch {
      /* cae a M2M */
    }
  }

  try {
    const m2m = await fetchIfsAccessToken();
    const next = withNewToken(session, m2m.accessToken, {
      expiresIn: m2m.expiresIn,
    });
    await persistIfsSession(next);
    return next;
  } catch {
    return null;
  }
}

async function resolveFreshSession(): Promise<IfsUserSession | null> {
  const session = await getServerIfsSession();
  if (!session) return null;
  if (!isTokenStale(session)) return session;
  return (await refreshIfsSession(session)) ?? session;
}

/**
 * Ejecuta una operación IFS con sesión OAuth vigente.
 * Renueva el access token si está por expirar o si IFS responde 401.
 * La cookie del portal dura 8 h y se extiende al renovar.
 */
export async function withValidIfsSession<T>(
  fn: (session: IfsUserSession) => Promise<T>,
): Promise<T> {
  const session = await resolveFreshSession();
  if (!session) {
    throw new IfsSessionExpiredError("Sin sesión IFS");
  }

  try {
    return await fn(session);
  } catch (err) {
    if (err instanceof IfsApiError && err.status === 401) {
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
