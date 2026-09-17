import dotenv from "dotenv";

let loaded = false;

/** Carga .env.local y luego .env (Neon override), igual que db.ts */
export function loadIfsEnv(): void {
  if (loaded) return;
  dotenv.config({ path: ".env.local" });
  dotenv.config({ path: ".env", override: true });
  loaded = true;
}

function firstDefined(...values: Array<string | undefined>): string {
  for (const v of values) {
    const trimmed = v?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function readIfsEnv() {
  loadIfsEnv();
  return {
    cempPortalBaseUrl: firstDefined(
      process.env.IFS_CEMP_PORTAL_BASE_URL,
      "https://hmvdev.ifs360.cloud/int/ifsapplications/projection/v1/CEmpPortalServices.svc",
    ),
    openIdConfigUrl: firstDefined(
      process.env.IFS_OPENID_CONFIG_URL,
      "https://hmvdev.ifs360.cloud/auth/realms/hmvdev/.well-known/openid-configuration",
    ),
    oauthClientId: firstDefined(
      process.env.IFS_OAUTH_CLIENT_ID,
      process.env.IFS_IDCS_CLIENT_ID,
    ),
    oauthClientSecret: firstDefined(
      process.env.IFS_OAUTH_CLIENT_SECRET,
      process.env.IFS_IDCS_CLIENT_SECRET,
    ),
    idcsDomainUrl: firstDefined(
      process.env.IFS_IDCS_DOMAIN_URL,
      process.env.IFS_OAUTH_TOKEN_URL,
    ),
    oauthTokenUrl: firstDefined(process.env.IFS_OAUTH_TOKEN_URL),
    oauthScope: firstDefined(process.env.IFS_OAUTH_SCOPE),
    portalUserEmail: firstDefined(process.env.IFS_PORTAL_USER_EMAIL),
  };
}
