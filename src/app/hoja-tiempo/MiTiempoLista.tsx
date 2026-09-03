"use client";

import { Fragment, useMemo, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/src/components/ui/Card";
import { FloatingActions } from "@/src/components/ui/FloatingActions";
import { Icon } from "@/src/components/ui/Icon";
import { EstadoTiempoPill } from "@/src/components/ui/Pill";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { useToast } from "@/src/components/ui/Toast";
import {
  DataTable,
  dataTd,
  dataTdClamp,
  dataTdNumeric,
  dataTdTruncate,
  dataThWithAlign,
  dataTdResPrimary,
  dataTdResSecondary,
  MI_TIEMPO_LISTA_COLS,
} from "@/src/components/ui/DataTable";
import { EliminarRegistroModal } from "@/src/app/hoja-tiempo/EliminarRegistroModal";
import { TiempoRegistroMobileCard } from "@/src/app/hoja-tiempo/TiempoRegistroMobileCard";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
import {
  buildCalendarioGrid,
  filterRegistrosPorMes,
  formatFechaLegible,
  getMesLabel,
  getResumenHoras,
  getTipoHoraMeta,
  mesRefFromBounds,
  type RegistroEstado,
  type RegistroMock,
} from "@/src/lib/mi-tiempo-mock";
import {
  getListaRegistrosPorDia,
  isRegistroEditable,
  isRegistroEliminable,
} from "@/src/lib/tiempo-registro-rules";
import { getProyectoListaParts } from "@/src/lib/tiempo-bridge";
import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";
import { formatHorasValor } from "@/src/lib/tiempo-schedule";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_SEMANA_MOBILE = ["L", "M", "X", "J", "V", "S", "D"];

/** Escritorio/iPad: celda original. Teléfono: llena la fila del mes. */
const CAL_DIA_CELL =
  "min-h-[120px] max-h-[168px] overflow-hidden max-md:min-h-0 max-md:h-full max-md:max-h-none";

const ESTADOS_CAL_DESTACADOS = new Set<RegistroEstado>([
  "Aprobado",
  "Registrado",
  "Lanzado",
  "Rechazado",
]);

function CalendarioEstadoDia({ estado }: { estado: RegistroEstado }) {
  if (ESTADOS_CAL_DESTACADOS.has(estado)) {
    return <EstadoTiempoPill estado={estado} className="!text-[10px]" />;
  }
  return (
    <span className="text-[10px] font-medium text-muted">{estado}</span>
  );
}

function CalendarioLineaTipo({ tipo }: { tipo: string }) {
  const m = getTipoHoraMeta(tipo);
  return (
    <span className="inline-flex min-w-0 items-center gap-1 text-[10px] font-medium text-[#9ca3af]">
      <Icon name={m.icon} size="xs" className="shrink-0 opacity-70" />
      <span className="truncate">{m.s || tipo}</span>
    </span>
  );
}

function eventoBarClass(estado: RegistroEstado): string {
  if (estado === "Aprobado") return "bg-green-bg text-green";
  if (estado === "Rechazado") return "bg-[#fee2e2] text-red";
  if (estado === "Registrado" || estado === "Lanzado") {
    return "bg-[#dbeafe] text-[#1d4ed8]";
  }
  return "bg-[#e8eef4] text-navy";
}

function ResumenItem({
  label,
  value,
  tone,
  noBorder,
}: {
  label: string;
  value: string | number;
  tone?: "warn" | "ok" | "err";
  noBorder?: boolean;
}) {
  const toneClass =
    tone === "warn"
      ? "text-orange"
      : tone === "ok"
        ? "text-green"
        : tone === "err"
          ? "text-red"
          : "text-navy";

  return (
    <div
      className={`border-border px-4 py-3.5 text-center ${noBorder ? "border-r-0" : "border-r"}`}
    >
      <div className="mb-1.5 text-[11px] font-medium leading-snug text-muted">
        {label}
      </div>
      <div className={`text-[22px] font-bold ${toneClass}`}>
        {typeof value === "number" ? formatHorasValor(value) : value}
      </div>
    </div>
  );
}

type MiTiempoListaProps = {
  tab: "cal" | "lista";
  onTabChange: (tab: "cal" | "lista") => void;
  onSelectDia: (fecha: string, esHistorial: boolean) => void;
};

function HorasResumenBar() {
  const { registros, mesBounds, horasMesPrograma } = useMiTiempo();
  const resumen = getResumenHoras(
    filterRegistrosPorMes(registros, mesBounds),
    horasMesPrograma,
  );

  return (
    <div className="mb-4 flex gap-4 max-md:hidden">
      <Card className="mb-0 shrink-0 grow-0 basis-auto">
        <CardHeader>
          <span className="flex items-center text-sm">
            <Icon name="barChart" size="sm" className="text-navy" />
            <span className="ml-1.5">Resumen de horas</span>
          </span>
        </CardHeader>
        <div className="grid grid-cols-2">
          <ResumenItem label="Horas del Mes" value={resumen.horasMes} />
          <ResumenItem
            label="Pendientes de Reportar"
            value={resumen.pendientesReportar}
            tone="warn"
            noBorder
          />
        </div>
      </Card>

      <Card className="mb-0 min-w-0 flex-1">
        <CardHeader>
          <span className="text-sm">Horas Reportadas</span>
        </CardHeader>
        <div className="grid grid-cols-4">
          <ResumenItem label="Reportadas" value={resumen.reportadas} />
          <ResumenItem label="Aprobadas" value={resumen.aprobadas} tone="ok" />
          <ResumenItem label="Pend. Aprobar" value={resumen.pendAprobacion} />
          <ResumenItem
            label="Rechazadas"
            value={resumen.rechazadas}
            tone="err"
            noBorder
          />
        </div>
      </Card>
    </div>
  );
}

function CalendarioTab({
  onSelectDia,
}: Pick<MiTiempoListaProps, "onSelectDia">) {
  const { registros, mesBounds, horasMesPrograma, openRegistrarModal } =
    useMiTiempo();
  const registrosMes = useMemo(
    () => filterRegistrosPorMes(registros, mesBounds),
    [registros, mesBounds],
  );
  const resumen = getResumenHoras(registrosMes, horasMesPrograma);
  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);
  const mesRef = useMemo(() => mesRefFromBounds(mesBounds), [mesBounds]);
  const celdas = buildCalendarioGrid(mesRef, registrosMes, hoy);
  const weekRows = Math.max(1, Math.ceil(celdas.length / 7));

  return (
    <div className="max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col max-md:overflow-hidden">
      <div className="px-[22px] py-5 max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col max-md:px-0 max-md:py-0">
          <div className="mb-3 flex items-center justify-between gap-3 max-md:mb-1 max-md:px-3 max-md:pt-2">
            <span className="text-lg font-extrabold tracking-tight text-navy max-md:text-[15px]">
              {getMesLabel(mesRef)}
            </span>
            <span className="text-[13px] font-bold tabular-nums text-orange md:hidden">
              {resumen.pendientesReportar}
              <span className="ml-1 text-[10px] font-medium text-muted">
                por registrar
              </span>
            </span>
          </div>

          <div
            className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border max-md:min-h-0 max-md:flex-1 max-md:rounded-none max-md:border-0 max-md:[grid-template-rows:auto_repeat(var(--cal-weeks),minmax(0,1fr))]"
            style={{ ["--cal-weeks" as string]: weekRows }}
          >
            {DIAS_SEMANA.map((d, i) => (
              <div
                key={d}
                className="bg-[#f8fafc] px-2 py-2 text-center text-[11px] font-semibold text-muted max-md:px-0 max-md:py-1 max-md:text-[10px]"
              >
                <span className="md:hidden">{DIAS_SEMANA_MOBILE[i]}</span>
                <span className="hidden md:inline">{d}</span>
              </div>
            ))}

            {celdas.map((celda, i) => {
              if (celda.tipo === "vacio") {
                return (
                  <div
                    key={`v-${i}`}
                    className={`${CAL_DIA_CELL} px-2 py-2 opacity-40`}
                    style={{ background: celda.bg }}
                  />
                );
              }

              const dayNumberClass = celda.esFestivo
                ? "font-semibold text-orange"
                : celda.esHoy
                  ? "font-extrabold text-navy"
                  : celda.esFinSemana
                    ? "font-semibold text-[#60a5fa]"
                    : "font-semibold text-[#374151]";

              return (
                <button
                  key={celda.fechaStr}
                  type="button"
                  aria-label={
                    celda.resumen
                      ? `Ver registros del día ${celda.dia}`
                      : `Registrar horas del día ${celda.dia}`
                  }
                  onClick={() => {
                    if (celda.resumen) {
                      onSelectDia(celda.fechaStr, false);
                      return;
                    }
                    openRegistrarModal({
                      fecha: celda.fechaStr,
                      origen: "lista",
                    });
                  }}
                  className={`relative flex ${CAL_DIA_CELL} cursor-pointer flex-col items-start p-2.5 text-left transition-[filter,box-shadow] duration-100 hover:brightness-[0.96] max-md:items-stretch max-md:p-0.5 max-md:touch-manipulation ${
                    celda.esHoy
                      ? celda.esFestivo
                        ? "z-[1] ring-2 ring-inset ring-orange/70"
                        : "z-[1] ring-2 ring-inset ring-navy shadow-[0_0_0_1px_var(--navy)]"
                      : ""
                  }`}
                  style={{ background: celda.bg }}
                >
                  <div className="flex h-6 w-full shrink-0 items-center justify-center md:hidden">
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center text-[12px] leading-none ${
                        celda.esHoy
                          ? "rounded-full bg-navy font-bold text-white"
                          : dayNumberClass
                      }`}
                    >
                      {celda.dia}
                    </span>
                  </div>
                  {celda.resumen ? (
                    <div
                      className={`mt-0.5 flex h-[18px] w-full shrink-0 items-center justify-center rounded px-0.5 text-[10px] font-bold tabular-nums md:hidden ${eventoBarClass(celda.resumen.estadoDia)}`}
                    >
                      {celda.resumen.total}
                    </div>
                  ) : null}

                  <div className="hidden w-full shrink-0 md:block">
                    <div className="flex w-full items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`text-[13px] leading-none ${dayNumberClass}`}
                        >
                          {celda.dia}
                        </span>
                        {celda.esFestivo && (
                          <Icon
                            name="star"
                            size="xs"
                            className="shrink-0 text-[#f59e0b]"
                          />
                        )}
                        {celda.esHoy && (
                          <span
                            className={`rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${
                              celda.esFestivo
                                ? "border border-orange/40 bg-white/80 text-orange"
                                : "bg-navy text-white"
                            }`}
                          >
                            Hoy
                          </span>
                        )}
                        {celda.resumen && (
                          <CalendarioEstadoDia
                            estado={celda.resumen.estadoDia}
                          />
                        )}
                      </div>
                      {celda.resumen && (
                        <span
                          className={`shrink-0 text-[11px] font-semibold leading-none ${
                            celda.resumen.estadoDia === "Aprobado"
                              ? "text-green"
                              : "text-muted"
                          }`}
                        >
                          {celda.resumen.total}
                        </span>
                      )}
                    </div>

                    {celda.esFestivo && (
                      <div className="mt-1.5">
                        <span className="text-[10px] font-semibold leading-none text-orange">
                          Festivo
                        </span>
                      </div>
                    )}
                  </div>

                  {celda.resumen && celda.resumen.lineas.length > 0 && (
                    <div className="mt-2 hidden min-h-0 w-full flex-1 overflow-y-auto overscroll-contain md:block">
                      <div className="flex flex-col gap-0.5">
                        {celda.resumen.lineas.map((l) => (
                          <div
                            key={l.tipo}
                            className="flex items-center justify-between gap-1 text-[10px] leading-tight"
                          >
                            <CalendarioLineaTipo tipo={l.tipo} />
                            <span className="shrink-0 font-semibold text-[#9ca3af]">
                              {formatHorasValor(l.horas)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
      </div>
    </div>
  );
}

function ListaTab({
  onSelectDia,
}: Pick<MiTiempoListaProps, "onSelectDia">) {
  const { registros, mesBounds, openRegistrarModal, deleteRegistro } =
    useMiTiempo();
  const { toast } = useToast();
  const [registroAEliminar, setRegistroAEliminar] =
    useState<RegistroMock | null>(null);
  const dias = getListaRegistrosPorDia(
    filterRegistrosPorMes(registros, mesBounds),
  );
  const hayFilasEditables = dias.some((dia) =>
    dia.registros.some((r) => isRegistroEditable(r.estado)),
  );

  const columnas: { label: string; align: string }[] = [
    { label: "Proyecto", align: "text-left" },
    { label: "Actividad", align: "text-left" },
    { label: "Tipo", align: "text-left" },
    { label: "Horas", align: "text-center" },
    { label: "Coment. empleado", align: "text-left" },
    { label: "Coment. rechazo", align: "text-left" },
    { label: "Estado", align: "text-center" },
    { label: "", align: "text-center" },
  ];

  return (
    <>
      <div className="md:hidden">
        {dias.length === 0 ? (
          <div className="px-6 py-8 text-center text-[13px] text-muted">
            No hay registros todavía.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 p-3 md:hidden">
              {dias.map((dia) => (
                <div key={dia.fecha} className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectDia(dia.fecha, false)}
                    className="flex w-full items-center justify-between gap-2 px-1 text-left"
                  >
                    <span className="min-w-0 truncate text-[12px] font-semibold text-muted">
                      {formatFechaLegible(dia.fecha)}
                    </span>
                    <span className="shrink-0 text-[13px] font-bold tabular-nums text-navy">
                      {formatHorasValor(dia.totalHoras)}
                    </span>
                  </button>
                  {dia.registros.map((r) => (
                    <TiempoRegistroMobileCard
                      key={r.id}
                      registro={r}
                      onOpen={
                        isRegistroEditable(r.estado)
                          ? () =>
                              openRegistrarModal({
                                editId: r.id,
                                fecha: r.fecha,
                                origen: "lista",
                              })
                          : undefined
                      }
                      onDelete={
                        isRegistroEliminable(r.estado)
                          ? () => setRegistroAEliminar(r)
                          : undefined
                      }
                      deleteDisabled={!!registroAEliminar}
                    />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="hidden md:block">
        {hayFilasEditables ? (
          <p className="border-b border-border bg-[#fafbfc] px-[22px] py-2.5 text-[11px] font-normal text-muted">
            {TIEMPO_UI_COPY.filaEditableHint}
          </p>
        ) : null}
        {dias.length === 0 ? (
          <div className="px-6 py-8 text-center text-[13px] text-muted">
            No hay registros todavía.
          </div>
        ) : (
          <DataTable colWidths={[...MI_TIEMPO_LISTA_COLS]}>
            <thead>
              <tr>
                {columnas.map((col) => (
                  <th
                    key={col.label || "actions"}
                    className={dataThWithAlign(col.align)}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dias.map((dia) => {
                return (
                  <Fragment key={dia.fecha}>
                    <tr style={{ background: "#f8fafc" }}>
                      <td
                        colSpan={columnas.length}
                        className="border-t-2 border-border px-3 py-0"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectDia(dia.fecha, false)}
                          className="flex w-full items-center justify-between gap-3 rounded-sm px-1 py-2.5 text-left transition-colors hover:bg-[#eef3f9] active:bg-[#e5edf7]"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon
                              name="calendar"
                              size="xs"
                              className="shrink-0 text-muted"
                            />
                            <span className="text-[13px] font-semibold text-navy">
                              {formatFechaLegible(dia.fecha)}
                            </span>
                          </span>
                          <span className="shrink-0 text-[12px] text-muted">
                            {dia.registros.length} registro
                            {dia.registros.length !== 1 ? "s" : ""} ·{" "}
                            {formatHorasValor(dia.totalHoras)} h
                          </span>
                        </button>
                      </td>
                    </tr>
                    {dia.registros.map((r) => {
                      const esEditable = isRegistroEditable(r.estado);
                      const puedeEliminar = isRegistroEliminable(r.estado);
                      return (
                      <tr
                        key={r.id}
                        onClick={
                          esEditable
                            ? () =>
                                openRegistrarModal({
                                  editId: r.id,
                                  fecha: r.fecha,
                                  origen: "lista",
                                })
                            : undefined
                        }
                        className={`transition-colors duration-100 ${esEditable ? "cursor-pointer hover:bg-[#eef3f9] active:bg-[#dbeafe]" : "hover:bg-[#fafbfc]"}`}
                      >
                        <td className={dataTd}>
                          {(() => {
                            const proy = getProyectoListaParts(r.proy, r.proyNombre);
                            return (
                              <div className="min-w-0">
                                <div className={dataTdResPrimary}>{proy.codigo}</div>
                                {proy.nombre ? (
                                  <div
                                    className={dataTdResSecondary}
                                    title={proy.nombreFull}
                                  >
                                    {proy.nombre}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })()}
                        </td>
                        <td className={`${dataTd} ${dataTdTruncate}`}>{r.act}</td>
                        <td className={dataTd}>
                          <TipoHoraPill tipo={r.tipo} />
                        </td>
                        <td className={dataTdNumeric}>{formatHorasValor(r.horas)}</td>
                        <td className={`${dataTd} text-[#374151]`}>
                          <div className={dataTdClamp}>{r.comentario || "—"}</div>
                        </td>
                        <td
                          className={`${dataTd} ${r.comentarioRechazo ? "text-[#b91c1c]" : "text-[#9ca3af]"}`}
                        >
                          <div className={dataTdClamp}>
                            {r.comentarioRechazo || "—"}
                          </div>
                        </td>
                        <td className={`${dataTd} text-center`}>
                          <EstadoTiempoPill estado={r.estado} />
                        </td>
                        <td className={`${dataTd} text-center`}>
                          {puedeEliminar && (
                            <Button
                              variant="danger"
                              className="!px-2 !py-1 text-[11px]"
                              title="Eliminar"
                              disabled={!!registroAEliminar}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRegistroAEliminar(r);
                              }}
                            >
                              ✕
                            </Button>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </div>

      <EliminarRegistroModal
        open={!!registroAEliminar}
        registro={registroAEliminar}
        onClose={() => setRegistroAEliminar(null)}
        onConfirm={async () => {
          if (!registroAEliminar) return;
          try {
            await deleteRegistro(registroAEliminar.id);
            setRegistroAEliminar(null);
            toast("Registro eliminado", "navy");
          } catch (err) {
            toast(
              err instanceof Error
                ? err.message
                : "No se pudo eliminar el registro. Intenta de nuevo.",
              "danger",
            );
          }
        }}
      />
    </>
  );
}

function VistaTabs({
  tab,
  onTabChange,
}: {
  tab: "cal" | "lista";
  onTabChange: (tab: "cal" | "lista") => void;
}) {
  const item = (id: "cal" | "lista", label: string, icon: "calendar" | "list") => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => onTabChange(id)}
      className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all duration-150 max-md:min-h-12 max-md:flex-1 max-md:justify-center max-md:gap-1.5 max-md:px-2 max-md:text-[14px] ${
        tab === id
          ? "border-b-navy font-bold text-navy"
          : "border-b-transparent font-medium text-muted hover:bg-[#f0f2f5] hover:text-navy max-md:hover:bg-transparent max-md:active:bg-[#f0f2f5]"
      }`}
    >
      <Icon name={icon} size="sm" />
      {label}
    </button>
  );

  return (
    <div
      role="tablist"
      aria-label="Vista"
      className="flex min-w-0 flex-1"
    >
      {item("cal", "Calendario", "calendar")}
      {item("lista", "Lista", "list")}
    </div>
  );
}

export function MiTiempoLista({
  tab,
  onTabChange,
  onSelectDia,
}: MiTiempoListaProps) {
  const { openRegistrarModal } = useMiTiempo();
  const openNuevo = () => openRegistrarModal({ origen: "lista" });

  return (
    <div
      className={`view-wide ${
        tab === "cal"
          ? "max-md:flex max-md:h-[calc(100dvh-52px-env(safe-area-inset-bottom,0px))] max-md:flex-col max-md:px-2 max-md:pt-2"
          : "max-md:px-2 max-md:pt-2 max-md:pb-24"
      }`}
    >
      <h1 className="mb-4 hidden text-xl font-bold text-[#111] md:block">
        Mi Tiempo
      </h1>
      <h1 className="mb-3 shrink-0 text-lg font-bold text-[#111] md:hidden">
        Mi Tiempo
      </h1>

      <HorasResumenBar />

      <Card
        className={
          tab === "cal"
            ? "mb-4 p-0 max-md:!mb-0 max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col max-md:overflow-hidden md:overflow-visible"
            : "mb-4 overflow-visible p-0"
        }
      >
        <div className="sticky top-0 z-20 flex items-stretch rounded-t-lg border-b-2 border-[#e5e9f0] bg-white px-2 shadow-[0_1px_0_rgba(15,23,42,0.04)] max-md:px-1">
          <VistaTabs tab={tab} onTabChange={onTabChange} />
          <div className="hidden shrink-0 items-center py-1.5 pr-1 md:flex">
            <Button variant="primary" onClick={openNuevo}>
              <Icon name="plus" size="xs" />
              Registrar horas
            </Button>
          </div>
        </div>
        <div
          className={
            tab === "cal"
              ? "max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col max-md:overflow-hidden"
              : "max-md:min-h-0 max-md:flex-1 max-md:overflow-y-auto"
          }
        >
          {tab === "cal" ? (
            <CalendarioTab onSelectDia={onSelectDia} />
          ) : (
            <ListaTab onSelectDia={onSelectDia} />
          )}
        </div>
      </Card>

      <FloatingActions className="md:hidden">
        <Button variant="primary" onClick={openNuevo}>
          <Icon name="plus" size="xs" />
          Registrar horas
        </Button>
      </FloatingActions>
    </div>
  );
}
