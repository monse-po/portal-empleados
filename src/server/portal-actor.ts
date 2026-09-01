import {
  openCempPortalActor,
  openCempPortalSession,
  type CempPortalSession,
} from "@/src/lib/ifs/cemp-portal";
import { resolveEffectivePortalIdentity } from "@/src/server/portal-impersonation";

/**
 * Abre CEmpPortalUser del email efectivo (impersonación UAT si aplica).
 * La sesión OAuth sigue siendo del operador; solo cambia el EmailId IFS.
 */
export async function openPortalActor(
  sessionEmail: string,
  accessToken: string,
): Promise<CempPortalSession> {
  const identity = await resolveEffectivePortalIdentity();
  const email =
    identity.impersonating && identity.effectiveEmail
      ? identity.effectiveEmail
      : sessionEmail;
  return openCempPortalActor(email, accessToken);
}

export async function openPortalSession(
  sessionEmail: string,
  accessToken: string,
): Promise<CempPortalSession> {
  const identity = await resolveEffectivePortalIdentity();
  const email =
    identity.impersonating && identity.effectiveEmail
      ? identity.effectiveEmail
      : sessionEmail;
  return openCempPortalSession(email, accessToken);
}
