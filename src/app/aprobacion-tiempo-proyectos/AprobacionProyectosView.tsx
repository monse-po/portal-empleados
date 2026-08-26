"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { BulkSelectionBar } from "@/src/components/ui/BulkSelectionBar";
import { IfsStatusBanner } from "@/src/components/layout/IfsStatusBanner";
import { PageBreadcrumb } from "@/src/components/ui/PageBreadcrumb";
import {
  ACTION_COL_WIDTH,
  CHECKBOX_COL_WIDTH,
  DataTable,
  dataTd,
  dataTdAction,
  dataTdCheck,
  dataTdNumeric,
  dataTdResPrimary,
  dataTdResSecondary,
  dataTh,
  dataThAction,
  dataThCenter,
  dataThCheck,
  TableActionWrap,
  TABLE_PAGE_SIZE,
} from "@/src/components/ui/DataTable";
import { TablePagination } from "@/src/components/ui/TablePagination";
import { TableAproIconButton } from "@/src/components/ui/TableAproIconButton";
import { TableSelectionCheckbox } from "@/src/components/ui/TableSelectionCheckbox";
import { useToast } from "@/src/components/ui/Toast";
import {
  AprobarModal,
  RechazarModal,
} from "@/src/app/aprobacion-tiempo/AprobacionModals";
import {
  mapApprovalTimesheetToEmpleados,
  type HorasEmpleadoAprobacion,
  type HorasProyectoAprobacion,
} from "@/src/lib/ifs/tiempo-approval";
import {
  getResumenProyectosAprobacionAction,
  resolverAprobacionTiempoAction,
} from "@/src/server/mi-tiempo-actions";
import { getIfsSessionStatusAction } from "@/src/server/mi-tiempo-catalog-actions";
import {
  getSelectionState,
  useTableSelection,
} from "@/src/lib/use-table-selection";

const COLS = [
  CHECKBOX_COL_WIDTH,
  "46%",
  "22%",
  "22%",
  ACTION_COL_WIDTH,
] as const;

function roundHoras(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatHoras(n: number): string {
  const r = roundHoras(n);
  return Number.isInteger(r) ? `${r}` : r.toFixed(1);
}

function KpiCard({
  label,
  value,
  sub,
  alert,
  navy,
}: {
  label: string;
  value: string | number;
  sub: string;
  alert?: boolean;
  navy?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 ${
        alert
          ? "border-[#fcd34d] bg-[#fffbeb]"
          : navy
            ? "border-[#c7d9ed] bg-[#eef3f9]"
            : "border-border bg-white"
      }`}
    >
      <div
        className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${
          navy ? "text-navy" : "text-muted"
        }`}
      >
        {label}
      </div>
      <div
        className={`text-[28px] font-extrabold leading-none ${alert ? "text-[#b45309]" : "text-navy"}`}
      >
        {value}
      </div>
      <div className={`mt-1.5 text-[11px] ${navy ? "text-navy/70" : "text-muted"}`}>
        {sub}
      </div>
    </div>
  );
}

function idsPendientesDe<T extends { pendienteIds: string[] }>(
  items: T[],
  keys: string[],
  keyOf: (item: T) => string,
): string[] {
  const wanted = new Set(keys);
  const ids: string[] = [];
  for (const item of items) {
    if (!wanted.has(keyOf(item))) continue;
    ids.push(...item.pendienteIds);
  }
  return [...new Set(ids)];
}

function horasPendientesDe<T extends { pendienteIds: string[]; horasPendientes: number }>(
  items: T[],
  keys: string[],
  keyOf: (item: T) => string,
): number {
  const wanted = new Set(keys);
  return roundHoras(
    items
      .filter((item) => wanted.has(keyOf(item)))
      .reduce((sum, item) => sum + item.horasPendientes, 0),
  );
}

