"use server";

import { prisma } from "@/src/lib/db";
import {
  getApprovalTimesheets,
  getUserInfo,
  personManagesAnyProject,
} from "@/src/lib/ifs/cemp-portal";
import { getRequestsForApproval } from "@/src/lib/ifs/cemp-advance";
import { IfsSessionExpiredError, withValidIfsSession } from "@/src/lib/ifs/ifs-session-runtime";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import {
  parsePortalAccesoRol,
  type PortalAccesoRolValue,
} from "@/src/lib/portal-acceso-rol";
import { parseEmpReportItems } from "@/src/lib/ifs/tiempo-timesheet";
import { normalizePortalEmail } from "@/src/lib/portal-impersonation";
import { openPortalActor } from "@/src/server/portal-actor";
import { resolveEffectivePortalIdentity } from "@/src/server/portal-impersonation";

export type SessionUiRol = {
  email: string | null;
  /** Permiso de autorizar — no “hay pendientes hoy”. */
  canApprove: boolean;
};

function accesoCanApprove(rol: PortalAccesoRolValue): boolean {
  return rol === "AUTORIZADOR" || rol === "AMBOS";
}

/**
 * Misma regla para todos (empleado, autorizador o ambos):
 *
 *   Ver Aprobaciones ⇔ tiene permiso de autorizar.
 *
 * Permiso, en este orden (el primero que afirme basta):
 * 1. Impersonación / PortalAcceso AUTORIZADOR o AMBOS (email o empNo).
 * 2. IFS: es Manager de un proyecto, o IFS le abre bandeja de tiempo/anticipos.
 *
 * Vacío en la bandeja no quita el permiso. EMPLEADO en PortalAcceso no tapa a IFS.
 */
async function portalAccesoGrantsApprove(input: {
  email: string;
  empNo?: string | null;
}): Promise<boolean> {
  try {
    const email = normalizePortalEmail(input.email);
    const empNo = input.empNo?.trim();
    const acceso = await prisma.portalAcceso.findFirst({
      where: {
        activo: true,
        OR: empNo
          ? [{ email }, { empNo }]
          : [{ email }],
      },
    });
    return Boolean(acceso && accesoCanApprove(parsePortalAccesoRol(acceso.rol)));
  } catch (err) {
    console.error("[session] no se pudo leer PortalAcceso:", err);
    return false;
  }
}

async function ifsGrantsApprove(): Promise<boolean> {
  try {
    return await withValidIfsSession(async (live) => {
      const ifs = await openPortalActor(live.email, live.accessToken);
      const [raw, info] = await Promise.all([
        getApprovalTimesheets(ifs).catch(() => null),
        getUserInfo(ifs).catch(() => null),
      ]);

      if (parseEmpReportItems(raw).length > 0) return true;

      const empNo = info?.EmpNo?.trim();
      if (empNo && (await portalAccesoGrantsApprove({ email: live.email, empNo }))) {
        return true;
      }

      const personId = info?.PersonId?.trim();
      const companyId = info?.CompanyId?.trim();
      if (personId && companyId) {
        const manages = await personManagesAnyProject(
          live.accessToken,
          companyId,
          personId,
        ).catch(() => false);
        if (manages) return true;
      }

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

/** Identidad de menú: permiso de autorizar, igual para todos. */
export async function fetchSessionUiRolAction(): Promise<SessionUiRol> {
  const session = await getServerIfsSession();
  if (!session?.email) {
    return { email: null, canApprove: false };
  }

  const identity = await resolveEffectivePortalIdentity();
  const email = identity.effectiveEmail || session.email;

  if (identity.uiRol === "gerente") {
    return { email, canApprove: true };
  }
  if (identity.portalRol && accesoCanApprove(identity.portalRol)) {
    return { email, canApprove: true };
  }
  if (await portalAccesoGrantsApprove({ email })) {
    return { email, canApprove: true };
  }

  return { email, canApprove: await ifsGrantsApprove() };
}
