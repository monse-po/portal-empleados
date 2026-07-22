const DEFAULT_BASE =
  "https://hmvdev.ifs360.cloud/int/ifsapplications/projection/v1/CEmpPortalServices.svc";

const DEFAULT_REALM = "hmvdev";
const DEFAULT_SYSTEM = "https://hmvdev.ifs360.cloud";

const DEFAULT_OPENID =
  `${DEFAULT_SYSTEM}/auth/realms/${DEFAULT_REALM}/.well-known/openid-configuration`;

const DEFAULT_SCOPE = "openid microprofile-jwt";
/** Scope Oracle IDCS para client_credentials (distinto del realm IFS). */
const DEFAULT_IDCS_SCOPE = "urn:opc:idm:__myscopes__";

function envFirst(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function defaultIfsTokenUrl(): string {
  const system = envFirst("IFS_SYSTEM_URL") || DEFAULT_SYSTEM;
  const realm = envFirst("IFS_REALM") || DEFAULT_REALM;
  return `${system.replace(/\/$/, "")}/auth/realms/${realm}/protocol/openid-connect/token`;
}

export type IfsConfig = {
  cempPortalBaseUrl: string;
  openIdConfigUrl: string;
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRedirectUri: string;
  /** Oracle IDCS domain (legacy); prefer IFS realm token URL */
  idcsDomainUrl: string;
  oauthTokenUrl: string;
  oauthScope: string;
  portalTestEmailId: string;
};

function preferRealmOAuth(portalClientId: string): boolean {
  if (envFirst("IFS_USE_REALM_OAUTH") === "true") return true;
  if (envFirst("IFS_USE_REALM_OAUTH") === "false") return false;
  return portalClientId.toUpperCase().startsWith("IFS_");
}

export function getIfsConfig(): IfsConfig {
  const idcsDomainUrl = envFirst("IFS_IDCS_DOMAIN_URL");
  const explicitTokenUrl = envFirst("IFS_OAUTH_TOKEN_URL");
  const portalClientId = envFirst("IFS_OAUTH_CLIENT_ID", "IFS_IDCS_CLIENT_ID");
  const useRealm = preferRealmOAuth(portalClientId);

  const oauthTokenUrl = explicitTokenUrl
    ? explicitTokenUrl
    : useRealm || !idcsDomainUrl
      ? defaultIfsTokenUrl()
      : `${idcsDomainUrl.replace(/\/$/, "")}/oauth2/v1/token`;

  const usingIdcs =
    Boolean(idcsDomainUrl) &&
    !useRealm &&
    oauthTokenUrl.includes("identity.oraclecloud.com");

  return {
    cempPortalBaseUrl: envFirst("IFS_CEMP_PORTAL_BASE_URL") || DEFAULT_BASE,
    openIdConfigUrl: envFirst("IFS_OPENID_CONFIG_URL") || DEFAULT_OPENID,
    oauthClientId: portalClientId,
    oauthClientSecret: envFirst(
      "IFS_OAUTH_CLIENT_SECRET",
      "IFS_IDCS_CLIENT_SECRET",
    ),
    oauthRedirectUri: envFirst("IFS_OAUTH_REDIRECT_URI"),
    idcsDomainUrl,
    oauthTokenUrl,
    oauthScope:
      envFirst("IFS_OAUTH_SCOPE") ||
      (usingIdcs ? DEFAULT_IDCS_SCOPE : DEFAULT_SCOPE),
    portalTestEmailId: envFirst("IFS_PORTAL_TEST_EMAIL"),
  };
}

export function isIfsConfigured(): boolean {
  const { oauthClientId, oauthClientSecret, oauthTokenUrl } = getIfsConfig();
  return Boolean(oauthClientId && oauthClientSecret && oauthTokenUrl);
}

/** Login OAuth empleado (IFS_EMP_PORTAL_USER). Off por defecto. */
export function isIfsAuthEnabled(): boolean {
  return process.env.IFS_AUTH_ENABLED === "true";
}

export function isIfsAuthReady(): boolean {
  if (!isIfsAuthEnabled()) return false;
  const { oauthClientId, oauthClientSecret, oauthRedirectUri } = getIfsConfig();
  return Boolean(oauthClientId && oauthClientSecret && oauthRedirectUri);
}
