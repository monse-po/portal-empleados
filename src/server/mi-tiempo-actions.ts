"use server";

import { RegistroEstadoDb } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import {
  approveTimeEntries,
  deleteTimeEntries,
  getApprovalTimesheets,
  getEmployeeTimesheet,
  openCempPortalSession,
  registerTimeEntries,
  updateTimeEntries,
  type CempPortalSession,
} from "@/src/lib/ifs/cemp-portal";
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
} from "@/src/lib/ifs/tiempo-approval";
import {
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
  mergeIfsAndLocalRegistros,
} from "@/src/lib/ifs/tiempo-timesheet";
import type {
  RegistroEstado,
  RegistroIfsMeta,
  RegistroMock,
} from "@/src/lib/mi-tiempo-mock";
import {
  SESSION_EMPLEADO_ID,
  dayRange,
  ensureRegistroTiempoRefs,
  estadoUiToDb,
  groupRegistrosByFecha,
  nextRegistroCodigo,
  toRegistroMock,
} from "@/src/lib/registro-tiempo-db";
import { createNotificacionesTiempoEnvioAction } from "@/src/server/notificacion-actions";
import { fetchRegistrosFromIfsAction } from "@/src/server/mi-tiempo-timesheet-actions";
import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";
import { registroToHoja } from "@/src/lib/tiempo-bridge";
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

async function getRegistrosFromNeon(): Promise<Record<string, RegistroMock[]>> {
  const rows = await prisma.registroTiempo.findMany({
    where: { empleadoId: SESSION_EMPLEADO_ID },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });
  return groupRegistrosByFecha(rows);
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
    const ifs = await openCempPortalSession(
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
  const raw = await getEmployeeTimesheet(ifs);
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
  warning?: string;
}> {
  const localGrouped = await getRegistrosFromNeon();
  const ifsResult = await fetchRegistrosFromIfsAction();

  if (ifsResult.grouped) {
    return {
      registros: mergeIfsAndLocalRegistros(ifsResult.grouped, localGrouped),
      fromIfs: true,
    };
  }

  return {
    registros: localGrouped,
    fromIfs: false,
    warning: ifsResult.error,
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

export async function upsertRegistroAction(
  reg: RegistroMock,
): Promise<RegistroMock> {
  if (isIfsRegistroId(reg.id)) {
    return upsertRegistroIfs(reg);
  }

  await ensureRegistroTiempoRefs(reg.proy);

  const existing = await findRowByPublicId(reg.id);
  if (existing?.estado === RegistroEstadoDb.APROBADO) {
    throw new Error("Los registros aprobados no se pueden modificar.");
  }
  const data = {
    empleadoId: SESSION_EMPLEADO_ID,
    proyectoId: reg.proy,
    subproyecto: reg.subproy ?? null,
    actividad: reg.act,
    tipoHora: reg.tipo,
    horas: reg.horas,
    fecha: new Date(`${reg.fecha}T12:00:00.000Z`),
    comentario: reg.comentario ?? "",
    comentarioRechazo: reg.comentarioRechazo ?? "",
    aprobador: reg.aprobador ?? null,
    estado: estadoUiToDb(reg.estado),
  };

  if (existing) {
    const updated = await prisma.registroTiempo.update({
      where: { id: existing.id },
      data,
    });
    return toRegistroMock(updated);
  }

  const codigo = reg.codigo ?? (await nextRegistroCodigo());
  const created = await prisma.registroTiempo.create({
    data: {
      ...data,
      codigo,
      legacyId: reg.id.startsWith("r") ? reg.id : null,
    },
  });
  return toRegistroMock(created);
}

async function deleteRegistroIfs(id: string): Promise<void> {
  if (!(await getServerIfsSession())) {
    throw new Error("Se requiere sesión IFS para eliminar este registro.");
  }

  try {
    await withIfsPortalSession(async (ifs) => {
      const rawSheet = await getEmployeeTimesheet(ifs);
      const row = mapEmployeeTimesheetToRegistros(rawSheet).find(
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
  const rows = await prisma.registroTiempo.findMany({
    where: {
      empleadoId: SESSION_EMPLEADO_ID,
      estado: RegistroEstadoDb.REGISTRADO,
      fecha: dayRange(fecha),
    },
  });

  if (!rows.length) {
    return { enviados: [], sentToIfs: false };
  }

  const borradores = rows.map(toRegistroMock);
  const ifsSession = await getServerIfsSession();
  let sentToIfs = false;
  let ifsMatches: RegistroMock[] = [];
  let inApprovalQueue = false;

  if (ifsSession) {
    try {
      const payload = mapRegistrosToEmpTimeReg(borradores);
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

      // 1) Localizar en timesheet del empleado → ids ifs-pt-*
      try {
        const sheet = await withIfsPortalSession((ifs) =>
          getEmployeeTimesheet(ifs),
        );
        ifsMatches = findIfsMatchesForLocal(
          borradores,
          mapEmployeeTimesheetToRegistros(sheet),
        );
      } catch {
        ifsMatches = [];
      }

      // 2) Verificar que entren a la bandeja del aprobador (mismo login IFS)
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

  /**
   * Preferimos devolver filas IFS (ifs-pt-*) para que la bandeja/approve
   * usen el mismo id que EmpPortalTimeApprovalList.
   */
  const enviadosBase: RegistroMock[] = ifsVisible
    ? ifsMatches.map((r) => ({ ...r, estado: "Lanzado" as const }))
    : borradores.map((reg) => ({ ...reg, estado: "Lanzado" as const }));

  if (sentToIfs && ifsVisible) {
    try {
      await createNotificacionesTiempoEnvioAction(enviadosBase);
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
    await createNotificacionesTiempoEnvioAction(enviados);
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
        : "Enviado a IFS, pero aún no aparece en el timesheet. Quedó como Lanzado en el portal."
      : undefined,
  };
}

export type HojasAprobacionResult = {
  hojas: HojaAprobacion[];
  fromIfs: boolean;
  warning?: string;
};

/** Pendientes para bandeja gerente: IFS GetApprovalTimesheets (Neon solo sin sesión IFS). */
export async function getHojasPendientesAprobacionAction(): Promise<HojasAprobacionResult> {
  const neonRows = await prisma.registroTiempo.findMany({
    where: { estado: RegistroEstadoDb.EN_REVISION },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });
  const neonHojas = neonRows.map((row) => registroToHoja(toRegistroMock(row)));

  const session = await getServerIfsSession();
  if (!session) {
    return { hojas: neonHojas, fromIfs: false };
  }

  try {
    const raw = await withIfsPortalSession((ifs) => getApprovalTimesheets(ifs));
    const ifsHojas = mapApprovalTimesheetToHojas(raw);
    // Con sesión IFS la fuente de verdad es IFS: no mezclar Neon (evita filas fantasma).
    return {
      hojas: ifsHojas,
      fromIfs: true,
    };
  } catch (err) {
    return {
      hojas: neonHojas,
      fromIfs: false,
      warning: ifsUserMessage(
        err,
        "No se pudo cargar la bandeja IFS. Mostrando pendientes locales.",
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