export function AprobacionProyectosView() {
  const { toast } = useToast();
  const [proyectos, setProyectos] = useState<HorasProyectoAprobacion[]>([]);
  const [raw, setRaw] = useState<unknown>({ value: [] });
  const [loaded, setLoaded] = useState(false);
  const [ifsConnected, setIfsConnected] = useState(false);
  const [ifsEmail, setIfsEmail] = useState<string | null>(null);
  const [fromIfs, setFromIfs] = useState(false);
  const [ifsWarning, setIfsWarning] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [proyectoAbierto, setProyectoAbierto] = useState<string | null>(null);
  const [aprobarTargets, setAprobarTargets] = useState<string[]>([]);
  const [rechazarTargets, setRechazarTargets] = useState<string[]>([]);
  const {
    seleccion,
    toggleSeleccion,
    toggleSeleccionLote,
    clearSeleccion,
  } = useTableSelection();

  const cargar = useCallback(async () => {
    const result = await getResumenProyectosAprobacionAction();
    setProyectos(result.proyectos);
    setRaw(result.raw);
    setFromIfs(result.fromIfs);
    setIfsWarning(result.warning ?? null);
    return result;
  }, []);

  useEffect(() => {
    void getIfsSessionStatusAction().then((status) => {
      setIfsConnected(status.connected);
      setIfsEmail(status.email ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void cargar()
      .then((result) => {
        if (cancelled) return;
        if (result.warning) toast(result.warning, "warn");
      })
      .catch(() => {
        if (!cancelled) {
          toast("No se pudo cargar el resumen por proyecto.", "danger");
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cargar, toast]);

  const empleados = useMemo((): HorasEmpleadoAprobacion[] => {
    if (!proyectoAbierto) return [];
    return mapApprovalTimesheetToEmpleados(raw, proyectoAbierto);
  }, [proyectoAbierto, raw]);

  const proyectoActual = proyectoAbierto
    ? proyectos.find((p) => p.codigo === proyectoAbierto)
    : undefined;
  const enDetalle = Boolean(proyectoAbierto);

  const seleccionables = useMemo(
    () =>
      enDetalle
        ? empleados.filter((e) => e.pendienteIds.length > 0).map((e) => e.empNo)
        : proyectos.filter((p) => p.pendienteIds.length > 0).map((p) => p.codigo),
    [enDetalle, empleados, proyectos],
  );

  const kpis = useMemo(() => {
    if (enDetalle && proyectoActual) {
      return {
        pendientes: roundHoras(proyectoActual.horasPendientes),
        acumuladas: roundHoras(proyectoActual.horasAcumuladas),
        unidades: empleados.filter((e) => e.pendienteIds.length > 0).length,
      };
    }
    let acumuladas = 0;
    let pendientes = 0;
    for (const p of proyectos) {
      acumuladas += p.horasAcumuladas;
      pendientes += p.horasPendientes;
    }
    return {
      pendientes: roundHoras(pendientes),
      acumuladas: roundHoras(acumuladas),
      unidades: proyectos.filter((p) => p.pendienteIds.length > 0).length,
    };
  }, [enDetalle, proyectoActual, empleados, proyectos]);

  const filas = enDetalle ? empleados : proyectos;
  const pages = Math.max(1, Math.ceil(filas.length / TABLE_PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const sliceProyectos = proyectos.slice(
    (safePage - 1) * TABLE_PAGE_SIZE,
    safePage * TABLE_PAGE_SIZE,
  );
  const sliceEmpleados = empleados.slice(
    (safePage - 1) * TABLE_PAGE_SIZE,
    safePage * TABLE_PAGE_SIZE,
  );
  const { allSelected, someSelected } = getSelectionState(
    seleccion,
    seleccionables,
  );

  const selectedKeys = [...seleccion];
  const keyOfProyecto = (p: HorasProyectoAprobacion) => p.codigo;
  const keyOfEmpleado = (e: HorasEmpleadoAprobacion) => e.empNo;

  const abrirProyecto = (codigo: string) => {
    clearSeleccion();
    setPage(1);
    setProyectoAbierto(codigo);
  };

  const volverAProyectos = () => {
    clearSeleccion();
    setPage(1);
    setProyectoAbierto(null);
  };

  const solicitarAprobacion = (keys: string[]) => {
    const conPendiente = keys.filter((k) => seleccionables.includes(k));
    if (!conPendiente.length) {
      toast(
        enDetalle
          ? "Selecciona al menos un empleado con horas por aprobar"
          : "Selecciona al menos un proyecto con horas por aprobar",
        "danger",
      );
      return;
    }
    setAprobarTargets(conPendiente);
  };

  const solicitarRechazo = (keys: string[]) => {
    const conPendiente = keys.filter((k) => seleccionables.includes(k));
    if (!conPendiente.length) {
      toast(
        enDetalle
          ? "Selecciona al menos un empleado con horas por aprobar"
          : "Selecciona al menos un proyecto con horas por aprobar",
        "danger",
      );
      return;
    }
    setRechazarTargets(conPendiente);
  };

  const confirmarDecision = async (
    keys: string[],
    decision: "aprobado" | "rechazado",
    comentario?: string,
  ) => {
    const registroIds = enDetalle
      ? idsPendientesDe(empleados, keys, keyOfEmpleado)
      : idsPendientesDe(proyectos, keys, keyOfProyecto);
    if (!registroIds.length) {
      toast("Esa selección ya no tiene horas pendientes.", "warn");
      const refreshed = await cargar();
      clearSeleccion();
      if (proyectoAbierto) {
        const still = refreshed.proyectos.find((p) => p.codigo === proyectoAbierto);
        if (!still?.pendienteIds.length) setProyectoAbierto(null);
      }
      return;
    }

    const horas = enDetalle
      ? horasPendientesDe(empleados, keys, keyOfEmpleado)
      : horasPendientesDe(proyectos, keys, keyOfProyecto);

    const result = await resolverAprobacionTiempoAction({
      registroIds,
      decision,
      comentario,
    });
    if (!result.ok) {
      if (result.stale) {
        toast(
          "Algún registro ya no está pendiente en IFS. Actualizamos el resumen.",
          "warn",
        );
        const refreshed = await cargar();
        clearSeleccion();
        if (proyectoAbierto) {
          const still = refreshed.proyectos.find((p) => p.codigo === proyectoAbierto);
          if (!still?.pendienteIds.length) setProyectoAbierto(null);
        }
        return;
      }
      toast(result.error || "No se pudo registrar la decisión en IFS.", "danger");
      return;
    }

    const n = keys.length;
    const horasLabel = formatHoras(horas);
    const unidad = enDetalle ? "empleados" : "proyectos";
    toast(
      decision === "aprobado"
        ? n === 1
          ? `${keys[0]} · ${horasLabel}h aprobadas · IFS`
          : `${n} ${unidad} · ${horasLabel}h aprobadas · IFS`
        : n === 1
          ? `${keys[0]} · ${horasLabel}h rechazadas · el empleado fue notificado`
          : `${n} ${unidad} · ${horasLabel}h rechazadas · los empleados fueron notificados`,
      decision === "aprobado" ? "green" : "danger",
    );
    clearSeleccion();
    const refreshed = await cargar();
    if (proyectoAbierto) {
      const still = refreshed.proyectos.find((p) => p.codigo === proyectoAbierto);
      if (!still?.pendienteIds.length) setProyectoAbierto(null);
    }
  };

  const aprobarResumen =
    aprobarTargets.length === 1
      ? aprobarTargets[0]
      : `${aprobarTargets.length} ${enDetalle ? "empleados" : "proyectos"}`;
  const rechazarResumen =
    rechazarTargets.length === 1
      ? rechazarTargets[0]
      : `${rechazarTargets.length} ${enDetalle ? "empleados" : "proyectos"}`;

  const horasModal = enDetalle
    ? horasPendientesDe(empleados, aprobarTargets, keyOfEmpleado)
    : horasPendientesDe(proyectos, aprobarTargets, keyOfProyecto);

  return (
    <div className="view-wide max-md:pb-24">
      <div className="mb-4">
        {enDetalle && proyectoActual ? (
          <PageBreadcrumb
            parentLabel="Proyectos"
            onVolver={volverAProyectos}
            segment="Empleados"
          />
        ) : null}
        <h1 className={`text-xl font-bold text-[#111] ${enDetalle ? "mt-3" : ""}`}>
          {enDetalle && proyectoActual
            ? `Empleados · ${proyectoActual.codigo}`
            : "Aprobación por proyecto"}
        </h1>
        <p className="mt-1 text-[13px] text-[#4b5563]">
          {enDetalle && proyectoActual
            ? `${proyectoActual.nombre !== proyectoActual.codigo ? `${proyectoActual.nombre} · ` : ""}Aprueba por persona o en lote. El lote de todo el proyecto sigue en la lista anterior.`
            : "Dos niveles: aquí apruebas el proyecto entero. En cada fila, «Ver empleados» abre el detalle por persona."}{" "}
          <Link href="/aprobacion-tiempo" className="font-semibold text-navy underline">
            Ver bandeja por registro
          </Link>
        </p>
        <div className="mt-3">
          <IfsStatusBanner
            surface="approval"
            loginNext="/aprobacion-tiempo-proyectos"
            connected={ifsConnected}
            fromIfs={fromIfs}
            email={ifsEmail}
            warning={ifsWarning}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard
          label="Por aprobar"
          value={`${formatHoras(kpis.pendientes)}h`}
          sub={
            enDetalle
              ? `${kpis.unidades} empleados con cola`
              : `${kpis.unidades} proyectos con cola`
          }
          alert
        />
        <KpiCard
          label="Acumulado"
          value={`${formatHoras(kpis.acumuladas)}h`}
          sub={enDetalle ? "Horas de este proyecto" : "Todas las horas del equipo"}
          navy
        />
        <KpiCard
          label={enDetalle ? "Empleados" : "Proyectos"}
          value={enDetalle ? empleados.length : proyectos.length}
          sub={enDetalle ? "En este proyecto" : "En la bandeja IFS"}
        />
      </div>

      {seleccion.size > 0 && (
        <BulkSelectionBar
          className="mb-3.5"
          count={seleccion.size}
          onAprobar={() => solicitarAprobacion(selectedKeys)}
          onRechazar={() => solicitarRechazo(selectedKeys)}
        />
      )}

      <Card className="overflow-hidden p-0">
        {loaded ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e9f0] bg-[#f8fafc] px-4 py-2.5">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-navy">
              {enDetalle && proyectoActual
                ? `Nivel 2 · empleados de ${proyectoActual.codigo}`
                : "Nivel 1 · proyectos"}
            </span>
            <span className="text-[12px] text-muted">
              {enDetalle
                ? "Aprobar / rechazar por persona o con los checkboxes"
                : "Lote en los checks · detalle con «Ver empleados»"}
            </span>
          </div>
        ) : null}
        {!loaded ? (
          <div className="px-5 py-12 text-center text-[13px] text-muted">
            Cargando resumen por proyecto…
          </div>
        ) : !proyectos.length ? (
          <div className="px-5 py-12 text-center text-[13px] text-muted">
            <Icon name="briefcase" size="xl" className="mx-auto mb-2 opacity-30" />
            Sin horas por proyecto. Si IFS solo entrega pendientes y no hay
            cola, esta tabla queda vacía.
          </div>
        ) : enDetalle && !empleados.length ? (
          <div className="px-5 py-12 text-center text-[13px] text-muted">
            <Icon name="user" size="xl" className="mx-auto mb-2 opacity-30" />
            Este proyecto no tiene horas por empleado en la bandeja.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <DataTable colWidths={[...COLS]}>
                <thead>
                  <tr>
                    <th className={dataThCheck}>
                      <TableSelectionCheckbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={() => toggleSeleccionLote(seleccionables)}
                        aria-label={
                          enDetalle
                            ? "Seleccionar todos los empleados con horas pendientes"
                            : "Seleccionar todos los proyectos con horas pendientes"
                        }
                      />
                    </th>
                    <th className={dataTh}>{enDetalle ? "Empleado" : "Proyecto"}</th>
                    <th className={dataThCenter}>Por aprobar</th>
                    <th className={dataThCenter}>Acumulado</th>
                    <th className={dataThAction}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {enDetalle
                    ? sliceEmpleados.map((e) => {
                        const puedeAprobar = e.pendienteIds.length > 0;
                        return (
                          <tr key={e.empNo} className="hover:bg-[#f8fafc]">
                            <td className={dataTdCheck}>
                              {puedeAprobar ? (
                                <TableSelectionCheckbox
                                  checked={seleccion.has(e.empNo)}
                                  onChange={() => toggleSeleccion(e.empNo)}
                                  aria-label={`Seleccionar ${e.nombre}`}
                                />
                              ) : null}
                            </td>
                            <td className={dataTd}>
                              <div className={dataTdResPrimary}>{e.nombre}</div>
                              <div className={dataTdResSecondary}>{e.empNo}</div>
                            </td>
                            <td className={dataTdNumeric}>
                              {formatHoras(e.horasPendientes)}h
                            </td>
                            <td className={dataTdNumeric}>
                              {formatHoras(e.horasAcumuladas)}h
                            </td>
                            <td className={dataTdAction}>
                              {puedeAprobar ? (
                                <TableActionWrap>
                                  <TableAproIconButton
                                    variant="ok"
                                    title={`Aprobar ${formatHoras(e.horasPendientes)}h de ${e.nombre}`}
                                    onClick={() => solicitarAprobacion([e.empNo])}
                                  />
                                  <TableAproIconButton
                                    variant="no"
                                    title={`Rechazar ${formatHoras(e.horasPendientes)}h de ${e.nombre}`}
                                    onClick={() => solicitarRechazo([e.empNo])}
                                  />
                                </TableActionWrap>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })
                    : sliceProyectos.map((p) => {
                        const puedeAprobar = p.pendienteIds.length > 0;
                        return (
                          <tr key={p.codigo} className="hover:bg-[#f8fafc]">
                            <td className={dataTdCheck}>
                              {puedeAprobar ? (
                                <TableSelectionCheckbox
                                  checked={seleccion.has(p.codigo)}
                                  onChange={() => toggleSeleccion(p.codigo)}
                                  aria-label={`Seleccionar ${p.codigo}`}
                                />
                              ) : null}
                            </td>
                            <td className={dataTd}>
                              <div className={`${dataTdResPrimary} font-semibold tabular-nums`}>
                                {p.codigo}
                              </div>
                              <div className={dataTdResSecondary}>
                                {p.nombre !== p.codigo
                                  ? p.nombre
                                  : `${p.registros} registros`}
                              </div>
                              <button
                                type="button"
                                onClick={() => abrirProyecto(p.codigo)}
                                className="btn-link mt-1 inline-flex items-center gap-0.5 text-[11.5px] font-semibold"
                              >
                                Ver empleados
                                <Icon name="chevronRight" size="xs" />
                              </button>
                            </td>
                            <td className={dataTdNumeric}>
                              {formatHoras(p.horasPendientes)}h
                            </td>
                            <td className={dataTdNumeric}>
                              {formatHoras(p.horasAcumuladas)}h
                            </td>
                            <td className={dataTdAction}>
                              {puedeAprobar ? (
                                <TableActionWrap>
                                  <TableAproIconButton
                                    variant="ok"
                                    title={`Aprobar ${formatHoras(p.horasPendientes)}h de ${p.codigo}`}
                                    onClick={() => solicitarAprobacion([p.codigo])}
                                  />
                                  <TableAproIconButton
                                    variant="no"
                                    title={`Rechazar ${formatHoras(p.horasPendientes)}h de ${p.codigo}`}
                                    onClick={() => solicitarRechazo([p.codigo])}
                                  />
                                </TableActionWrap>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </DataTable>
            </div>
            <TablePagination
              page={safePage}
              total={filas.length}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <AprobarModal
        open={aprobarTargets.length > 0}
        registroLabel={aprobarResumen}
        empleado={enDetalle ? "Empleado" : "Equipo"}
        horas={`${formatHoras(horasModal)}h`}
        onClose={() => setAprobarTargets([])}
        onConfirm={async () => {
          const targets = [...aprobarTargets];
          await confirmarDecision(targets, "aprobado");
          setAprobarTargets([]);
        }}
      />
      <RechazarModal
        open={rechazarTargets.length > 0}
        resumen={rechazarResumen}
        onClose={() => setRechazarTargets([])}
        onConfirm={async (motivo) => {
          const targets = [...rechazarTargets];
          await confirmarDecision(targets, "rechazado", motivo);
          setRechazarTargets([]);
        }}
      />
    </div>
  );
}
