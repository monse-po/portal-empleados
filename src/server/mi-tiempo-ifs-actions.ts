"use server";

import {
  getEmployeeTimesheet,
  registerTimeEntries,
} from "@/src/lib/ifs/cemp-portal";
import { openPortalSession } from "@/src/server/portal-actor";
import { formatIfsError } from "@/src/lib/ifs/errors";
import { mensajeRegistroDiaNoLaborable } from "@/src/lib/tiempo-schedule";
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
import { assertPuedeMutarTipoEnIfs } from "@/src/server/tiempo-ausencias-ifs";

export type IfsSendResult = {
  /** id público del registro local → legacyId IFS (`ifs-pt-{seq}`) */
  legacyIds: Record<string, string>;
  error?: string;
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

      for (const reg of registros) {
        await assertPuedeMutarTipoEnIfs(ifs, reg.tipo);
      }

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
    console.error("[mi-tiempo] sendRegistrosToIfs", err);
    const error =
      err instanceof IfsSessionExpiredError
        ? "Tu sesión con IFS expiró. Vuelve a iniciar sesión."
        : /CREPSCHEXT002|no se permite el registro de horas en d[ií]as no laborables|no es laborable en tu programa|no reconoce ese día como laborable/i.test(
            err instanceof Error ? err.message : String(err),
          )
          ? mensajeRegistroDiaNoLaborable(registros.map((reg) => reg.fecha))
          : formatIfsError(err);
    return { legacyIds: {}, error };
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
