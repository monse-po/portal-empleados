"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Card } from "@/src/components/ui/Card";
import { BulkActionButtons } from "@/src/components/ui/BulkSelectionBar";
import { IfsStatusBanner } from "@/src/components/layout/IfsStatusBanner";
import { TableBreadcrumb } from "@/src/components/ui/TableBreadcrumb";
import {
  CHECKBOX_COL_WIDTH,
  DataTable,
  TableDrillLink,
  dataTd,
  dataTdCheck,
  dataTdNumeric,
  dataTh,
  dataThCenter,
  dataThCheck,
  TABLE_PAGE_SIZE,
} from "@/src/components/ui/DataTable";
import { TablePagination } from "@/src/components/ui/TablePagination";
import { TableSelectionCheckbox } from "@/src/components/ui/TableSelectionCheckbox";
import { TableFilterSection } from "@/src/components/ui/TableFilterBar";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { useToast } from "@/src/components/ui/Toast";
import { useAprobacion } from "@/src/app/aprobacion-tiempo/AprobacionContext";
import { horasLabel } from "@/src/app/aprobacion-tiempo/AprobacionDetalle";
import {
  AprobarModal,
  RechazarModal,
} from "@/src/app/aprobacion-tiempo/AprobacionModals";
import { AprobacionProyectosFilterBar } from "@/src/app/aprobacion-tiempo-proyectos/AprobacionProyectosFilterBar";
import {
  mapApprovalTimesheetToEmpleados,
  mapApprovalTimesheetToHojasScoped,
  mapApprovalTimesheetToProyectos,
  type HorasEmpleadoAprobacion,
  type HorasProyectoAprobacion,
} from "@/src/lib/ifs/tiempo-approval";
import { horasNum } from "@/src/lib/aprobacion-tiempo-mock";
import {
  applyEmpleadoFilters,
  applyProyectoFilters,
  type AproProyFilterRule,
} from "@/src/lib/aprobacion-proyectos-filtros";
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
  "24%",
  "24%",
  "16%",
  "14%",
  "22%",
] as const;

const PLACEHOLDER = "—";
const SKELETON_ROWS = 6;

