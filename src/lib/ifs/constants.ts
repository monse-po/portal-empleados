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
