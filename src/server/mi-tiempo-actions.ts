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
import { formatIfsBusinessErrors, formatIfsError } from "@/src/lib/ifs/errors";
import { mensajeRegistroDiaNoLaborable } from "@/src/lib/tiempo-schedule";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import { isIfsAuthEnabled } from "@/src/lib/ifs/config";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import {
  applyDemoApprovalDecision,
  getDemoApprovalRaw,
  isDemoApprovalRegistroId,
} from "@/src/lib/ifs/tiempo-approval-demo";
import {
  approvalEventsForDecision,
  buildEmpTimeApproval,
  extractEmpTimeApprovalErrors,
  isStaleApprovalError,
  mapApprovalTimesheetToHojas,
  mapApprovalTimesheetToProyectos,
  type HorasProyectoAprobacion,
} from "@/src/lib/ifs/tiempo-approval";
import { cloneInitialHojas } from "@/src/lib/aprobacion-tiempo-mock";
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
  ensureRegistroTiempoRefs,
  estadoUiToDb,
  groupRegistrosByFecha,
  nextRegistroCodigo,
  toRegistroMock,
} from "@/src/lib/registro-tiempo-db";
import { createNotificacionesTiempoEnvioAction } from "@/src/server/notificacion-actions";
import { fetchRegistrosFromIfsAction } from "@/src/server/mi-tiempo-timesheet-actions";
import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";
import { isRegistroEditable } from "@/src/lib/tiempo-registro-rules";
import { assertPortalPuedeMutarTipoHora } from "@/src/lib/tiempo-ausencias";
import { assertPuedeMutarTipoEnIfs } from "@/src/server/tiempo-ausencias-ifs";

export type EnviarDiaResult = {
  enviados: RegistroMock[];
  sentToIfs: boolean;
  /** True si GetApprovalTimesheets ya muestra el/los registros para este usuario. */
  inApprovalQueue?: boolean;
  error?: string;
  warning?: string;
};

/** Next oculta `throw new Error` en producción; devolvemos el texto al cliente. */
export type UpsertRegistroResult =
  | { ok: true; registro: RegistroMock }
  | { ok: false; error: string };

export type UpsertRegistrosResult =
  | { ok: true; registros: RegistroMock[] }
  | { ok: false; error: string };

export type DeleteRegistroResult = { ok: true } | { ok: false; error: string };

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

