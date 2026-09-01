const DEFAULT_REALM = "hmvdev";
const DEFAULT_SYSTEM = "https://hmvdev.ifs360.cloud";

const DEFAULT_SCOPE = "openid email profile microprofile-jwt";
/** Scope Oracle IDCS para client_credentials (distinto del realm IFS). */
const DEFAULT_IDCS_SCOPE = "urn:opc:idm:__myscopes__";

function envFirst(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function ifsSystemUrl(): string {
  return (envFirst("IFS_SYSTEM_URL") || DEFAULT_SYSTEM).replace(/\/$/, "");
}

function ifsRealm(): string {
  return envFirst("IFS_REALM") || DEFAULT_REALM;
}

function defaultIfsTokenUrl(): string {
  return `${ifsSystemUrl()}/auth/realms/${ifsRealm()}/protocol/openid-connect/token`;
}

export type IfsConfig = {
  cempPortalBaseUrl: string;
  cempAdvanceBaseUrl: string;
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
    !explicitTokenUrl &&
    oauthTokenUrl.includes("identity.oraclecloud.com");

  const system = ifsSystemUrl();
  const realm = ifsRealm();

  return {
    cempPortalBaseUrl:
      envFirst("IFS_CEMP_PORTAL_BASE_URL") ||
      `${system}/int/ifsapplications/projection/v1/CEmpPortalServices.svc`,
    cempAdvanceBaseUrl:
      envFirst("IFS_CEMP_ADVANCE_BASE_URL") ||
      `${system}/main/ifsapplications/projection/v1/CEmpAdvanceHandling.svc`,
    openIdConfigUrl:
      envFirst("IFS_OPENID_CONFIG_URL") ||
      `${system}/auth/realms/${realm}/.well-known/openid-configuration`,
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

/**
 * Override opcional de EmpNo (solo si `IFS_DEV_EMP_NO` está en env).
 * Por defecto no hay override: el portal usa el empleado HMV asociado
 * al EmailId de la sesión en CEmpPortalUserSet (remap Veyron↔HMV).
 */
export function getIfsTargetEmpNo(): string | undefined {
  const explicit = envFirst("IFS_DEV_EMP_NO");
  return explicit ? explicit.trim() : undefined;
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

/**
 * Solo localhost: token Bearer copiado de Aurena (DevTools → Network).
 * Evita OAuth cuando IFS responde 400 por cookies acumuladas en ifs360.cloud.
 */
export function isIfsDevTokenBypass(): boolean {
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV === "production") return false;
  return Boolean(
    envFirst("IFS_DEV_ACCESS_TOKEN") && envFirst("IFS_DEV_EMAIL"),
  );
}

export function getIfsDevBypassCredentials(): {
  email: string;
  accessToken: string;
} | null {
  if (!isIfsDevTokenBypass()) return null;
  return {
    email: envFirst("IFS_DEV_EMAIL").toLowerCase(),
    accessToken: envFirst("IFS_DEV_ACCESS_TOKEN"),
  };
}