function roundHoras(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatHoras(n: number): string {
  const r = roundHoras(n);
  return Number.isInteger(r) ? `${r}` : r.toFixed(1);
}

function cellOrDash(value: string | number | undefined | null) {
  if (value == null) return PLACEHOLDER;
  const text = String(value).trim();
  return text.length ? text : PLACEHOLDER;
}

function Dash() {
  return <span className="text-[#c0c7d4]">{PLACEHOLDER}</span>;
}

function Cell({
  children,
  numeric,
}: {
  children: ReactNode;
  numeric?: boolean;
}) {
  const empty =
    children == null ||
    children === "" ||
    children === PLACEHOLDER;
  return (
    <td className={numeric ? dataTdNumeric : dataTd}>
      {empty ? <Dash /> : children}
    </td>
  );
}

function SkeletonBar({ width }: { width: string }) {
  return (
    <span
      className="inline-block h-3 rounded bg-[#e5e9f0]"
      style={{ width }}
    />
  );
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
  const {
    aprobar,
    rechazar,
    getHoja,
    syncPendientesDesdeDb,
    setTab: setTabRegistros,
    clearSeleccion: clearSeleccionRegistros,
  } = useAprobacion();
  const [proyectos, setProyectos] = useState<HorasProyectoAprobacion[]>([]);
  const [raw, setRaw] = useState<unknown>({ value: [] });
  const [loaded, setLoaded] = useState(false);
  const [ifsConnected, setIfsConnected] = useState(false);
  const [ifsEmail, setIfsEmail] = useState<string | null>(null);
  const [fromIfs, setFromIfs] = useState(false);
  const [ifsWarning, setIfsWarning] = useState<string | null>(null);
  const [filters, setFilters] = useState<AproProyFilterRule[]>([]);
  const [page, setPage] = useState(1);
  const [proyectoAbierto, setProyectoAbierto] = useState<string | null>(null);
  const [empleadoAbierto, setEmpleadoAbierto] = useState<string | null>(null);
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
    setIfsWarning(result.warning ?? null);
    setProyectos(result.proyectos);
    setRaw(result.raw);
    setFromIfs(result.fromIfs);
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
  const empleadoActual = empleadoAbierto
    ? empleados.find((e) => e.empNo === empleadoAbierto)
    : undefined;
  const enRegistros = Boolean(proyectoAbierto && empleadoAbierto);
  const enDetalle = Boolean(proyectoAbierto) && !enRegistros;

  const hojasScoped = useMemo(
    () =>
      proyectoAbierto && empleadoAbierto
        ? mapApprovalTimesheetToHojasScoped(raw, {
            codigoProyecto: proyectoAbierto,
            empNo: empleadoAbierto,
          })
        : [],
    [raw, proyectoAbierto, empleadoAbierto],
  );

  useEffect(() => {
    if (!enRegistros) return;
    syncPendientesDesdeDb(hojasScoped);
  }, [enRegistros, hojasScoped, syncPendientesDesdeDb]);

  const hojasPendientes = useMemo(
    () => hojasScoped.filter((h) => !h.estadoApro),
    [hojasScoped],
  );

  const proyectosPendientes = useMemo(
    () => proyectos.filter((p) => p.pendienteIds.length > 0),
    [proyectos],
  );
  const empleadosPendientes = useMemo(
    () => empleados.filter((e) => e.pendienteIds.length > 0),
    [empleados],
  );

  const pendientesCount = enRegistros
    ? hojasPendientes.length
    : enDetalle
      ? empleadosPendientes.length
      : proyectosPendientes.length;

  const proyectosFiltrados = useMemo(
    () => applyProyectoFilters(proyectosPendientes, filters),
    [proyectosPendientes, filters],
  );

  const empleadosFiltrados = useMemo(
    () => applyEmpleadoFilters(empleadosPendientes, filters),
    [empleadosPendientes, filters],
  );

  const seleccionables = useMemo(
    () =>
      enRegistros
        ? hojasPendientes.map((h) => h.no)
        : enDetalle
          ? empleadosFiltrados.map((e) => e.empNo)
          : proyectosFiltrados.map((p) => p.codigo),
    [enRegistros, hojasPendientes, enDetalle, empleadosFiltrados, proyectosFiltrados],
  );

  const kpis = useMemo(() => {
    if (enRegistros && empleadoActual) {
      return {
        pendientes: roundHoras(empleadoActual.horasPendientes),
        acumuladas: roundHoras(empleadoActual.horasAcumuladas),
        unidades: pendientesCount,
      };
    }
    if (enDetalle && proyectoActual) {
      return {
        pendientes: roundHoras(proyectoActual.horasPendientes),
        acumuladas: roundHoras(proyectoActual.horasAcumuladas),
        unidades: pendientesCount,
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
      unidades: pendientesCount,
    };
  }, [enRegistros, empleadoActual, pendientesCount, enDetalle, proyectoActual, proyectos]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const filas = enRegistros
    ? hojasPendientes
    : enDetalle
      ? empleadosFiltrados
      : proyectosFiltrados;
  const pages = Math.max(1, Math.ceil(filas.length / TABLE_PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const sliceProyectos = proyectosFiltrados.slice(
    (safePage - 1) * TABLE_PAGE_SIZE,
    safePage * TABLE_PAGE_SIZE,
  );
  const sliceEmpleados = empleadosFiltrados.slice(
    (safePage - 1) * TABLE_PAGE_SIZE,
    safePage * TABLE_PAGE_SIZE,
  );
  const sliceHojas = hojasPendientes.slice(
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
    clearSeleccionRegistros();
    setPage(1);
    setFilters([]);
    setEmpleadoAbierto(null);
    setProyectoAbierto(codigo);
  };

  const abrirEmpleado = (empNo: string) => {
    clearSeleccion();
    clearSeleccionRegistros();
    setPage(1);
    setFilters([]);
    setTabRegistros("pend");
    setEmpleadoAbierto(empNo);
  };

  const volverAEmpleados = () => {
    clearSeleccion();
    clearSeleccionRegistros();
    setPage(1);
    setFilters([]);
    setEmpleadoAbierto(null);
  };

  const volverAProyectos = () => {
    clearSeleccion();
    clearSeleccionRegistros();
    setPage(1);
    setFilters([]);
    setEmpleadoAbierto(null);
    setProyectoAbierto(null);
  };

  const solicitarAprobacion = (keys: string[]) => {
    const conPendiente = keys.filter((k) => seleccionables.includes(k));
    if (!conPendiente.length) {
      toast(
        enRegistros
          ? "Selecciona al menos un registro"
          : enDetalle
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
        enRegistros
          ? "Selecciona al menos un registro"
          : enDetalle
            ? "Selecciona al menos un empleado con horas por aprobar"
            : "Selecciona al menos un proyecto con horas por aprobar",
        "danger",
      );
      return;
    }
    setRechazarTargets(conPendiente);
  };

  const confirmarDecisionRegistros = async (
    nos: string[],
    decision: "aprobado" | "rechazado",
    comentario = "",
  ) => {
    const registroIds = nos
      .map((no) => getHoja(no)?.registroId)
      .filter((id): id is string => !!id);
    const result =
      decision === "aprobado"
        ? await aprobar(nos, comentario)
        : await rechazar(nos, comentario);
    if (!result.ok) {
      if (result.stale) {
        toast(
          "Algún registro ya no está pendiente en IFS. Actualizamos el detalle.",
          "warn",
        );
        await cargar();
        clearSeleccionRegistros();
        return;
      }
      toast(result.error || "No se pudo registrar la decisión en IFS.", "danger");
      return;
    }

    await cargar();

    const n = nos.length;
    const horasTxt = horasLabel(nos, getHoja);
    toast(
      decision === "aprobado"
        ? n === 1
          ? `${nos[0]} · ${horasTxt} aprobadas · IFS`
          : `${n} registros · ${horasTxt} aprobadas · IFS`
        : n === 1
          ? `${nos[0]} · ${horasTxt} rechazadas · el empleado fue notificado`
          : `${n} registros · ${horasTxt} rechazadas · el empleado fue notificado`,
      decision === "aprobado" ? "green" : "danger",
    );
    clearSeleccionRegistros();
  };

  const confirmarDecision = async (
    keys: string[],
    decision: "aprobado" | "rechazado",
    comentario?: string,
  ) => {
    if (enRegistros) {
      await confirmarDecisionRegistros(keys, decision, comentario);
      return;
    }
    const registroIds = enDetalle
      ? idsPendientesDe(empleados, keys, keyOfEmpleado)
      : idsPendientesDe(proyectos, keys, keyOfProyecto);
    if (!registroIds.length) {
      toast("Esa selección ya no tiene horas pendientes.", "warn");
      clearSeleccion();
      await cargar();
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
        await cargar();
        clearSeleccion();
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
          ? `${keys[0]} · ${horasLabel} aprobadas · IFS`
          : `${n} ${unidad} · ${horasLabel} aprobadas · IFS`
        : n === 1
          ? `${keys[0]} · ${horasLabel} rechazadas · el empleado fue notificado`
          : `${n} ${unidad} · ${horasLabel} rechazadas · los empleados fueron notificados`,
      decision === "aprobado" ? "green" : "danger",
    );
    clearSeleccion();
    await cargar();
  };

  const unidadSeleccion = enRegistros
    ? "registros"
    : enDetalle
      ? "empleados"
      : "proyectos";
  const aprobarResumen =
    aprobarTargets.length === 1
      ? aprobarTargets[0]
      : `${aprobarTargets.length} ${unidadSeleccion}`;
  const rechazarResumen =
    rechazarTargets.length === 1
      ? rechazarTargets[0]
      : `${rechazarTargets.length} ${unidadSeleccion}`;

  const horasModal = enRegistros
    ? Number(horasLabel(aprobarTargets, getHoja))
    : enDetalle
      ? horasPendientesDe(empleados, aprobarTargets, keyOfEmpleado)
      : horasPendientesDe(proyectos, aprobarTargets, keyOfProyecto);

  const tableCrumbs = [
    {
      label: "Proyectos",
      onClick: proyectoAbierto ? volverAProyectos : undefined,
    },
    ...(proyectoActual
      ? [
          {
            label: proyectoActual.codigo,
            onClick: enRegistros ? volverAEmpleados : undefined,
          },
        ]
      : []),
    ...(enRegistros
      ? [
          {
            label: empleadoActual?.nombre || empleadoAbierto || "Empleado",
          },
        ]
      : []),
  ];

  const tableBreadcrumb = <TableBreadcrumb items={tableCrumbs} />;

  return (
    <div className="view-wide max-md:pb-24">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#111]">Aprobar Tiempo</h1>
        <p className="mt-1 text-[13px] text-[#4b5563]">
          {enRegistros
            ? "Solo registros pendientes de este empleado."
            : enDetalle
              ? "Empleados con horas por aprobar en este proyecto."
              : "Proyectos con horas pendientes. Clic para ver empleados y registros."}
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
          value={formatHoras(kpis.pendientes)}
          sub={
            enRegistros
              ? `${kpis.unidades} registros con cola`
              : enDetalle
                ? `${kpis.unidades} empleados con cola`
                : `${kpis.unidades} proyectos con cola`
          }
          alert
        />
        <KpiCard
          label="Acumulado"
          value={formatHoras(kpis.acumuladas)}
          sub={
            enRegistros
              ? "Horas de este empleado"
              : enDetalle
                ? "Horas de este proyecto"
                : "Todas las horas del equipo"
          }
          navy
        />
        <KpiCard
          label={enRegistros ? "Registros" : enDetalle ? "Empleados" : "Proyectos"}
          value={
            enRegistros
              ? hojasPendientes.length
              : enDetalle
                ? empleadosPendientes.length
                : proyectosPendientes.length
          }
          sub="En la bandeja IFS"
        />
      </div>

      {enRegistros ? (
        <TableFilterSection sticky={false}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="shrink-0 text-[13px] font-medium text-[#374151]">
                Filtrar por:
              </span>
            </div>
            {loaded && hojasPendientes.length > 0 ? (
              <div className="shrink-0">
                <BulkActionButtons
                  onAprobar={() => solicitarAprobacion(selectedKeys)}
                  onRechazar={() => solicitarRechazo(selectedKeys)}
                />
              </div>
            ) : null}
          </div>
        </TableFilterSection>
      ) : (
        <AprobacionProyectosFilterBar
          level={enDetalle ? "empleado" : "proyecto"}
          proyectos={proyectosPendientes}
          empleados={empleadosPendientes}
          filters={filters}
          onChange={setFilters}
          shown={filas.length}
          total={enDetalle ? empleadosPendientes.length : proyectosPendientes.length}
          actions={
            loaded && seleccionables.length > 0 ? (
              <BulkActionButtons
                onAprobar={() => solicitarAprobacion(selectedKeys)}
                onRechazar={() => solicitarRechazo(selectedKeys)}
              />
            ) : undefined
          }
        />
      )}

      <Card className="overflow-hidden p-0">
        {tableBreadcrumb}
        <DataTable colWidths={[...COLS]}>
          <thead>
            <tr>
              <th className={dataThCheck}>
                <TableSelectionCheckbox
                  checked={allSelected}
                  indeterminate={someSelected && !allSelected}
                  onChange={() => toggleSeleccionLote(seleccionables)}
                  aria-label={
                    enRegistros
                      ? "Seleccionar todos los registros pendientes"
                      : enDetalle
                        ? "Seleccionar todos los empleados con horas pendientes"
                        : "Seleccionar todos los proyectos con horas pendientes"
                  }
                />
              </th>
              <th className={dataTh}>
                {enRegistros ? "Fecha" : enDetalle ? "Empleado" : "Proyecto"}
              </th>
              <th className={dataTh}>
                {enRegistros ? "Actividad" : enDetalle ? "Cédula" : "Nombre"}
              </th>
              <th className={dataTh}>Tipo</th>
              <th className={dataThCenter}>
                {enRegistros ? "Horas" : "Por aprobar"}
              </th>
              <th className={enRegistros ? dataTh : dataThCenter}>
                {enRegistros ? "Comentario" : "Acumulado"}
              </th>
            </tr>
          </thead>
          <tbody>
            {!loaded
              ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                  <tr key={`sk-${i}`}>
                    <td className={dataTdCheck}>
                      <SkeletonBar width="14px" />
                    </td>
                    <td className={dataTd}>
                      <SkeletonBar width="72%" />
                    </td>
                    <td className={dataTd}>
                      <SkeletonBar width="64%" />
                    </td>
                    <td className={dataTd}>
                      <SkeletonBar width="40%" />
                    </td>
                    <td className={dataTdNumeric}>
                      <SkeletonBar width="32px" />
                    </td>
                    <td className={dataTd}>
                      <SkeletonBar width="70%" />
                    </td>
                  </tr>
                ))
              : !filas.length
                ? (
                    <tr>
                      <td className={dataTdCheck} />
                      <Cell>{PLACEHOLDER}</Cell>
                      <Cell>{PLACEHOLDER}</Cell>
                      <Cell>{PLACEHOLDER}</Cell>
                      <Cell numeric>{PLACEHOLDER}</Cell>
                      <Cell>{PLACEHOLDER}</Cell>
                    </tr>
                  )
                : enRegistros
                  ? sliceHojas.map((h) => (
                      <tr
                        key={h.no}
                        onClick={() => toggleSeleccion(h.no)}
                        className="cursor-pointer transition-colors hover:bg-[#fafbfc]"
                      >
                        <td
                          className={dataTdCheck}
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <TableSelectionCheckbox
                            checked={seleccion.has(h.no)}
                            onChange={() => toggleSeleccion(h.no)}
                            aria-label={`Seleccionar ${h.no}`}
                          />
                        </td>
                        <Cell>{cellOrDash(h.fecha)}</Cell>
                        <Cell>{cellOrDash(h.actividad)}</Cell>
                        <Cell>
                          {h.tipo ? <TipoHoraPill tipo={h.tipo} /> : PLACEHOLDER}
                        </Cell>
                        <Cell numeric>{horasNum(h.horas)}</Cell>
                        <Cell>{cellOrDash(h.comentarioEmpleado)}</Cell>
                      </tr>
                    ))
                  : enDetalle
                    ? sliceEmpleados.map((e) => (
                        <tr
                          key={e.empNo}
                          className="transition-colors hover:bg-[#fafbfc]"
                        >
                          <td className={dataTdCheck}>
                            <TableSelectionCheckbox
                              checked={seleccion.has(e.empNo)}
                              onChange={() => toggleSeleccion(e.empNo)}
                              aria-label={`Seleccionar ${e.nombre}`}
                            />
                          </td>
                          <td className={dataTd}>
                            <TableDrillLink
                              title={e.nombre}
                              onClick={() => abrirEmpleado(e.empNo)}
                            >
                              {cellOrDash(e.nombre)}
                            </TableDrillLink>
                          </td>
                          <Cell>{cellOrDash(e.empNo)}</Cell>
                          <Cell>{PLACEHOLDER}</Cell>
                          <Cell numeric>
                            {formatHoras(e.horasPendientes)}
                          </Cell>
                          <Cell numeric>
                            {formatHoras(e.horasAcumuladas)}
                          </Cell>
                        </tr>
                      ))
                    : sliceProyectos.map((p) => {
                        const nombre =
                          p.nombre && p.nombre !== p.codigo ? p.nombre : "";
                        return (
                          <tr
                            key={p.codigo}
                            className="transition-colors hover:bg-[#fafbfc]"
                          >
                            <td className={dataTdCheck}>
                              <TableSelectionCheckbox
                                checked={seleccion.has(p.codigo)}
                                onChange={() => toggleSeleccion(p.codigo)}
                                aria-label={`Seleccionar ${p.codigo}`}
                              />
                            </td>
                            <td className={dataTd}>
                              <TableDrillLink
                                title={p.codigo}
                                onClick={() => abrirProyecto(p.codigo)}
                              >
                                {cellOrDash(p.codigo)}
                              </TableDrillLink>
                            </td>
                            <Cell>{cellOrDash(nombre)}</Cell>
                            <Cell>{PLACEHOLDER}</Cell>
                            <Cell numeric>
                              {formatHoras(p.horasPendientes)}
                            </Cell>
                            <Cell numeric>
                              {formatHoras(p.horasAcumuladas)}
                            </Cell>
                          </tr>
                        );
                      })}
          </tbody>
        </DataTable>

        {loaded && filas.length > 0 ? (
          <TablePagination
            page={safePage}
            total={filas.length}
            onPageChange={setPage}
          />
        ) : null}
      </Card>

      <AprobarModal
        open={aprobarTargets.length > 0}
        registroLabel={aprobarResumen}
        empleado={
          enRegistros
            ? empleadoActual?.nombre || "Empleado"
            : enDetalle
              ? "Empleado"
              : "Equipo"
        }
        horas={formatHoras(horasModal)}
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
