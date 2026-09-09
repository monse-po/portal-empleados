"use server";

import { getApprovalTimesheets, getUserInfo } from "@/src/lib/ifs/cemp-portal";
import { getRequestsForApproval } from "@/src/lib/ifs/cemp-advance";
import { IfsSessionExpiredError, withValidIfsSession } from "@/src/lib/ifs/ifs-session-runtime";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import { parseEmpReportItems } from "@/src/lib/ifs/tiempo-timesheet";
import { openPortalActor } from "@/src/server/portal-actor";

export type SessionUiRol = {
  email: string | null;
  /** IFS devolvió bandeja de tiempo y/o anticipos para esta persona. */
  canApprove: boolean;
};

async function ifsSessionCanApprove(): Promise<boolean> {
  try {
    return await withValidIfsSession(async (live) => {
      const ifs = await openPortalActor(live.email, live.accessToken);
      const [raw, info] = await Promise.all([
        getApprovalTimesheets(ifs).catch(() => null),
        getUserInfo(ifs).catch(() => null),
      ]);
      if (parseEmpReportItems(raw).length > 0) return true;
      const personId = info?.PersonId?.trim();
      if (!personId) return false;
      const pending = await getRequestsForApproval(
        live.accessToken,
        personId,
      ).catch(() => []);
      return pending.length > 0;
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) return false;
    console.error("[session] no se pudo saber si aprueba:", err);
    return false;
  }
}

/** Identidad de menú: sesión IFS + bandejas reales, no “cualquier login”. */
export async function fetchSessionUiRolAction(): Promise<SessionUiRol> {
  const session = await getServerIfsSession();
  if (!session?.email) {
    return { email: null, canApprove: false };
  }
  return { email: session.email, canApprove: await ifsSessionCanApprove() };
}
