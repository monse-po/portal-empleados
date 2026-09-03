/** Constantes seguras para Edge (middleware) y Node. */

/**
 * Cookie pequeña (solo sid firmado). Nombre nuevo a propósito:
 * la cookie vieja `hmv_ifs_session` metía el JWT y provocaba 400 Cookie Too Large.
 */
export const SESSION_COOKIE = "hmv_ifs_sid";

/** Nombre legacy — se expira en middleware/login para liberar el header Cookie. */
export const LEGACY_SESSION_COOKIE = "hmv_ifs_session";

/** Impersonación UAT (?u=): cookie httpOnly firmada. No es autenticación. */
export const IMPERSONATE_COOKIE = "hmv_impersonate";

/** OAuth consolidado (una sola cookie en lugar de 5). */
export const OAUTH_BUNDLE_COOKIE = "hmv_oauth_ctx";

/** Cookies OAuth antiguas — se expiran en middleware para liberar header. */
export const LEGACY_OAUTH_COOKIES = [
  "hmv_oauth_pkce",
  "hmv_oauth_state",
  "hmv_oauth_next",
  "hmv_oauth_email",
  "hmv_oauth_redirect",
] as const;