function isIfsDiaNoLaborableError(err: unknown): boolean {
  const text = [
    err instanceof Error ? err.message : "",
    typeof err === "object" && err && "body" in err
      ? String((err as { body?: unknown }).body ?? "")
      : "",
  ].join(" ");
  return /CREPSCHEXT002|no se permite el registro de horas en d[ií]as no laborables|no es laborable en tu programa|no reconoce ese día como laborable/i.test(
    text,
  );
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

async function getRegistrosGroupedFromNeon(): Promise<
  Record<string, RegistroMock[]>
> {
  const rows = await prisma.registroTiempo.findMany({
    where: { empleadoId: SESSION_EMPLEADO_ID },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });
  return groupRegistrosByFecha(rows);
}

async function upsertRegistroNeon(reg: RegistroMock): Promise<RegistroMock> {
  if (!isRegistroEditable(reg.estado)) {
    throw new Error("Los registros aprobados no se pueden modificar.");
  }
  assertPortalPuedeMutarTipoHora(reg.tipo, SESSION_EMPLEADO.companiaDefault);
  await ensureRegistroTiempoRefs(
    SESSION_EMPLEADO_ID,
    SESSION_EMPLEADO.nombre,
    reg.proy,
  );
  const existing = await findRowByPublicId(reg.id);
  const data = {
    proyectoId: reg.proy,
    subproyecto: reg.subproy ?? null,
    actividad: reg.act,
    tipoHora: reg.tipo,
    horas: reg.horas,
    fecha: new Date(`${reg.fecha}T12:00:00.000Z`),
    comentario: reg.comentario ?? "",
    estado: estadoUiToDb(reg.estado),
  };
  if (existing) {
    const updated = await prisma.registroTiempo.update({
      where: { id: existing.id },
      data,
    });
    return toRegistroMock(updated);
  }
  const codigo = await nextRegistroCodigo();
  const created = await prisma.registroTiempo.create({
    data: {
      legacyId: reg.id,
      codigo,
      empleadoId: SESSION_EMPLEADO_ID,
      ...data,
    },
  });
  return toRegistroMock(created);
}

export async function getRegistrosGroupedAction(): Promise<{
  registros: Record<string, RegistroMock[]>;
  fromIfs: boolean;
  activePeriod?: string | null;
  warning?: string;
  sessionExpired?: boolean;
}> {
  try {
    // DEV compartible: sin OAuth, leer/escribir Neon (perfil demo).
    if (!isIfsAuthEnabled()) {
      return {
        registros: await getRegistrosGroupedFromNeon(),
        fromIfs: false,
        activePeriod: null,
      };
    }

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
  } catch (err) {
    console.error("[mi-tiempo] getRegistrosGrouped", err);
    return {
      registros: {},
      fromIfs: false,
      warning: ifsUserMessage(err, "No se pudieron cargar los registros."),
    };
  }
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
      await assertPuedeMutarTipoEnIfs(ifs, reg.tipo);
      const meta = await resolveIfsMeta(ifs, reg);
      const raw = await updateTimeEntries(ifs, [
        mapRegistroToEmpTimeUpdate(reg, meta),
      ]);
      const errors = extractEmpTimeUpdateErrors(raw);
      if (errors.length) {
        throw new Error(formatIfsBusinessErrors(errors));
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
  if (!isIfsAuthEnabled()) {
    const out: RegistroMock[] = [];
    for (const reg of regs) {
      out.push(await upsertRegistroNeon(asRegistrado(reg)));
    }
    return out;
  }
  if (!(await getServerIfsSession())) {
    throw new Error("Sin sesión IFS. Entra con IFS para registrar horas.");
  }

  const toSend = regs.map((reg) => ({ ...reg, estado: "Registrado" as const }));
  const payload = mapRegistrosToEmpTimeReg(toSend);
  console.info(
    "[mi-tiempo] EmpPortalTimeRegList",
    payload.map((entry) => ({
      AccountDate: entry.AccountDate,
      ReportCostCode: entry.ReportCostCode,
      ShortName: entry.ShortName,
      DayHours: entry.DayHours,
    })),
  );

  try {
    const raw = await withIfsPortalSession(async (ifs) => {
      for (const reg of toSend) {
        await assertPuedeMutarTipoEnIfs(ifs, reg.tipo);
      }
      return registerTimeEntries(ifs, payload);
    });
    const errors = extractEmpTimeRegErrors(raw);
    if (errors.length) {
      throw new Error(formatIfsBusinessErrors(errors));
    }
  } catch (err) {
    if (isIfsDiaNoLaborableError(err)) {
      throw new Error(
        mensajeRegistroDiaNoLaborable(toSend.map((reg) => reg.fecha)),
      );
    }
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
    await createNotificacionesTiempoEnvioAction(enviados);
  } catch (error) {
    console.error("[notificaciones] error al crear envío", error);
  }
  return enviados;
}

async function upsertRegistroInternal(
  reg: RegistroMock,
): Promise<RegistroMock> {
  if (!isIfsAuthEnabled()) {
    return upsertRegistroNeon(reg);
  }
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

export async function upsertRegistroAction(
  reg: RegistroMock,
): Promise<UpsertRegistroResult> {
  try {
    return { ok: true, registro: await upsertRegistroInternal(reg) };
  } catch (err) {
    console.error("[mi-tiempo] upsert registro", err);
    return {
      ok: false,
      error: ifsUserMessage(err, "No se pudo guardar el registro en IFS."),
    };
  }
}

export async function upsertRegistrosAction(
  regs: RegistroMock[],
): Promise<UpsertRegistrosResult> {
  if (!regs.length) return { ok: true, registros: [] };
  try {
    const existentes = regs.filter((reg) => isIfsRegistroId(reg.id) || reg.ifs);
    const nuevos = regs.filter((reg) => !isIfsRegistroId(reg.id) && !reg.ifs);
    const out: RegistroMock[] = [];
    for (const reg of existentes) {
      out.push(await upsertRegistroInternal(reg));
    }
    if (nuevos.length) {
      out.push(...(await registrarNuevosEnIfs(nuevos)));
    }
    return { ok: true, registros: out };
  } catch (err) {
    console.error("[mi-tiempo] upsert registros", err);
    return {
      ok: false,
      error: ifsUserMessage(err, "No se pudo registrar el tiempo en IFS."),
    };
  }
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
      await assertPuedeMutarTipoEnIfs(ifs, row.tipo);
      const raw = await deleteTimeEntries(ifs, [
        mapRegistroToEmpTimeDelete(row, meta),
      ]);
      const errors = extractEmpTimeDeleteErrors(raw);
      if (errors.length) {
        throw new Error(formatIfsBusinessErrors(errors));
      }
    });
  } catch (err) {
    throw new Error(
      ifsUserMessage(err, "No se pudo eliminar el registro en IFS."),
    );
  }
}

