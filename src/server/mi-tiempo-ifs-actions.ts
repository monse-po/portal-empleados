"use server";

import {
  getEmployeeTimesheet,
  registerTimeEntries,
} from "@/src/lib/ifs/cemp-portal";
import { openPortalSession } from "@/src/server/portal-actor";
import { formatIfsError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import {
  assertRegisterTimeResponse,
  findMatchingIfsRegistro,
  registroToEmpTimeReg,
} from "@/src/lib/ifs/tiempo-registro-ifs";
import { mapEmployeeTimesheetToRegistros } from "@/src/lib/ifs/tiempo-timesheet";
import type { RegistroMock } from "@/src/lib/tiempo-registro";

export type IfsSendResult = {
  /** id público del registro local → legacyId IFS (`ifs-pt-{seq}`) */
  legacyIds: Record<string, string>;
};

/**
 * Envía borradores a IFS (`EmpPortalTimeRegList`).
 * Devuelve legacyIds para vincular filas Neon con ProjectTransactionSeq.
 */
export async function sendRegistrosToIfsAction(
  registros: RegistroMock[],
): Promise<IfsSendResult> {
  if (!registros.length) return { legacyIds: {} };

  try {
    return await withValidIfsSession(async (liveSession) => {
      const ifs = await openPortalSession(
        liveSession.email,
        liveSession.accessToken,
      );

      const entries = registros.map(registroToEmpTimeReg);
      const raw = await registerTimeEntries(ifs, entries);
      assertRegisterTimeResponse(raw);

      const sheet = await getEmployeeTimesheet(ifs);
      const ifsRows = mapEmployeeTimesheetToRegistros(sheet);

      const legacyIds: Record<string, string> = {};
      for (const reg of registros) {
        const match = findMatchingIfsRegistro(reg, ifsRows);
        if (match?.id.startsWith("ifs-pt-")) {
          legacyIds[reg.id] = match.id;
        }
      }

      return { legacyIds };
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      throw new Error("Tu sesión con IFS expiró. Vuelve a iniciar sesión.");
    }
    if (err instanceof Error && err.message.startsWith("IFS rechazó")) {
      throw err;
    }
    throw new Error(formatIfsError(err));
  }
}

export async function probeRegisterTimeIfsAction(): Promise<{
  ok: boolean;
  detail: string;
}> {
  try {
    await withValidIfsSession(async (liveSession) => {
      await openPortalSession(liveSession.email, liveSession.accessToken);
    });
    return {
      ok: true,
      detail: "Sesión lista para EmpPortalTimeRegList",
    };
  } catch (err) {
    return {
      ok: false,
      detail: formatIfsError(err),
    };
  }
}
