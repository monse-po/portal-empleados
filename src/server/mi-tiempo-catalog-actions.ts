"use server";

import {
  getProjectInfo,
  getScheduleHoursForDate,
  getEmployeeScheduleHoursByDate,
  getValidActReportCode,
  getUserInfo,
  getValidEmpPrjAct,
  openCempPortalActor,
} from "@/src/lib/ifs/cemp-portal";
import { formatIfsError, IfsApiError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import {
  buildTiempoCatalogFromIfs,
  mapReportCodesToTipos,
  type TiempoCatalog,
  type TiempoTipoHoraOption,
} from "@/src/lib/ifs/tiempo-catalog";
import type {
  LovReportCostCodeRow,
  ValidEmpPrjActRow,
} from "@/src/lib/ifs/types";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import { getJornadaLimiteFromSistema } from "@/src/lib/tiempo-config";
import { resolveScheduleHoursLimit } from "@/src/lib/tiempo-schedule";
import type { TiempoJornadaSource } from "@/src/lib/tiempo-config";

export async function getIfsSessionStatusAction(): Promise<{
  connected: boolean;
  email?: string;
}> {
  const session = await getServerIfsSession();
  if (!session) return { connected: false };
  return { connected: true, email: session.email };
}

export type IfsPortalProfile = {
  connected: boolean;
  email?: string;
  empName?: string;
  empNo?: string;
  companyId?: string;
  companyName?: string;
  error?: string;
};

/** EmailId de la sesión → CEmpPortalUserSet → GetUserInfo (empleado asociado en DEV). */
export async function fetchIfsPortalProfileAction(): Promise<IfsPortalProfile> {
  const session = await getServerIfsSession();
  if (!session) return { connected: false };

  try {
    return await withValidIfsSession(async (live) => {
      try {
        const ifs = await openCempPortalActor(live.email, live.accessToken);
        const info = await getUserInfo(ifs);
        const empName = (info.EmpName || live.name || "").trim();
        const empNo = (info.EmpNo || ifs.user.EmpId || "").trim();
        const companyId = (info.CompanyId || ifs.user.CompanyId || "").trim();
        const companyName = (info.CompanyName || "").trim();
        return {
          connected: true,
          email: live.email,
          empName: empName || undefined,
          empNo: empNo || undefined,
          companyId: companyId || undefined,
          companyName: companyName || undefined,
        };
      } catch (err) {
        if (err instanceof IfsApiError && err.status === 401) throw err;
        return {
          connected: true,
          email: live.email,
          error: formatIfsError(err),
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return { connected: false, error: err.message };
    }
    return { connected: false, error: formatIfsError(err) };
  }
}

export async function fetchTiempoCatalogAction(accountDate: string): Promise<{
  catalog: TiempoCatalog | null;
  error?: string;
  sessionExpired?: boolean;
}> {
  try {
    return await withValidIfsSession(async (session) => {
      let ifs;
      try {
        ifs = await openCempPortalActor(session.email, session.accessToken);
      } catch (err) {
        if (err instanceof IfsApiError && err.status === 401) throw err;
        return {
          catalog: null,
          error: `CEmpPortalUserSet (${session.email}): ${formatIfsError(err)}`,
        };
      }

      try {
        const raw = await getValidEmpPrjAct(ifs, accountDate);
        const rows =
          (raw as { value?: ValidEmpPrjActRow[] }).value ??
          (Array.isArray(raw) ? (raw as ValidEmpPrjActRow[]) : []);
        const catalog = buildTiempoCatalogFromIfs(rows);
        return { catalog };
      } catch (err) {
        if (err instanceof IfsApiError && err.status === 401) throw err;
        return {
          catalog: null,
          error: `GetValidEmpPrjAct (${accountDate}): ${formatIfsError(err)}`,
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        catalog: null,
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      catalog: null,
      error: formatIfsError(err),
    };
  }
}

export async function fetchProjectAprobadorAction(input: {
  shortName: string;
  projectId: string;
}): Promise<{
  aprobador?: string;
  error?: string;
  sessionExpired?: boolean;
}> {
  try {
    return await withValidIfsSession(async (session) => {
      for (const projectId of [input.projectId, input.shortName]) {
        if (!projectId?.trim()) continue;
        try {
          const info = await getProjectInfo(session.accessToken, projectId);
          const manager = info.Manager?.trim();
          if (manager) return { aprobador: manager };
        } catch {
          /* probar siguiente clave */
        }
      }
      return { error: "Sin gerente configurado en IFS para este proyecto" };
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return { sessionExpired: true, error: err.message };
    }
    return { error: formatIfsError(err) };
  }
}

export async function fetchTiposHoraAction(input: {
  companyId: string;
  projectId: string;
  subProjectId: string;
  accountDate: string;
  activitySeq: number;
}): Promise<{ tipos: TiempoTipoHoraOption[]; error?: string; sessionExpired?: boolean }> {
  try {
    return await withValidIfsSession(async (session) => {
      try {
        const ifs = await openCempPortalActor(
          session.email,
          session.accessToken,
        );
        const raw = await getValidActReportCode(ifs, {
          CompanyId: input.companyId,
          ProjectId: input.projectId,
          SubProjectId: input.subProjectId,
          AccountDate: input.accountDate,
          ActivitySeq: input.activitySeq,
        });
        const rows =
          (raw as { value?: LovReportCostCodeRow[] }).value ??
          (Array.isArray(raw) ? (raw as LovReportCostCodeRow[]) : []);
        return { tipos: mapReportCodesToTipos(rows) };
      } catch (err) {
        return {
          tipos: [],
          error: err instanceof Error ? err.message : "Error al leer tipos de hora",
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return { tipos: [], sessionExpired: true, error: err.message };
    }
    return {
      tipos: [],
      error: formatIfsError(err),
    };
  }
}

export async function fetchScheduleHoursAction(accountDate: string): Promise<{
  scheduleHours: number;
  source: TiempoJornadaSource;
  /** @deprecated Usar `source === "ifs"`. */
  fromIfs: boolean;
  error?: string;
  sessionExpired?: boolean;
}> {
  const sistema = getJornadaLimiteFromSistema();
  const session = await getServerIfsSession();
  if (!session) {
    return {
      scheduleHours: sistema.maxNormalHours,
      source: "sistema",
      fromIfs: false,
    };
  }

  try {
    return await withValidIfsSession(async (liveSession) => {
      try {
        const ifs = await openCempPortalActor(
          liveSession.email,
          liveSession.accessToken,
        );
        const hours = await getScheduleHoursForDate(ifs, accountDate);
        const resolved = resolveScheduleHoursLimit({ ifsScheduleHours: hours });
        return {
          scheduleHours: resolved.scheduleHours,
          source: resolved.source,
          fromIfs: resolved.source === "ifs",
          error:
            resolved.source === "sistema"
              ? `Sin ScheduleHours para ${accountDate}`
              : undefined,
        };
      } catch (err) {
        const resolved = resolveScheduleHoursLimit({});
        return {
          scheduleHours: resolved.scheduleHours,
          source: "sistema",
          fromIfs: false,
          error: formatIfsError(err),
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        scheduleHours: sistema.maxNormalHours,
        source: "sistema",
        fromIfs: false,
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      scheduleHours: sistema.maxNormalHours,
      source: "sistema",
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}

/** Programa del empleado (días con ScheduleHours) para filtrar rangos. */
export async function fetchEmployeeScheduleAction(): Promise<{
  hoursByDate: Record<string, number>;
  fromIfs: boolean;
  error?: string;
  sessionExpired?: boolean;
}> {
  const session = await getServerIfsSession();
  if (!session) {
    return { hoursByDate: {}, fromIfs: false };
  }

  try {
    return await withValidIfsSession(async (liveSession) => {
      try {
        const ifs = await openCempPortalActor(
          liveSession.email,
          liveSession.accessToken,
        );
        const hoursByDate = await getEmployeeScheduleHoursByDate(ifs);
        return {
          hoursByDate,
          fromIfs: Object.keys(hoursByDate).length > 0,
        };
      } catch (err) {
        return {
          hoursByDate: {},
          fromIfs: false,
          error: formatIfsError(err),
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        hoursByDate: {},
        fromIfs: false,
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      hoursByDate: {},
      fromIfs: false,
      error: formatIfsError(err),
    };
  }
}