export async function deleteRegistroAction(
  id: string,
): Promise<DeleteRegistroResult> {
  try {
    if (isIfsRegistroId(id)) {
      await deleteRegistroIfs(id);
      return { ok: true };
    }
    const existing = await findRowByPublicId(id);
    if (!existing || existing.estado === RegistroEstadoDb.APROBADO) {
      return { ok: false, error: "Este registro no se puede eliminar." };
    }
    await prisma.registroTiempo.delete({ where: { id: existing.id } });
    return { ok: true };
  } catch (err) {
    console.error("[mi-tiempo] delete registro", err);
    return {
      ok: false,
      error: ifsUserMessage(err, "No se pudo eliminar el registro en IFS."),
    };
  }
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

  // DEV sin OAuth: marcar en revisión en Neon (sin enviar a IFS).
  if (!isIfsAuthEnabled()) {
    await prisma.registroTiempo.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { estado: RegistroEstadoDb.EN_REVISION },
    });
    const updated = await prisma.registroTiempo.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
    return {
      enviados: updated.map(toRegistroMock),
      sentToIfs: false,
      warning: "Ambiente DEMO: enviado a revisión local (sin IFS).",
    };
  }

  if (!(await getServerIfsSession())) {
    return {
      enviados: [],
      sentToIfs: false,
      error: "Sin sesión IFS. Entra con IFS para enviar a aprobación.",
    };
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
          error: formatIfsBusinessErrors(rowErrors),
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

function demoApprovalPayload() {
  const raw = getDemoApprovalRaw(cloneInitialHojas());
  return {
    hojas: mapApprovalTimesheetToHojas(raw, { includeResolved: true }),
    proyectos: mapApprovalTimesheetToProyectos(raw),
    raw,
  };
}

/** Bandeja gerente (pendientes + resueltas) desde IFS GetApprovalTimesheets. */
export async function getHojasPendientesAprobacionAction(): Promise<HojasAprobacionResult> {
  const session = await getServerIfsSession();
  const useDemo =
    process.env.NODE_ENV === "development" &&
    (!session || !isIfsAuthEnabled());

  if (useDemo) {
    const demo = demoApprovalPayload();
    return { hojas: demo.hojas, fromIfs: false };
  }

  if (!session) {
    return { hojas: [], fromIfs: false };
  }

  try {
    const raw = await withIfsPortalSession((ifs) => getApprovalTimesheets(ifs));
    return {
      hojas: mapApprovalTimesheetToHojas(raw, { includeResolved: true }),
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
  const useDemo =
    process.env.NODE_ENV === "development" &&
    (!session || !isIfsAuthEnabled());

  if (useDemo) {
    const demo = demoApprovalPayload();
    return {
      proyectos: demo.proyectos,
      raw: demo.raw,
      fromIfs: false,
    };
  }

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

/** Aprobar / rechazar / anular en IFS (EmpPortalTimeApprovalList). Neon solo si no es IFS. */
export async function resolverAprobacionTiempoAction(input: {
  registroIds: string[];
  decision: "aprobado" | "rechazado" | "anulado";
  comentario?: string;
}): Promise<ResolverAprobacionResult> {
  const events = approvalEventsForDecision(input.decision);
  const ifsIds = input.registroIds.filter(isIfsRegistroId);
  const neonIds = input.registroIds.filter((id) => !isIfsRegistroId(id));

  if (ifsIds.length) {
    const session = await getServerIfsSession();
    const demoLocal =
      process.env.NODE_ENV === "development" &&
      ifsIds.every(isDemoApprovalRegistroId) &&
      (!session || !isIfsAuthEnabled());
    if (demoLocal) {
      applyDemoApprovalDecision(
        ifsIds,
        input.decision,
        input.comentario || "",
      );
      return { ok: true, sentToIfs: false };
    }
    if (!session) {
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
        lastError = formatIfsBusinessErrors(errors);
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

  const estadoNeon =
    input.decision === "aprobado"
      ? "Aprobado"
      : input.decision === "anulado"
        ? "Registrado"
        : "Rechazado";
  for (const id of neonIds) {
    await updateRegistroEstadoAction(
      id,
      estadoNeon,
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
  try {
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
  } catch (err) {
    console.error("[mi-tiempo] updateRegistroEstado", err);
    return null;
  }
}
