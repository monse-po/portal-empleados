"use client";

import { Fragment } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { EstadoTiempoPill } from "@/src/components/ui/Pill";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import {
  DataTable,
  dataTd,
  dataTdClamp,
  dataTdNumeric,
  dataTdTruncate,
  dataTh,
  dataThWithAlign,
  MI_TIEMPO_COLS,
} from "@/src/components/ui/DataTable";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
import {
  buildCalendarioGrid,
  CALENDARIO_MES,
  formatFechaLegible,
  getHistorialDias,
  getMesLabel,
  getResumenHoras,
  getTipoHoraMeta,
  HOY_MOCK,
  type RegistroEstado,
} from "@/src/lib/mi-tiempo-mock";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Altura fija del día en el calendario mensual */
const CAL_DIA_MIN_H = "min-h-[120px]";
const CAL_DIA_MAX_H = "max-h-[168px]";
const CAL_DIA_CELL = `${CAL_DIA_MIN_H} ${CAL_DIA_MAX_H} overflow-hidden`;

const ESTADOS_CAL_DESTACADOS = new Set<RegistroEstado>([
  "Aprobado",
  "Registrado",
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
      <div className={`text-[22px] font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}

type MiTiempoListaProps = {
  tab: "cal" | "hist";
  onTabChange: (tab: "cal" | "hist") => void;
  onSelectDia: (fecha: string, esHistorial: boolean) => void;
};

function CalendarioTab({
  onSelectDia,
}: Pick<MiTiempoListaProps, "onSelectDia">) {
  const { registros } = useMiTiempo();
  const resumen = getResumenHoras(registros);
  const celdas = buildCalendarioGrid(
    new Date(CALENDARIO_MES),
    registros,
    HOY_MOCK,
  );

  return (
    <div className="mt-1">
      <div className="mb-4 flex gap-4">
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

      <Card className="mb-4">
        <CardBody>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-lg font-extrabold tracking-tight text-navy">
              {getMesLabel(new Date(CALENDARIO_MES))}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="bg-[#f8fafc] px-2 py-2 text-center text-[11px] font-semibold text-muted"
              >
                {d}
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

              return (
                <button
                  key={celda.fechaStr}
                  type="button"
                  disabled={celda.bloqueado}
                  onClick={() => onSelectDia(celda.fechaStr, false)}
                  className={`relative flex ${CAL_DIA_CELL} flex-col items-start p-2.5 text-left transition-[filter] duration-100 ${celda.bloqueado ? "cursor-default opacity-70" : "cursor-pointer hover:brightness-[0.96]"}`}
                  style={{
                    background: celda.bg,
                    boxShadow: celda.esHoy
                      ? "inset 0 0 0 2px var(--navy)"
                      : undefined,
                  }}
                >
                  <div className="w-full shrink-0">
                    <div className="flex w-full items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`text-[13px] leading-none ${celda.esHoy ? "font-extrabold text-navy" : celda.esFestivo ? "font-semibold text-orange" : celda.esFinSemana ? "font-semibold text-[#60a5fa]" : "font-semibold text-[#374151]"}`}
                        >
                          {celda.dia}
                        </span>
                        {celda.resumen && (
                          <CalendarioEstadoDia estado={celda.resumen.estadoDia} />
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
                          {celda.resumen.total}h
                        </span>
                      )}
                    </div>

                    {celda.esFestivo && (
                      <span className="mt-1 text-[10px] font-semibold leading-none text-orange">
                        Festivo
                      </span>
                    )}
                  </div>

                  {celda.resumen && celda.resumen.lineas.length > 0 && (
                    <div className="mt-2 min-h-0 w-full flex-1 overflow-y-auto overscroll-contain">
                      <div className="flex flex-col gap-0.5">
                        {celda.resumen.lineas.map((l) => (
                          <div
                            key={l.tipo}
                            className="flex items-center justify-between gap-1 text-[10px] leading-tight"
                          >
                            <CalendarioLineaTipo tipo={l.tipo} />
                            <span className="shrink-0 font-semibold text-[#9ca3af]">
                              {l.horas}h
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
        </CardBody>
      </Card>
    </div>
  );
}

function HistorialTab() {
  const { registros } = useMiTiempo();
  const dias = getHistorialDias(registros);

  const columnas: { label: string; align: string }[] = [
    { label: "Proyecto", align: "text-left" },
    { label: "Actividad", align: "text-left" },
    { label: "Tipo", align: "text-left" },
    { label: "Horas", align: "text-center" },
    { label: "Coment. empleado", align: "text-left" },
    { label: "Coment. rechazo", align: "text-left" },
    { label: "Estado", align: "text-center" },
  ];

  return (
    <Card>
      <CardHeader
        right={
          <span className="text-[11px] font-normal text-muted">
            {dias.length} día{dias.length !== 1 ? "s" : ""} ·{" "}
            {dias.reduce((s, d) => s + d.registros.length, 0)} registros
          </span>
        }
      >
        <span className="flex flex-row items-center gap-1.5">
          <Icon name="history" size="sm" />
          <span>Historial</span>
        </span>
      </CardHeader>

      <div>
        {dias.length === 0 ? (
          <div className="px-6 py-8 text-center text-[13px] text-muted">
            Aún no hay registros aprobados o rechazados.
          </div>
        ) : (
          <DataTable colWidths={[...MI_TIEMPO_COLS]}>
            <thead>
              <tr>
                {columnas.map((col) => (
                  <th key={col.label} className={dataThWithAlign(col.align)}>
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
                        className="border-t-2 border-border px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <span className="text-[13px] font-semibold text-navy">
                            {formatFechaLegible(dia.fecha)}
                          </span>
                          <span className="text-[12px] text-muted">
                            {dia.registros.length} registro
                            {dia.registros.length !== 1 ? "s" : ""} – {dia.totalHoras} h
                          </span>
                        </div>
                      </td>
                    </tr>
                    {dia.registros.map((r) => (
                      <tr
                        key={r.id}
                        className="transition-colors duration-100 hover:bg-[#fafbfc]"
                      >
                        <td className={`${dataTd} font-medium ${dataTdTruncate}`}>
                          {r.proy}
                        </td>
                        <td className={`${dataTd} ${dataTdTruncate}`}>{r.act}</td>
                        <td className={dataTd}>
                          <TipoHoraPill tipo={r.tipo} />
                        </td>
                        <td className={dataTdNumeric}>{r.horas}h</td>
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
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </div>
    </Card>
  );
}

export function MiTiempoLista({
  tab,
  onTabChange,
  onSelectDia,
}: MiTiempoListaProps) {
  const { openRegistrarModal } = useMiTiempo();

  return (
    <div className="view-wide">
      <div className="mb-4 flex flex-col gap-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[#111]">Mi Tiempo</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <Button variant="primary" onClick={() => openRegistrarModal()}>
              <Icon name="plus" size="xs" />
              Registrar horas
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-[18px] flex border-b-2 border-[#e5e9f0]">
        <button
          type="button"
          onClick={() => onTabChange("cal")}
          className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all duration-150 ${
            tab === "cal"
              ? "border-b-navy bg-white font-bold text-navy"
              : "border-b-transparent font-medium text-muted hover:bg-[#f0f2f5] hover:text-navy"
          }`}
        >
          <Icon name="calendar" size="sm" />
          Calendario
        </button>
        <button
          type="button"
          onClick={() => onTabChange("hist")}
          className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all duration-150 ${
            tab === "hist"
              ? "border-b-navy bg-white font-bold text-navy"
              : "border-b-transparent font-medium text-muted hover:bg-[#f0f2f5] hover:text-navy"
          }`}
        >
          <Icon name="history" size="sm" />
          Historial
        </button>
      </div>

      {tab === "cal" ? (
        <CalendarioTab onSelectDia={onSelectDia} />
      ) : (
        <HistorialTab />
      )}
    </div>
  );
}
