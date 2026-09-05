"use server";

import { Prisma } from "@/src/generated/prisma/client";
import { prisma } from "@/src/lib/db";
import {
  fechaHoyDMY,
  recordsFromRows,
  rowToAprobacion,
  tipoUiToDb,
  type AnticiposActor,
  type LanzarAnticipoInput,
} from "@/src/lib/anticipos-db";
import { aplicarTimelineAprobacion } from "@/src/lib/anticipos-bridge";
import {
  cloneInitialAproAnticipos,
  GERENTE_APROBADOR,
  type AnticipoAprobacion,
} from "@/src/lib/aprobacion-anticipos-mock";
import {
  getEmployeesByCompany,
  getUserInfo,
} from "@/src/lib/ifs/cemp-portal";
import { openPortalSession } from "@/src/server/portal-actor";
import {
  approveEmpAdvance,
  cancelEmpAdvance,
  createEmpAdvance,
  getAdvanceQuery,
  getRequestsForApproval,
  getYourRequests,
  listAdvanceQueries,
  rejectEmpAdvance,
  type CEmpAdvanceQuery,
} from "@/src/lib/ifs/cemp-advance";
import { odataStringKey } from "@/src/lib/ifs/client";
import {
  applyDestinoNombres,
  queryToAprobacion,
  recordsFromQueries,
  toCEmpAdvancesInsert,
} from "@/src/lib/ifs/anticipos-ifs-map";
import { isIfsAuthEnabled } from "@/src/lib/ifs/config";
import { formatIfsError, IfsApiError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import {
  cloneInitialAnticipos,
  cloneInitialExtras,
  normalizeAnticipoId,
  nuevoCodigoAnticipo,
  SESSION_EMPLEADO,
  type Anticipo,
  type AnticipoExtra,
  type TimelineItem,
} from "@/src/lib/mis-anticipos-mock";

function mockSessionActor(): AnticiposActor {
  const id = normalizeAnticipoId(SESSION_EMPLEADO.cedula);
  return {
    fromIfs: false,
    ids: [id],
    nombre: SESSION_EMPLEADO.nombre,
    empNo: id,
    companyId: SESSION_EMPLEADO.companiaDefault,
    personId: id,
    supplierId: "",
  };
}

function isDbUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /Anticipo|does not exist|P2021|P2010|no such table/i.test(msg);
}

function demoAprobacionIfEmpty(result: {
  solicitudes: Record<string, AnticipoAprobacion>;
  sessionNombre: string;
  fromIfs: boolean;
  fromDb: boolean;
}) {
  if (
    process.env.NODE_ENV === "development" &&
    Object.keys(result.solicitudes).length === 0
  ) {
    return {
      solicitudes: cloneInitialAproAnticipos(),
      sessionNombre: result.sessionNombre,
      fromIfs: false,
      fromDb: false,
    };
  }
  return result;
}

