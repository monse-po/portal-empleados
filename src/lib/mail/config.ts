function envFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export type MailProvider = "console" | "graph" | "mailpit" | "local";

export function isMailEnabled(): boolean {
  return envFlag("MAIL_ENABLED");
}

export function getMailProvider(): MailProvider {
  const raw = process.env.MAIL_PROVIDER?.trim().toLowerCase();
  if (raw === "graph") return "graph";
  if (raw === "mailpit") return "mailpit";
  if (raw === "local") return "local";
  return "console";
}

export function getMailpitUrl(): string {
  return (
    process.env.MAILPIT_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:8025"
  );
}

/** Correos de prueba. Vacío + MAIL_ALLOW_ALL=true = enviar a cualquiera (solo prod). */
export function getMailAllowlist(): string[] {
  const raw = process.env.MAIL_ALLOWLIST?.trim() || "";
  return raw
    .split(/[,;\s]+/)
    .map((email) => normalizeMailAddress(email))
    .filter(Boolean);
}

export function isMailAllowAll(): boolean {
  return envFlag("MAIL_ALLOW_ALL");
}

export function normalizeMailAddress(email: string): string {
  return email.trim().toLowerCase();
}

export function isMailAddressAllowed(email: string): boolean {
  const to = normalizeMailAddress(email);
  if (!to) return false;
  const allowlist = getMailAllowlist();
  if (allowlist.length) return allowlist.includes(to);
  return isMailAllowAll();
}

export function getMailFrom(): string {
  return process.env.MAIL_FROM?.trim() || "";
}

export function getMailFromName(): string {
  return process.env.MAIL_FROM_NAME?.trim() || "Portal de empleados HMV";
}

export function getMailPortalOrigin(): string {
  const explicit = process.env.MAIL_PORTAL_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  for (const raw of [
    process.env.IFS_ENTRA_REDIRECT_URI,
    process.env.IFS_OAUTH_REDIRECT_URI,
  ]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      return new URL(value).origin;
    } catch {
      /* ignore */
    }
  }
  return "https://hmv-empleados.nubeportal.com";
}

export function absolutePortalHref(href?: string | null): string {
  const origin = getMailPortalOrigin();
  const path = href?.trim() || "/";
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
