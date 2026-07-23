/** Rutas y helpers solo para desarrollo en localhost (no Vercel). */
export function isLocalDevRuntime(): boolean {
  return !process.env.VERCEL && process.env.NODE_ENV !== "production";
}

export function parseBearerToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice(7).trim() || null;
  }
  return trimmed;
}
