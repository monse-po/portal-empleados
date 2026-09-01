"use server";

import {
  getEmployeeTimesheetForEmp,
  getUserInfo,
  resolveActorEmpNo,
} from "@/src/lib/ifs/cemp-portal";
import { openPortalActor } from "@/src/server/portal-actor";
import { IfsApiError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import {
  groupRegistrosMockByFecha,
  mapEmployeeTimesheetToRegistros,
} from "@/src/lib/ifs/tiempo-timesheet";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import type { RegistroMock } from "@/src/lib/tiempo-registro";

export async function fetchRegistrosFromIfsAction(): Promise<{
  grouped: Record<string, RegistroMock[]> | null;
  activePeriod?: string | null;
  empNo?: string;
  empName?: string;
  sessionExpired?: boolean;
  error?: string;
}> {
  const session = await getServerIfsSession();
  if (!session) return { grouped: null };

  try {
    const result = await withValidIfsSession(async (liveSession) => {
      const ifs = await openPortalActor(
        liveSession.email,
        liveSession.accessToken,
      );
      const empNo = resolveActorEmpNo(ifs);
      const [raw, info] = await Promise.all([
        getEmployeeTimesheetForEmp(ifs, empNo),
        getUserInfo(ifs).catch(() => null),
      ]);
      const sessionEmpNo = info?.EmpNo?.trim() || empNo;
      const registros = mapEmployeeTimesheetToRegistros(raw, sessionEmpNo);
      return {
        grouped: groupRegistrosMockByFecha(registros),
        activePeriod: info?.ActivePeriod?.trim() || null,
        empNo: sessionEmpNo,
        empName: info?.EmpName?.trim() || undefined,
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