async function resolveActor(): Promise<AnticiposActor> {
  try {
    return await withValidIfsSession(async (session) => {
      try {
        const ifs = await openPortalSession(
          session.email,
          session.accessToken,
        );
        const info = await getUserInfo(ifs);
        const empNo = (info.EmpNo || ifs.user.EmpId || "").trim();
        let personId = (info.PersonId || "").trim();
        let supplierId = (info.SupplierId || "").trim();
        const companyId = (info.CompanyId || ifs.user.CompanyId || "").trim();

        if (companyId && empNo && (!personId || !supplierId)) {
          try {
            const employees = await getEmployeesByCompany(
              session.accessToken,
              companyId,
            );
            const match = employees.find(
              (e) =>
                e.CEmpNo?.trim() === empNo ||
                e.PersonId?.trim() === empNo ||
                e.Identity?.trim() === empNo,
            );
            if (match) {
              personId =
                personId ||
                match.PersonId?.trim() ||
                match.Identity?.trim() ||
                "";
              supplierId =
                supplierId ||
                match.Identity?.trim() ||
                match.CEmpNo?.trim() ||
                empNo;
            }
          } catch {
            /* best-effort */
          }
        }

        const personDigits = personId.replace(/\D/g, "");
        const empDigits = empNo.replace(/\D/g, "");
        const ids = [
          ...new Set([personId, personDigits, empDigits, empNo].filter(Boolean)),
        ];
        return {
          fromIfs: true,
          ids: ids.length ? ids : [normalizeAnticipoId(session.email)],
          nombre: (info.EmpName || session.email).trim(),
          empNo: empNo || personDigits,
          companyId,
          personId: personId || personDigits || empNo,
          supplierId: supplierId || empNo,
          accessToken: session.accessToken,
        };
      } catch {
        return {
          fromIfs: true,
          ids: [normalizeAnticipoId(session.email)],
          nombre: session.email,
          empNo: "",
          companyId: "",
          personId: "",
          supplierId: "",
          accessToken: session.accessToken,
        };
      }
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) return mockSessionActor();
    if (err instanceof IfsApiError && err.status === 401) {
      return mockSessionActor();
    }
    return mockSessionActor();
  }
}

function visibleWhere(ids: string[]): Prisma.AnticipoWhereInput {
  return {
    estado: { not: "BORRADOR" },
    OR: [{ solicitanteId: { in: ids } }, { empleadoId: { in: ids } }],
  };
}

function parseTimeline(value: unknown): TimelineItem[] {
  return Array.isArray(value) ? (value as TimelineItem[]) : [];
}

export async function listMisAnticiposAction(): Promise<{
  anticipos: Record<string, Anticipo>;
  extras: Record<string, AnticipoExtra>;
  sessionIds: string[];
  sessionNombre: string;
  fromIfs: boolean;
  fromDb: boolean;
}> {
  const actor = await resolveActor();

  if (actor.fromIfs && actor.accessToken) {
    if (!actor.personId) {
      return {
        anticipos: {},
        extras: {},
        sessionIds: actor.ids,
        sessionNombre: actor.nombre,
        fromIfs: true,
        fromDb: false,
      };
    }
    try {
      const keys = [...new Set([actor.personId, actor.empNo].filter(Boolean))];
      const byNo = new Map<string, CEmpAdvanceQuery>();
      for (const key of keys) {
        try {
          const rows = await getYourRequests(actor.accessToken, key);
          for (const row of rows) {
            const no = row.RequestNo?.trim();
            if (no && !byNo.has(no)) byNo.set(no, row);
          }
        } catch (err) {
          console.error("[anticipos] GetYourRequests failed", key, err);
        }
      }
      const records = recordsFromQueries([...byNo.values()]);
      const extrasList = await applyDestinoNombres(
        Object.values(records.extras),
        actor.accessToken,
      );
      const extras: Record<string, AnticipoExtra> = {};
      Object.keys(records.extras).forEach((no, i) => {
        extras[no] = extrasList[i];
      });
      return {
        anticipos: records.anticipos,
        extras,
        sessionIds: actor.ids,
        sessionNombre: actor.nombre,
        fromIfs: true,
        fromDb: false,
      };
    } catch (err) {
      console.error("[anticipos] GetYourRequests failed", err);
      return {
        anticipos: {},
        extras: {},
        sessionIds: actor.ids,
        sessionNombre: actor.nombre,
        fromIfs: true,
        fromDb: false,
      };
    }
  }

  try {
    const rows = await prisma.anticipo.findMany({
      where: visibleWhere(actor.ids),
      orderBy: { createdAt: "desc" },
    });
    if (rows.length > 0) {
      return {
        ...recordsFromRows(rows),
        sessionIds: actor.ids,
        sessionNombre: actor.nombre,
        fromIfs: false,
        fromDb: true,
      };
    }
  } catch (err) {
    if (!isDbUnavailable(err)) throw err;
  }

  return {
    anticipos: cloneInitialAnticipos(),
    extras: cloneInitialExtras(),
    sessionIds: actor.ids,
    sessionNombre: actor.nombre,
    fromIfs: false,
    fromDb: false,
  };
}

export async function listAprobacionAnticiposAction(
  alsoRequestNos: string[] = [],
): Promise<{
  solicitudes: Record<string, AnticipoAprobacion>;
  sessionNombre: string;
  fromIfs: boolean;
  fromDb: boolean;
}> {
  const actor = await resolveActor();

  if (actor.fromIfs && actor.accessToken) {
    if (!actor.personId) {
      return {
        solicitudes: {},
        sessionNombre: actor.nombre,
        fromIfs: true,
        fromDb: false,
      };
    }
    try {
      const pending = await getRequestsForApproval(
        actor.accessToken,
        actor.personId,
      );
      const ids = [...new Set([actor.personId, actor.empNo].filter(Boolean))];
      const resolved: CEmpAdvanceQuery[] = [];
      for (const id of ids) {
        try {
          const rows = await listAdvanceQueries(
            actor.accessToken,
            `ApproverId eq '${odataStringKey(id)}'`,
          );
          resolved.push(...rows);
        } catch (err) {
          console.error("[anticipos] CEmpAdvanceQuerySet failed", id, err);
        }
      }
      for (const no of alsoRequestNos.filter(Boolean)) {
        try {
          resolved.push(await getAdvanceQuery(actor.accessToken, no));
        } catch (err) {
          console.error("[anticipos] getAdvanceQuery failed", no, err);
        }
      }
      const byNo = new Map<string, CEmpAdvanceQuery>();
      for (const row of [...pending, ...resolved]) {
        const no = row.RequestNo?.trim();
        if (!no) continue;
        const prev = byNo.get(no);
        if (!prev) {
          byNo.set(no, row);
          continue;
        }
        const prevResolved = queryToAprobacion(prev).estadoApro;
        const nextResolved = queryToAprobacion(row).estadoApro;
        if (!prevResolved && nextResolved) byNo.set(no, row);
      }
      const mappedRows = [...byNo.values()].map(queryToAprobacion).filter((s) => s.no);
      const named = await applyDestinoNombres(mappedRows, actor.accessToken);
      const solicitudes: Record<string, AnticipoAprobacion> = {};
      for (const mapped of named) {
        solicitudes[mapped.no] = mapped;
      }
      return demoAprobacionIfEmpty({
        solicitudes,
        sessionNombre: actor.nombre,
        fromIfs: true,
        fromDb: false,
      });
    } catch (err) {
      console.error("[anticipos] GetRequestsForApproval failed", err);
      return demoAprobacionIfEmpty({
        solicitudes: {},
        sessionNombre: actor.nombre,
        fromIfs: true,
        fromDb: false,
      });
    }
  }

  try {
    const rows = await prisma.anticipo.findMany({
      where: { estado: { notIn: ["CANCELADO", "BORRADOR"] } },
      orderBy: { createdAt: "desc" },
    });
    if (rows.length > 0) {
      const solicitudes: Record<string, AnticipoAprobacion> = {};
      for (const row of rows) {
        solicitudes[row.codigo] = rowToAprobacion(row);
      }
      return {
        solicitudes,
        sessionNombre: actor.nombre,
        fromIfs: false,
        fromDb: true,
      };
    }
  } catch (err) {
    if (!isDbUnavailable(err)) throw err;
  }

  return {
    solicitudes: cloneInitialAproAnticipos(),
    sessionNombre: actor.nombre,
    fromIfs: false,
    fromDb: false,
  };
}

export async function lanzarAnticipoAction(
  input: LanzarAnticipoInput,
): Promise<{ no: string; error?: string }> {
  const actor = await resolveActor();

  if (isIfsAuthEnabled() && (!actor.fromIfs || !actor.accessToken)) {
    return {
      no: "",
      error: "No hay sesión IFS. Inicia sesión para enviar el anticipo a Employee Advances.",
    };
  }

  if (actor.fromIfs && actor.accessToken) {
    if (!actor.personId && !input.createdBy) {
      return {
        no: "",
        error: "Sesión IFS sin PersonId; no se puede crear el anticipo",
      };
    }
    try {
      const body = toCEmpAdvancesInsert(input, {
        personId: actor.personId,
        empNo: actor.empNo,
        supplierId: actor.supplierId,
        companyId: actor.companyId,
      });
      const missing: string[] = (
        [
          ["Company", body.Company],
          ["InvCompany", body.InvCompany],
          ["EmpNo", body.EmpNo],
          ["SupplierId", body.SupplierId],
          ["CreatedBy", body.CreatedBy],
          ["ProjectId", body.ProjectId],
          ["CurrencyCode", body.CurrencyCode],
          ["Description", body.Description],
        ] as const
      )
        .filter(([, value]) => !String(value || "").trim())
        .map(([key]) => key);
      if (!body.Amount) missing.push("Amount");
      if (missing.length) {
        return {
          no: "",
          error: `Faltan datos para IFS: ${missing.join(", ")}`,
        };
      }
      if (input.tipo === "Viaje" && !body.Destination) {
        return {
          no: "",
          error:
            "Ese destino no es válido en IFS. Elige un destino de la lista.",
        };
      }
      console.info("[anticipos] POST CEmpAdvancesSet", {
        Company: body.Company,
        InvCompany: body.InvCompany,
        EmpNo: body.EmpNo,
        SupplierId: body.SupplierId,
        CreatedBy: body.CreatedBy,
        ProjectId: body.ProjectId,
        Amount: body.Amount,
        CurrencyCode: body.CurrencyCode,
        RequestType: body.RequestType,
        Destination: body.Destination,
      });
      const created = await createEmpAdvance(actor.accessToken, body);
      const no = created.RequestNo?.trim();
      console.info("[anticipos] IFS create ok", {
        RequestNo: no,
        Objstate: created.Objstate,
      });
      if (!no) {
        return { no: "", error: "IFS creó el anticipo pero no devolvió RequestNo" };
      }
      return { no };
    } catch (err) {
      console.error("[anticipos] createEmpAdvance failed", err);
      return { no: "", error: formatIfsError(err) };
    }
  }

  let existingNos: string[] = [];
  try {
    const existing = await prisma.anticipo.findMany({
      select: { codigo: true },
    });
    existingNos = existing.map((r) => r.codigo);
  } catch (err) {
    if (!isDbUnavailable(err)) throw err;
    return { no: "", error: "No hay base de datos para guardar el anticipo" };
  }

  const nos: Record<string, Anticipo> = actor.fromIfs
    ? {}
    : cloneInitialAnticipos();
  for (const no of existingNos) {
    nos[no] = { no } as Anticipo;
  }
  const codigo = nuevoCodigoAnticipo(input.tipo, nos);
  const fecha = fechaHoyDMY();
  const ahora = `${fecha} · ahora`;
  const benefId = input.paraOtro
    ? normalizeAnticipoId(input.beneficiarioId ?? "")
    : actor.ids[0];
  const timeline: TimelineItem[] = [
    {
      accion: "Solicitud lanzada",
      usuario: actor.nombre,
      fecha: ahora,
      icon: "send",
      color: "#1e40af",
    },
    {
      accion: "Esperando aprobación",
      usuario: "Sistema",
      fecha: "Pendiente",
      icon: "clock",
      color: "#854d0e",
    },
  ];

  try {
    await prisma.anticipo.create({
      data: {
        codigo,
        fechaSolicitud: fecha,
        proyectoId: input.proyId,
        proyectoNombre: input.proyN,
        tipo: tipoUiToDb(input.tipo),
        monto: input.monto,
        divisa: input.div,
        estado: "LANZADO",
        motivo: input.motivo,
        aprobador: input.aprobador ?? null,
        pago: "Pendiente",
        solicitanteNombre: actor.nombre,
        solicitanteId: actor.ids[0],
        empleadoId: benefId,
        beneficiarioNombre: input.paraOtro
          ? (input.beneficiarioNombre ?? actor.nombre)
          : actor.nombre,
        beneficiarioCedula: input.paraOtro
          ? input.beneficiarioCedula ?? input.beneficiarioId
          : actor.ids[0],
        paraOtro: input.paraOtro,
        compania: input.compania,
        empCompania: input.empCompania,
        cuenta: input.beneficiarioCuenta ?? "",
        banco: input.beneficiarioBanco ?? "",
        tipoCuenta: input.beneficiarioTipoCuenta ?? "",
        fechaIda: input.fechaIda,
        fechaRegreso: input.fechaRegreso,
        destino: input.destino,
        tipoViaje: input.tipoViaje,
        timelineJson: timeline as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al guardar";
    return { no: "", error: msg };
  }

  return { no: codigo };
}

export async function cancelarAnticipoAction(
  no: string,
): Promise<{ ok: boolean; missing?: boolean; error?: string }> {
  const actor = await resolveActor();

  if (actor.fromIfs && actor.accessToken) {
    try {
      await cancelEmpAdvance(actor.accessToken, no);
      return { ok: true };
    } catch (err) {
      console.error("[anticipos] cancelEmpAdvance failed", err);
      return { ok: false, error: formatIfsError(err) };
    }
  }

  try {
    const row = await prisma.anticipo.findUnique({ where: { codigo: no } });
    if (!row) {
      return actor.fromIfs
        ? { ok: false, error: "La solicitud no existe" }
        : { ok: false, missing: true };
    }
    if (row.estado !== "LANZADO") {
      return { ok: false, error: "Solo se puede cancelar una solicitud Lanzado" };
    }
    const solId = normalizeAnticipoId(row.solicitanteId);
    if (!actor.ids.includes(solId)) {
      return { ok: false, error: "Solo quien registró puede cancelar" };
    }

    const tl = parseTimeline(row.timelineJson).filter(
      (t) => !t.accion.startsWith("Esperando"),
    );
    const nextTl: TimelineItem[] = [
      ...tl,
      {
        accion: "Cancelado por el empleado",
        usuario: actor.nombre,
        fecha: fechaHoyDMY(),
        icon: "ban",
        color: "#6b7280",
      },
    ];

    await prisma.anticipo.update({
      where: { codigo: no },
      data: {
        estado: "CANCELADO",
        pago: "—",
        timelineJson: nextTl as unknown as Prisma.InputJsonValue,
      },
    });
    return { ok: true };
  } catch (err) {
    if (isDbUnavailable(err) && !actor.fromIfs) {
      return { ok: false, missing: true };
    }
    const msg = err instanceof Error ? err.message : "Error al cancelar";
    return { ok: false, error: msg };
  }
}

export async function decidirAnticiposAction(input: {
  nos: string[];
  accion: "aprobado" | "rechazado";
  comentario: string;
  aprobadorNombre?: string;
}): Promise<{
  ok: boolean;
  persisted: string[];
  missing: string[];
  error?: string;
}> {
  const actor = await resolveActor();
  const fecha = fechaHoyDMY();
  const aprobador =
    input.aprobadorNombre?.trim() ||
    (actor.fromIfs ? actor.nombre : GERENTE_APROBADOR);
  const nos = input.nos.filter(Boolean);
  if (!nos.length) {
    return { ok: false, persisted: [], missing: [], error: "Sin solicitudes" };
  }

  const persisted: string[] = [];
  const missing: string[] = [];

  if (actor.fromIfs && actor.accessToken) {
    const approver = (actor.personId || actor.empNo || "").slice(0, 20);
    const errors: string[] = [];
    for (const no of nos) {
      try {
        if (input.accion === "aprobado") {
          await approveEmpAdvance(
            actor.accessToken,
            no,
            approver,
            input.comentario,
          );
        } else {
          await rejectEmpAdvance(
            actor.accessToken,
            no,
            approver,
            input.comentario,
          );
        }
        persisted.push(no);
      } catch (err) {
        console.error("[anticipos] decidir IFS failed", no, err);
        missing.push(no);
        errors.push(`${no}: ${formatIfsError(err)}`);
      }
    }
    return {
      ok: persisted.length > 0 && missing.length === 0,
      persisted,
      missing,
      error: errors.length ? errors.join(" · ") : undefined,
    };
  }

  try {
    for (const no of nos) {
      const row = await prisma.anticipo.findUnique({ where: { codigo: no } });
      if (!row || row.estado !== "LANZADO") {
        missing.push(no);
        continue;
      }
      const extra: AnticipoExtra = {
        compania: row.compania,
        empCompania: row.empCompania,
        empId: row.empleadoId,
        tl: parseTimeline(row.timelineJson),
      };
      const next = aplicarTimelineAprobacion(
        extra,
        input.accion,
        input.comentario,
        fecha,
        aprobador,
      );

      await prisma.anticipo.update({
        where: { codigo: no },
        data: {
          estado: input.accion === "aprobado" ? "APROBADO" : "RECHAZADO",
          fechaAprob: fecha,
          aprobador,
          aprobadorNombre: aprobador,
          pago: input.accion === "aprobado" ? "Pendiente" : "—",
          comentarioAprobacion: input.comentario.trim(),
          timelineJson: next.tl as unknown as Prisma.InputJsonValue,
        },
      });
      persisted.push(no);
    }
  } catch (err) {
    if (isDbUnavailable(err) && !actor.fromIfs) {
      return { ok: true, persisted: [], missing: nos };
    }
    const msg = err instanceof Error ? err.message : "Error al decidir";
    return { ok: false, persisted, missing, error: msg };
  }

  return { ok: true, persisted, missing };
}
