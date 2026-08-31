"use server";

import {
  getEmployeeTimesheetForEmp,
  getUserInfo,
  openCempPortalActor,
} from "@/src/lib/ifs/cemp-portal";
import { IfsApiError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import {
  groupRegistrosMockByFecha,
  mapEmployeeTimesheetToRegistros,
} from "@/src/lib/ifs/tiempo-timesheet";
import { getIfsTargetEmpNo } from "@/src/lib/ifs/config";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import type { RegistroMock } from "@/src/lib/mi-tiempo-mock";

export async function fetchRegistrosFromIfsAction(): Promise<{
  grouped: Record<string, RegistroMock[]> | null;
  activePeriod?: string | null;
  sessionExpired?: boolean;
  error?: string;
}> {
  const session = await getServerIfsSession();
  if (!session) return { grouped: null };

  try {
    const result = await withValidIfsSession(async (liveSession) => {
      const ifs = await openCempPortalActor(
        liveSession.email,
        liveSession.accessToken,
      );
      const targetEmpNo = getIfsTargetEmpNo();
      const [raw, info] = await Promise.all([
        getEmployeeTimesheetForEmp(ifs, targetEmpNo),
        getUserInfo(ifs).catch(() => null),
      ]);
      const registros = mapEmployeeTimesheetToRegistros(raw, targetEmpNo);
      return {
        grouped: groupRegistrosMockByFecha(registros),
        activePeriod: info?.ActivePeriod?.trim() || null,
      };
    });
    return result;
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return { grouped: null, sessionExpired: true, error: err.message };
    }
    if (err instanceof IfsApiError && err.status === 401) {
      return { grouped: null, sessionExpired: true, error: err.message };
    }
    return {
      grouped: null,
      error: err instanceof Error ? err.message : "Error al leer IFS",
    };
  }
}
