"use server";

import { RegistroEstadoDb } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import {
  approveTimeEntries,
  deleteTimeEntries,
  getApprovalTimesheets,
  getEmployeeTimesheetForEmp,
  registerTimeEntries,
  resolveActorEmpNo,
  updateTimeEntries,
  type CempPortalSession,
} from "@/src/lib/ifs/cemp-portal";
import { openPortalActor } from "@/src/server/portal-actor";
import { formatIfsError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import {
  approvalEventsForDecision,
  buildEmpTimeApproval,
  extractEmpTimeApprovalErrors,
  isStaleApprovalError,
  mapApprovalTimesheetToHojas,
  mapApprovalTimesheetToProyectos,
  type HorasProyectoAprobacion,
} from "@/src/lib/ifs/tiempo-approval";
import {
  parseEmpReportItems,
  extractEmpTimeDeleteErrors,
  extractEmpTimeRegErrors,
  extractEmpTimeUpdateErrors,
  findIfsMatchesForLocal,
  findIfsMetaInTimesheet,
  isIfsRegistroId,
  mapEmployeeTimesheetToRegistros,
  mapRegistroToEmpTimeDelete,
  mapRegistroToEmpTimeUpdate,
  mapRegistrosToEmpTimeReg,
} from "@/src/lib/ifs/tiempo-timesheet";
import type {
  RegistroEstado,
  RegistroIfsMeta,
  RegistroMock,
} from "@/src/lib/mi-tiempo-mock";
import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";
import {
  SESSION_EMPLEADO_ID,
  dayRange,
  estadoUiToDb,
  toRegistroMock,
} from "@/src/lib/registro-tiempo-db";
import { createNotificacionesTiempoEnvioAction } from "@/src/server/notificacion-actions";
import { fetchRegistrosFromIfsAction } from "@/src/server/mi-tiempo-timesheet-actions";
import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";
import { isRegistroEditable } from "@/src/lib/tiempo-registro-rules";

export type EnviarDiaResult = {
  enviados: RegistroMock[];
  sentToIfs: boolean;
  /** True si GetApprovalTimesheets ya muestra el/los registros para este usuario. */
  inApprovalQueue?: boolean;
  error?: string;
  warning?: string;
};

async function findRowByPublicId(id: string) {
  if (isIfsRegistroId(id)) return null;
  return prisma.registroTiempo.findFirst({
    where: {
      empleadoId: SESSION_EMPLEADO_ID,
      OR: [{ legacyId: id }, { id }, { codigo: id }],
    },
  });
}

function ifsUserMessage(err: unknown, fallback: string): string {
  if (err instanceof IfsSessionExpiredError) {
    return "Sesión IFS expirada. Vuelve a iniciar sesión e intenta de nuevo.";
  }
  return formatIfsError(err) || fallback;
}

async function withIfsPortalSession<T>(
  fn: (ifs: CempPortalSession) => Promise<T>,
): Promise<T> {
  return withValidIfsSession(async (liveSession) => {
    const ifs = await openPortalActor(
      liveSession.email,
      liveSession.accessToken,
    );
    return fn(ifs);
  });
}

async function resolveIfsMeta(
  ifs: CempPortalSession,
  reg: RegistroMock,
): Promise<RegistroIfsMeta> {
  if (reg.ifs?.module && reg.ifs.objid && reg.ifs.objversion) {
    return reg.ifs;
  }
  const raw = await getEmployeeTimesheetForEmp(ifs, resolveActorEmpNo(ifs));
  const meta = findIfsMetaInTimesheet(raw, reg.id);
  if (!meta) {
    throw new Error(
      "No se encontró el registro en IFS (Objid/Objversion). Recarga e intenta de nuevo.",
    );
  }
  return meta;
}

export async function getRegistrosGroupedAction(): Promise<{
  registros: Record<string, RegistroMock[]>;
  fromIfs: boolean;
  activePeriod?: string | null;
  warning?: string;
  sessionExpired?: boolean;
}> {
  const ifsResult = await fetchRegistrosFromIfsAction();

  if (!ifsResult.grouped) {
    return {
      registros: {},
      fromIfs: false,
      activePeriod: ifsResult.activePeriod ?? null,
      warning: ifsResult.error,
      sessionExpired: ifsResult.sessionExpired,
    };
  }

  return {
    registros: ifsResult.grouped,
    fromIfs: true,
    activePeriod: ifsResult.activePeriod ?? null,
  };
}

export async function getRegistrosDiaAction(
  fecha: string,
): Promise<RegistroMock[]> {
  const rows = await prisma.registroTiempo.findMany({
    where: {
      empleadoId: SESSION_EMPLEADO_ID,
      fecha: dayRange(fecha),
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRegistroMock);
}

async function upsertRegistroIfs(reg: RegistroMock): Promise<RegistroMock> {
  if (!isRegistroEditable(reg.estado)) {
    throw new Error("Los registros aprobados no se pueden modificar.");
  }
  if (!(await getServerIfsSession())) {
    throw new Error("Se requiere sesión IFS para editar este registro.");
  }

  try {
    await withIfsPortalSession(async (ifs) => {
      const meta = await resolveIfsMeta(ifs, reg);
      const raw = await updateTimeEntries(ifs, [
        mapRegistroToEmpTimeUpdate(reg, meta),
      ]);
      const errors = extractEmpTimeUpdateErrors(raw);
      if (errors.length) {
        throw new Error(errors[0]);
      }
    });
  } catch (err) {
    throw new Error(
      ifsUserMessage(err, "No se pudo actualizar el registro en IFS."),
    );
  }

  return reg;
}

async function fetchTimesheetRegs(): Promise<RegistroMock[]> {
  return withIfsPortalSession(async (ifs) => {
    const empNo = resolveActorEmpNo(ifs);
    const raw = await getEmployeeTimesheetForEmp(ifs, empNo);
    return mapEmployeeTimesheetToRegistros(raw, empNo);
  });
}

function asRegistrado(reg: RegistroMock): RegistroMock {
  if (reg.estado === "Aprobado" || reg.estado === "Rechazado") return reg;
  return { ...reg, estado: "Registrado" };
}

async function registrarNuevosEnIfs(
  regs: RegistroMock[],
): Promise<RegistroMock[]> {
  if (!regs.length) return [];
  if (!(await getServerIfsSession())) {
    throw new Error("Sin sesión IFS. Entra con IFS para registrar horas.");
  }

  const toSend = regs.map((reg) => ({ ...reg, estado: "Registrado" as const }));

  try {
    const raw = await withIfsPortalSession((ifs) =>
      registerTimeEntries(ifs, mapRegistrosToEmpTimeReg(toSend)),
    );
    const errors = extractEmpTimeRegErrors(raw);
    if (errors.length) {
      throw new Error(errors[0]);
    }
  } catch (err) {
    throw new Error(
      ifsUserMessage(err, "No se pudo registrar el tiempo en IFS."),
    );
  }

  let matches: RegistroMock[] = [];
  try {
    matches = findIfsMatchesForLocal(toSend, await fetchTimesheetRegs());
  } catch {
    matches = [];
  }

  const enviados = (matches.length ? matches : toSend).map(asRegistrado);
  try {
    await createNotificacionesTiempoEnvioAction(enviados, {
      empleadoId: SESSION_EMPLEADO_ID,
      empleadoNombre: SESSION_EMPLEADO.nombre,
    });
  } catch (error) {
    console.error("[notificaciones] error al crear envío", error);
  }
  return enviados;
}

export async function upsertRegistroAction(
  reg: RegistroMock,
): Promise<RegistroMock> {
  if (isIfsRegistroId(reg.id) || reg.ifs) {
    await upsertRegistroIfs(reg);
    try {
      const sheet = await fetchTimesheetRegs();
      return sheet.find((row) => row.id === reg.id) ?? asRegistrado(reg);
    } catch {
      return asRegistrado(reg);
    }
  }

  const [created] = await registrarNuevosEnIfs([reg]);
  return created;
}

export async function upsertRegistrosAction(
  regs: RegistroMock[],
): Promise<RegistroMock[]> {
  if (!regs.length) return [];
  const existentes = regs.filter((reg) => isIfsRegistroId(reg.id) || reg.ifs);
  const nuevos = regs.filter((reg) => !isIfsRegistroId(reg.id) && !reg.ifs);
  const out: RegistroMock[] = [];
  for (const reg of existentes) {
    out.push(await upsertRegistroAction(reg));
  }
  if (nuevos.length) {
    out.push(...(await registrarNuevosEnIfs(nuevos)));
  }
  return out;
}

async function deleteRegistroIfs(id: string): Promise<void> {
  if (!(await getServerIfsSession())) {
    throw new Error("Se requiere sesión IFS para eliminar este registro.");
  }

  try {
    await withIfsPortalSession(async (ifs) => {
      const empNo = resolveActorEmpNo(ifs);
      const rawSheet = await getEmployeeTimesheetForEmp(ifs, empNo);
      const row = mapEmployeeTimesheetToRegistros(rawSheet, empNo).find(
        (r) => r.id === id,
      );
      const meta = row?.ifs ?? findIfsMetaInTimesheet(rawSheet, id);
      if (!row || !meta) {
        throw new Error(
          "No se encontró el registro en IFS. Puede que ya haya sido eliminado.",
        );
      }
      if (!isRegistroEditable(row.estado)) {
        throw new Error("Los registros aprobados no se pueden eliminar.");
      }
      const raw = await deleteTimeEntries(ifs, [
        mapRegistroToEmpTimeDelete(row, meta),
      ]);
      const errors = extractEmpTimeDeleteErrors(raw);
      if (errors.length) {
        throw new Error(errors[0]);
      }
    });
  } catch (err) {
    throw new Error(
      ifsUserMessage(err, "No se pudo eliminar el registro en IFS."),
    );
  }
}

export async function deleteRegistroAction(id: string): Promise<void> {
  if (isIfsRegistroId(id)) {
    await deleteRegistroIfs(id);
    return;
  }
  const existing = await findRowByPublicId(id);
  if (!existing || existing.estado === RegistroEstadoDb.APROBADO) {
    throw new Error("Este registro no se puede eliminar.");
  }
  await prisma.registroTiempo.delete({ where: { id: existing.id } });
}

export async function enviarDiaAction(fecha: string): Promise<EnviarDiaResult> {
  return enviarFechasAction([fecha]);
}

/**
 * Legacy: reenvía filas Neon aún en REGISTRADO (pre-IFS).
 * El flujo normal ya registra directo en IFS al guardar (estado Registrado).
 */
export async function enviarFechasAction(
  fechas: string[],
): Promise<EnviarDiaResult> {
  const fechasUnicas = [...new Set(fechas.filter(Boolean))].sort();
  if (!fechasUnicas.length) {
    return { enviados: [], sentToIfs: false };
  }

  if (!(await getServerIfsSession())) {
    return {
      enviados: [],
      sentToIfs: false,
      error: "Sin sesión IFS. Entra con IFS para enviar a aprobación.",
    };
  }

  const min = fechasUnicas[0];
  const max = fechasUnicas[fechasUnicas.length - 1];
  const fechaSet = new Set(fechasUnicas);

  const allRows = await prisma.registroTiempo.findMany({
    where: {
      empleadoId: SESSION_EMPLEADO_ID,
      estado: RegistroEstadoDb.REGISTRADO,
      fecha: {
        gte: new Date(`${min}T00:00:00.000Z`),
        lte: new Date(`${max}T23:59:59.999Z`),
      },
    },
  });

  const rows = allRows.filter((row) => fechaSet.has(toRegistroMock(row).fecha));
  if (!rows.length) {
    return { enviados: [], sentToIfs: false };
  }

  const locales = rows.map(toRegistroMock);
  const ifsSession = await getServerIfsSession();
  let sentToIfs = false;
  let ifsMatches: RegistroMock[] = [];
  let inApprovalQueue = false;

  if (ifsSession) {
    try {
      const payload = mapRegistrosToEmpTimeReg(locales);
      const raw = await withIfsPortalSession((ifs) =>
        registerTimeEntries(ifs, payload),
      );

      const rowErrors = extractEmpTimeRegErrors(raw);
      if (rowErrors.length) {
        return {
          enviados: [],
          sentToIfs: false,
          error: rowErrors[0],
        };
      }
      sentToIfs = true;

      try {
        ifsMatches = await withIfsPortalSession(async (ifs) => {
          const empNo = resolveActorEmpNo(ifs);
          const sheet = await getEmployeeTimesheetForEmp(ifs, empNo);
          return findIfsMatchesForLocal(
            locales,
            mapEmployeeTimesheetToRegistros(sheet, empNo),
          );
        });
      } catch {
        ifsMatches = [];
      }

      if (ifsMatches.length) {
        try {
          const approvalRaw = await withIfsPortalSession((ifs) =>
            getApprovalTimesheets(ifs),
          );
          const approvalIds = new Set(
            mapApprovalTimesheetToHojas(approvalRaw)
              .map((h) => h.registroId)
              .filter(Boolean),
          );
          inApprovalQueue = ifsMatches.every((m) => approvalIds.has(m.id));
        } catch {
          inApprovalQueue = false;
        }
      }
    } catch (err) {
      return {
        enviados: [],
        sentToIfs: false,
        error: ifsUserMessage(
          err,
          "No se pudo registrar el tiempo en IFS.",
        ),
      };
    }
  }

  const ids = rows.map((row) => row.id);
  const ifsVisible = ifsMatches.length > 0;

  const enviadosBase: RegistroMock[] = ifsVisible
    ? ifsMatches.map((r) => ({ ...r, estado: "Registrado" as const }))
    : locales.map((reg) => ({ ...reg, estado: "Registrado" as const }));

  if (sentToIfs && ifsVisible) {
    try {
      await createNotificacionesTiempoEnvioAction(enviadosBase, {
        empleadoId: SESSION_EMPLEADO_ID,
        empleadoNombre: SESSION_EMPLEADO.nombre,
      });
    } catch (error) {
      console.error("[notificaciones] error al crear envío", error);
    }
    await prisma.registroTiempo.deleteMany({ where: { id: { in: ids } } });
    return {
      enviados: enviadosBase,
      sentToIfs: true,
      inApprovalQueue,
      warning: inApprovalQueue
        ? undefined
        : fechasUnicas.length > 1
          ? "Enviado a IFS, pero aún no aparece completo en tu bandeja. Recarga en unos segundos."
          : "Enviado a IFS, pero aún no aparece en tu bandeja de aprobación. Revisa que CSRUIZ sea el aprobador de esa actividad, o recarga la bandeja en unos segundos.",
    };
  }

  await prisma.registroTiempo.updateMany({
    where: { id: { in: ids } },
    data: { estado: RegistroEstadoDb.EN_REVISION },
  });

  const updated = await prisma.registroTiempo.findMany({
    where: { id: { in: ids } },
  });

  const enviados = ifsVisible ? enviadosBase : updated.map(toRegistroMock);
  try {
    await createNotificacionesTiempoEnvioAction(enviados, {
      empleadoId: SESSION_EMPLEADO_ID,
      empleadoNombre: SESSION_EMPLEADO.nombre,
    });
  } catch (error) {
    console.error("[notificaciones] error al crear envío", error);
  }

  return {
    enviados,
    sentToIfs,
    inApprovalQueue: sentToIfs ? inApprovalQueue : undefined,
    warning: sentToIfs
      ? ifsVisible
        ? inApprovalQueue
          ? undefined
          : "Enviado a IFS, pero aún no aparece en tu bandeja de aprobación. Revisa que seas el aprobador de esa actividad."
        : "Enviado a IFS, pero aún no aparece en el timesheet. Quedó como Registrado en el portal."
      : undefined,
  };
}

export type HojasAprobacionResult = {
  hojas: HojaAprobacion[];
  fromIfs: boolean;
  warning?: string;
};

export type ResumenProyectosAprobacionResult = {
  proyectos: HorasProyectoAprobacion[];
  /** Payload IFS para desglosar empleados al abrir un proyecto (sin otro fetch). */
  raw: unknown;
  fromIfs: boolean;
  warning?: string;
};

/** Pendientes para bandeja gerente: solo IFS GetApprovalTimesheets. */
export async function getHojasPendientesAprobacionAction(): Promise<HojasAprobacionResult> {
  const session = await getServerIfsSession();
  if (!session) {
    return { hojas: [], fromIfs: false };
  }

  try {
    const raw = await withIfsPortalSession((ifs) => getApprovalTimesheets(ifs));
    const ifsHojas = mapApprovalTimesheetToHojas(raw);
    return {
      hojas: ifsHojas,
      fromIfs: true,
    };
  } catch (err) {
    return {
      hojas: [],
      fromIfs: false,
      warning: ifsUserMessage(
        err,
        "No se pudo cargar la bandeja IFS.",
      ),
    };
  }
}

/** Horas acumuladas / aprobadas / rechazadas por código de proyecto. */
export async function getResumenProyectosAprobacionAction(): Promise<ResumenProyectosAprobacionResult> {
  const session = await getServerIfsSession();
  if (!session) {
    return { proyectos: [], raw: { value: [] }, fromIfs: false };
  }

  try {
    const raw = await withIfsPortalSession((ifs) => getApprovalTimesheets(ifs));
    return {
      proyectos: mapApprovalTimesheetToProyectos(raw),
      raw,
      fromIfs: true,
    };
  } catch (err) {
    return {
      proyectos: [],
      raw: { value: [] },
      fromIfs: false,
      warning: ifsUserMessage(
        err,
        "No se pudo cargar el resumen por proyecto.",
      ),
    };
  }
}

export type ResolverAprobacionResult = {
  ok: boolean;
  error?: string;
  sentToIfs: boolean;
  /** El registro ya no está en cola IFS; la UI debe quitarlo y refrescar. */
  stale?: boolean;
};

/** Aprobar / rechazar en IFS (EmpPortalTimeApprovalList). Neon solo si no es IFS. */
export async function resolverAprobacionTiempoAction(input: {
  registroIds: string[];
  decision: "aprobado" | "rechazado";
  comentario?: string;
}): Promise<ResolverAprobacionResult> {
  const events = approvalEventsForDecision(input.decision);
  const ifsIds = input.registroIds.filter(isIfsRegistroId);
  const neonIds = input.registroIds.filter((id) => !isIfsRegistroId(id));

  if (ifsIds.length) {
    if (!(await getServerIfsSession())) {
      return {
        ok: false,
        sentToIfs: false,
        error: "Se requiere sesión IFS para aprobar estos registros.",
      };
    }

    let lastError = "";
    let succeeded = false;

    for (const event of events) {
      const entries = ifsIds
        .map((id) => buildEmpTimeApproval(id, event, input.comentario))
        .filter((e): e is NonNullable<typeof e> => e != null);

      if (entries.length !== ifsIds.length) {
        return {
          ok: false,
          sentToIfs: false,
          error:
            "No se pudo resolver ProjectTransactionSeq de algún registro IFS.",
        };
      }

      try {
        const raw = await withIfsPortalSession((ifs) =>
          approveTimeEntries(ifs, entries),
        );
        const errors = extractEmpTimeApprovalErrors(raw);
        if (!errors.length) {
          succeeded = true;
          break;
        }
        lastError = errors[0];
        // Si el evento primario falla por literal, probar fallback; si es stale, no insiste.
        if (isStaleApprovalError(lastError)) break;
      } catch (err) {
        lastError = ifsUserMessage(
          err,
          "No se pudo registrar la decisión en IFS.",
        );
        if (isStaleApprovalError(lastError)) break;
      }
    }

    if (!succeeded) {
      return {
        ok: false,
        sentToIfs: false,
        error: lastError || "No se pudo registrar la decisión en IFS.",
        stale: lastError ? isStaleApprovalError(lastError) : false,
      };
    }
  }

  for (const id of neonIds) {
    await updateRegistroEstadoAction(
      id,
      input.decision === "aprobado" ? "Aprobado" : "Rechazado",
      input.decision === "rechazado" ? input.comentario || "" : "",
    );
  }

  return { ok: true, sentToIfs: ifsIds.length > 0 };
}

export async function updateRegistroEstadoAction(
  id: string,
  estado: RegistroEstado,
  comentarioRechazo = "",
): Promise<RegistroMock | null> {
  const existing = await findRowByPublicId(id);
  if (!existing) return null;

  const updated = await prisma.registroTiempo.update({
    where: { id: existing.id },
    data: {
      estado: estadoUiToDb(estado),
      comentarioRechazo,
    },
  });

  return toRegistroMock(updated);
}
