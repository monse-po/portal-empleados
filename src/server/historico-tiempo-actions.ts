"use server";

import { RegistroEstadoDb } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import {
  getEmployeeReportItemsHistorico,
  getEmployeeReportItemsHistoricoMainChannel,
  getHoursSummary,
  getProjectTransactionsHistorico,
  getReferenceEmpReportItemsHistorico,
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
  dedupeRegistros,
  mapReportItemsHistoricoToRegistros,
  mergeIfsAndLocalRegistros,
} from "@/src/lib/ifs/tiempo-timesheet";
import {
  getHistoricoFechaMinimaIso,
  getRegistrosHistoricoAprobados,
  sortRegistrosHistorico,
} from "@/src/lib/historico-tiempo";
import { isIfsAuthEnabled } from "@/src/lib/ifs/config";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import type { RegistroMock } from "@/src/lib/tiempo-registro";
import {
  SESSION_EMPLEADO_ID,
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
  empNo?: string;
  empName?: string;
  confirmedHours?: number;
  sessionExpired?: boolean;
  error?: string;
}> {
  const session = await getServerIfsSession();
  const desdeIso = getHistoricoFechaMinimaIso();

  if (!session) {
    if (!isIfsAuthEnabled()) {
      const registros = await getApprovedFromNeon(
        SESSION_EMPLEADO_ID,
        desdeIso,
      );
      return {
        registros: sortRegistrosHistorico(registros),
        desdeIso,
        empName: "Usuario DEMO",
      };
    }
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
    const payload = await withValidIfsSession(async (liveSession) => {
      const collected: RegistroMock[] = [];
      // Empleado HMV asociado al EmailId de la sesión (mismo actor que Mi Tiempo).
      const ifs = await openPortalActor(
        liveSession.email,
        liveSession.accessToken,
      );
      const info = await getUserInfo(ifs).catch(() => null);
      const empNo =
        info?.EmpNo?.trim() ||
        resolveActorEmpNo(ifs) ||
        empleado.empleadoId;
      const empName =
        info?.EmpName?.trim() || empleado.name?.trim() || undefined;
      const companyId =
        info?.CompanyId?.trim() || ifs.user.CompanyId?.trim() || "";
      const empleadoIdNeon =
        empNo.replace(/\D/g, "") || empleado.empleadoId;

      // 1) Misma hoja que Mi Tiempo (GetEmployeeTimesheet + borradores Neon)
      try {
        const localGrouped = await getRegistrosFromNeon(empleadoIdNeon);
        const ifsResult = await fetchRegistrosFromIfsAction();
        const merged = mergeIfsAndLocalRegistros(
          ifsResult.grouped ?? {},
          localGrouped,
        );
        collected.push(...getRegistrosHistoricoAprobados(merged));
      } catch (err) {
        console.warn("[historico] hoja Mi Tiempo", err);
      }

      // 2) Transacciones Proyecto (Aurena) — histórico real del año, no solo ActivePeriod
      if (empNo) {
        try {
          const raw = await getProjectTransactionsHistorico(ifs, empNo, desdeIso);
          const mapped = mapReportItemsHistoricoToRegistros(raw);
          if (process.env.NODE_ENV === "development") {
            console.info(
              `[historico] ProjectTransactionSet: ${mapped.length} filas`,
            );
          }
          collected.push(...mapped);
        } catch (err) {
          if (!(err instanceof IfsApiError)) throw err;
          console.warn("[historico] ProjectTransactionSet", err.message);
        }
      }

      // 3) Meses anteriores vía ReportItemSet (solo lectura IFS)
      try {
        const raw = await getEmployeeReportItemsHistorico(ifs, desdeIso);
        collected.push(...mapReportItemsHistoricoToRegistros(raw));
      } catch (err) {
        if (!(err instanceof IfsApiError)) throw err;
        console.warn("[historico] ReportItemSet", err.message);
      }

      // 4) Reference_EmpReportItem por EmpNo (histórico global del empleado)
      if (empNo) {
        try {
          const raw = await getReferenceEmpReportItemsHistorico(
            ifs,
            companyId,
            empNo,
            desdeIso,
          );
          collected.push(...mapReportItemsHistoricoToRegistros(raw));
        } catch (err) {
          if (!(err instanceof IfsApiError)) throw err;
          console.warn("[historico] Reference_EmpReportItem", err.message);
        }
      }

      // 5) Canal /main/ (Aurena) — a veces /int/ no expone EmpReportItem histórico
      if (empNo) {
        try {
          const raw = await getEmployeeReportItemsHistoricoMainChannel(
            ifs,
            companyId,
            empNo,
            desdeIso,
          );
          const mapped = mapReportItemsHistoricoToRegistros(raw);
          if (process.env.NODE_ENV === "development") {
            console.info(`[historico] canal main: ${mapped.length} filas`);
          }
          collected.push(...mapped);
        } catch (err) {
          if (!(err instanceof IfsApiError)) throw err;
          console.warn("[historico] canal main", err.message);
        }
      }

      // 6) Neon explícito APROBADO (sync local tras aprobación en portal)
      try {
        collected.push(...(await getApprovedFromNeon(empleadoIdNeon, desdeIso)));
      } catch (err) {
        console.warn("[historico] Neon APROBADO", err);
      }

      const deduped = dedupeRegistros(collected);
      const result = sortRegistrosHistorico(deduped);
      let confirmedHours: number | undefined;
      try {
        const summary = await getHoursSummary(ifs);
        confirmedHours =
          typeof summary.ConfirmedHours === "number"
            ? summary.ConfirmedHours
            : undefined;
        if (process.env.NODE_ENV === "development") {
          console.info(
            `[historico] emp=${empNo} neon=${empleadoIdNeon} confirmed=${confirmedHours ?? 0} crudas=${collected.length} enVentana=${result.length}`,
          );
        }
      } catch {
        /* diag opcional */
      }

      return { registros: result, empNo, empName, confirmedHours };
    });

    return {
      registros: payload.registros,
      desdeIso,
      empNo: payload.empNo,
      empName: payload.empName,
      confirmedHours: payload.confirmedHours,
    };
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
