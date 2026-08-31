"use server";

import { RegistroEstadoDb } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import {
  getEmployeeReportItemsHistorico,
  getEmployeeReportItemsHistoricoMainChannel,
  getHoursSummary,
  getReferenceEmpReportItemsHistorico,
  getUserInfo,
  openCempPortalSession,
} from "@/src/lib/ifs/cemp-portal";
import { IfsApiError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import {
  dedupeRegistros,
  mapReportItemsHistoricoToRegistros,
  mergeIfsAndLocalRegistros,
} from "@/src/lib/ifs/tiempo-timesheet";
import {
  getHistoricoFechaMinimaIso,
  getRegistrosHistoricoAprobados,
  sortRegistrosHistorico,
} from "@/src/lib/historico-tiempo";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import type { RegistroMock } from "@/src/lib/tiempo-registro";
import {
  groupRegistrosByFecha,
  toRegistroMock,
} from "@/src/lib/registro-tiempo-db";
import { fetchRegistrosFromIfsAction } from "@/src/server/mi-tiempo-timesheet-actions";
import { getTiempoEmpleadoContext } from "@/src/server/portal-user-profile";

async function getRegistrosFromNeon(
  empleadoId: string,
): Promise<Record<string, RegistroMock[]>> {
  const rows = await prisma.registroTiempo.findMany({
    where: { empleadoId },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });
  return groupRegistrosByFecha(rows);
}

async function getApprovedFromNeon(
  empleadoId: string,
  desdeIso: string,
): Promise<RegistroMock[]> {
  const rows = await prisma.registroTiempo.findMany({
    where: {
      empleadoId,
      estado: RegistroEstadoDb.APROBADO,
      fecha: { gte: new Date(`${desdeIso}T00:00:00.000Z`) },
    },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toRegistroMock);
}

/** Mi Histórico — horas registradas y confirmadas por el gerente (IFS Confirmed + Neon APROBADO). */
export async function getHistoricoRegistrosAction(): Promise<{
  registros: RegistroMock[];
  desdeIso: string;
  sessionExpired?: boolean;
  error?: string;
}> {
  const session = await getServerIfsSession();
  const desdeIso = getHistoricoFechaMinimaIso();

  if (!session) {
    return {
      registros: [],
      desdeIso,
      error: "Sesión IFS requerida para consultar el histórico.",
    };
  }

  const empleado = await getTiempoEmpleadoContext();
  if (!empleado) {
    return {
      registros: [],
      desdeIso,
      error: "Sesión IFS requerida para consultar el histórico.",
    };
  }

  try {
    const registros = await withValidIfsSession(async (liveSession) => {
      const collected: RegistroMock[] = [];
      const ifs = await openCempPortalSession(
        liveSession.email,
        liveSession.accessToken,
      );

      // 1) Misma hoja que Mi Tiempo (GetEmployeeTimesheet + borradores Neon)
      try {
        const localGrouped = await getRegistrosFromNeon(empleado.empleadoId);
        const ifsResult = await fetchRegistrosFromIfsAction();
        const merged = mergeIfsAndLocalRegistros(
          ifsResult.grouped ?? {},
          localGrouped,
        );
        collected.push(...getRegistrosHistoricoAprobados(merged));
      } catch (err) {
        console.warn("[historico] hoja Mi Tiempo", err);
      }

      // 2) Meses anteriores vía ReportItemSet (solo lectura IFS)
      try {
        const raw = await getEmployeeReportItemsHistorico(ifs, desdeIso);
        collected.push(...mapReportItemsHistoricoToRegistros(raw));
      } catch (err) {
        if (!(err instanceof IfsApiError)) throw err;
        console.warn("[historico] ReportItemSet", err.message);
      }

      // 3) Reference_EmpReportItem por EmpNo (histórico global del empleado)
      try {
        const info = await getUserInfo(ifs);
        if (info.EmpNo?.trim()) {
          const companyId =
            info.CompanyId?.trim() || ifs.user.CompanyId?.trim() || "";
          const raw = await getReferenceEmpReportItemsHistorico(
            ifs,
            companyId,
            info.EmpNo.trim(),
            desdeIso,
          );
          collected.push(...mapReportItemsHistoricoToRegistros(raw));
        }
      } catch (err) {
        if (!(err instanceof IfsApiError)) throw err;
        console.warn("[historico] Reference_EmpReportItem", err.message);
      }

      // 4) Canal /main/ (Aurena) — a veces /int/ no expone EmpReportItem histórico
      try {
        const info = await getUserInfo(ifs);
        if (info.EmpNo?.trim()) {
          const companyId =
            info.CompanyId?.trim() || ifs.user.CompanyId?.trim() || "";
          const raw = await getEmployeeReportItemsHistoricoMainChannel(
            ifs,
            companyId,
            info.EmpNo.trim(),
            desdeIso,
          );
          const mapped = mapReportItemsHistoricoToRegistros(raw);
          if (process.env.NODE_ENV === "development") {
            console.info(`[historico] canal main: ${mapped.length} filas`);
          }
          collected.push(...mapped);
        }
      } catch (err) {
        if (!(err instanceof IfsApiError)) throw err;
        console.warn("[historico] canal main", err.message);
      }

      // 5) Neon explícito APROBADO (sync local tras aprobación en portal)
      try {
        collected.push(...(await getApprovedFromNeon(empleado.empleadoId, desdeIso)));
      } catch (err) {
        console.warn("[historico] Neon APROBADO", err);
      }

      const deduped = dedupeRegistros(collected);
      const result = sortRegistrosHistorico(deduped);

      if (process.env.NODE_ENV === "development") {
        try {
          const summary = await getHoursSummary(ifs);
          console.info(
            `[historico] emp=${empleado.empleadoId} confirmed=${summary.ConfirmedHours ?? 0} crudas=${collected.length} aprobadas=${result.length}`,
          );
        } catch {
          /* diag opcional */
        }
      }

      return result;
    });

    return { registros, desdeIso };
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      return {
        registros: [],
        desdeIso,
        sessionExpired: true,
        error: err.message,
      };
    }
    if (err instanceof IfsApiError && err.status === 401) {
      return {
        registros: [],
        desdeIso,
        sessionExpired: true,
        error: err.message,
      };
    }
    return {
      registros: [],
      desdeIso,
      error: err instanceof Error ? err.message : "Error al leer histórico desde IFS",
    };
  }
}
