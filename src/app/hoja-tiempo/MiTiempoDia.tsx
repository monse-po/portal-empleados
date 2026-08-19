"use client";

import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardHeader } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
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
  MI_TIEMPO_DIA_COLS,
} from "@/src/components/ui/DataTable";
import { useToast } from "@/src/components/ui/Toast";
import { useAsyncAction } from "@/src/lib/use-async-action";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
import {
  formatFechaLegible,
  getHorasNormales,
  getMesActualBounds,
  getRegistrosDia,
  shiftFechaMes,
  type RegistroMock,
} from "@/src/lib/mi-tiempo-mock";
import { formatProyectoEmpleado } from "@/src/lib/tiempo-bridge";
import { fetchScheduleHoursAction } from "@/src/server/mi-tiempo-catalog-actions";
import { EliminarRegistroModal } from "@/src/app/hoja-tiempo/EliminarRegistroModal";
import { TiempoRegistroMobileCard } from "@/src/app/hoja-tiempo/TiempoRegistroMobileCard";
import {
  getJornadaLimiteFromSistema,
  scheduleSourceLabel as formatScheduleSource,
} from "@/src/lib/tiempo-config";
import {
  hayBorradoresEnviables,
  isRegistroEditable,
  isRegistroEliminable,
} from "@/src/lib/tiempo-registro-rules";
import {
  atNormalLimit,
  exceedsNormalLimit,
  formatScheduleHoursLabel,
  getDiaSinJornadaKind,
  isDiaConJornadaNormal,
  type DiaCalendarioKind,
} from "@/src/lib/tiempo-schedule";
import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";

type MiTiempoDiaProps = {
  fecha: string;
  esHistorial?: boolean;
  onVolver: () => void;
  onCambiarDia?: (fecha: string) => void;
};

function getContadorStyle(normales: number, maxNormales: number) {
  if (exceedsNormalLimit(normales, maxNormales)) {
    return {
      border: "1.5px solid #fca5a5",
      background: "#fff5f5",
      totalColor: "#b91c1c",
      normColor: "#b91c1c",
    };
  }
  if (atNormalLimit(normales, maxNormales)) {
    return {
      border: "1.5px solid var(--green-border)",
      background: "var(--green-bg)",
      totalColor: "var(--green)",
      normColor: "var(--green)",
    };
  }
  return {
    border: "1.5px solid var(--border)",
    background: "white",
    totalColor: "var(--navy)",
    normColor: "var(--muted)",
  };
}

export function MiTiempoDia({
  fecha,
  esHistorial = false,
  onVolver,
  onCambiarDia,
}: MiTiempoDiaProps) {
  const { registros, openRegistrarModal, deleteRegistro, enviarDia } =
    useMiTiempo();
  const { toast } = useToast();
  const [registroAEliminar, setRegistroAEliminar] = useState<RegistroMock | null>(
    null,
  );
  const [maxScheduleHours, setMaxScheduleHours] = useState(
    () => getJornadaLimiteFromSistema().maxNormalHours,
  );
  const [jornadaSourceLabel, setJornadaSourceLabel] = useState("config.");
  const [hoursByDate, setHoursByDate] = useState<Record<string, number> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    void fetchScheduleHoursAction(fecha).then((result) => {
      if (cancelled) return;
      setMaxScheduleHours(result.scheduleHours);
      setJornadaSourceLabel(formatScheduleSource(result.source));
      // Solo confiar en mapa IFS; con "sistema" usar festivo/fin del calendario.
      setHoursByDate(
        result.source === "ifs" ? { [fecha]: result.scheduleHours } : null,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [fecha]);
  const { loading: enviando, run: runEnviar } = useAsyncAction(async () => {
    try {
      const result = await enviarDia(fecha);
      if (result.error) {
        toast(result.error, "danger");
        return;
      }
      if (!result.enviados.length) {
        toast(
          "No hay borradores locales para enviar. Guarda un registro nuevo (Borrador) y luego envía.",
          "warn",
        );
        return;
      }
      if (result.warning) {
        toast(result.warning, "warn");
        return;
      }
      toast(
        result.sentToIfs
          ? result.inApprovalQueue
            ? "Enviado a IFS · Ya está en tu bandeja de aprobación"
            : "Registros enviados a aprobación (IFS)"
          : "Registros enviados a aprobación",
        "green",
      );
    } catch (err) {
      toast(
        err instanceof Error
          ? err.message
          : "No se pudo enviar a aprobación. Intenta de nuevo.",
        "danger",
      );
    }
  });
  const diaRegsAll = getRegistrosDia(registros, fecha);
  const diaRegs = esHistorial
    ? diaRegsAll.filter(
        (r) => r.estado === "Aprobado" || r.estado === "Rechazado",
      )
    : diaRegsAll;
  const totalHoras = diaRegs.reduce((s, r) => s + r.horas, 0);
  const normales = getHorasNormales(registros, fecha);
  const contador = getContadorStyle(normales, maxScheduleHours);
  const sobreTope = exceedsNormalLimit(normales, maxScheduleHours);
  const hayBorradores = hayBorradoresEnviables(diaRegsAll);
  const hayFilasEditables =
    !esHistorial &&
    diaRegs.some((r) => isRegistroEditable(r.estado));
  const fechaLabel = formatFechaLegible(fecha);
  const mesBounds = getMesActualBounds();
  const fechaAnterior = shiftFechaMes(fecha, -1, mesBounds);
  const fechaSiguiente = shiftFechaMes(fecha, 1, mesBounds);
  const calendarKind = getDiaSinJornadaKind(fecha);
  const diaKind: DiaCalendarioKind | null =
    calendarKind === "festivo" || calendarKind === "fin_semana"
      ? calendarKind
      : !isDiaConJornadaNormal(fecha, hoursByDate)
        ? "sin_jornada"
        : null;

  return (
    <div className="view-wide">
      <PortalSubpageHeader
        parentLabel="Mi Tiempo"
        onVolver={onVolver}
        title={fechaLabel}
        titleAddon={
          diaKind === "festivo" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#fed7aa] bg-[#fff7ed] px-2.5 py-1 text-[11px] font-semibold text-[#c2410c]">
              <Icon name="star" size="xs" className="text-[#f59e0b]" />
              Festivo
            </span>
          ) : diaKind === "fin_semana" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-2.5 py-1 text-[11px] font-semibold text-[#2563eb]">
              <Icon name="moon" size="xs" />
              Fin de semana
            </span>
          ) : null
        }
        onDiaAnterior={
          !esHistorial && onCambiarDia
            ? () => {
                if (fechaAnterior) onCambiarDia(fechaAnterior);
              }
            : undefined
        }
        onDiaSiguiente={
          !esHistorial && onCambiarDia
            ? () => {
                if (fechaSiguiente) onCambiarDia(fechaSiguiente);
              }
            : undefined
        }
        puedeDiaAnterior={!!fechaAnterior}
        puedeDiaSiguiente={!!fechaSiguiente}
        trailing={
          <>
            <div className="hidden items-center gap-2.5 md:flex">
              <div
                className="flex h-[38px] items-center gap-2 rounded-lg px-4 text-xs"
                style={{
                  border: contador.border,
                  background: contador.background,
                }}
              >
                <Icon name="clock" size="sm" className="text-muted" />
                <span
                  className="font-bold"
                  style={{ color: contador.totalColor }}
                >
                  {totalHoras}h
                </span>
                <span className="text-border">·</span>
                <span style={{ color: contador.normColor }}>
                  {normales}h normales · máx{" "}
                  {formatScheduleHoursLabel(maxScheduleHours)} ({jornadaSourceLabel})
                </span>
              </div>
              {!esHistorial && (
                <Button
                  variant="primary"
                  onClick={() => openRegistrarModal({ fecha, origen: "dia" })}
                >
                  <Icon name="plus" size="xs" />
                  Agregar registro
                </Button>
              )}
            </div>
            <div className="flex w-full flex-col gap-2 md:hidden">
              <div
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-xs"
                style={{
                  border: contador.border,
                  background: contador.background,
                }}
              >
                <Icon name="clock" size="sm" className="text-muted" />
                <span
                  className="font-bold"
                  style={{ color: contador.totalColor }}
                >
                  {totalHoras}h
                </span>
                <span className="text-border">·</span>
                <span style={{ color: contador.normColor }}>
                  {normales}h / {formatScheduleHoursLabel(maxScheduleHours)}
                </span>
              </div>
              {!esHistorial && (
                <Button
                  variant="primary"
                  className="min-h-12 w-full justify-center text-[15px]"
                  onClick={() => openRegistrarModal({ fecha, origen: "dia" })}
                >
                  <Icon name="plus" size="xs" />
                  Agregar registro
                </Button>
              )}
            </div>
          </>
        }
      />

      <Card>
        <CardHeader
          right={
            <span className="text-[11px] font-normal text-muted">
              {diaRegs.length} registro{diaRegs.length !== 1 ? "s" : ""}
            </span>
          }
        >
          <div className="hidden md:block">
            <span>Registros del día</span>
            {hayFilasEditables && (
              <span className="text-[11px] font-normal text-muted">
                {TIEMPO_UI_COPY.filaEditableHint}
              </span>
            )}
          </div>
          <span className="md:hidden">Registros</span>
        </CardHeader>

        {diaRegs.length === 0 ? (
          <div className="px-6 py-10 text-center text-[#9ca3af]">
            <Icon name="clock" size="sm" className="mx-auto text-muted" />
            <p className="mt-2 text-[13px]">
              Sin registros para este día — usa{" "}
              <strong>Agregar registro</strong> para empezar
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 px-3 pb-3 md:hidden">
              {diaRegs.map((r: RegistroMock) => (
                <TiempoRegistroMobileCard
                  key={r.id}
                  registro={r}
                  onOpen={
                    isRegistroEditable(r.estado) && !esHistorial
                      ? () =>
                          openRegistrarModal({
                            editId: r.id,
                            fecha,
                            origen: "dia",
                          })
                      : undefined
                  }
                  onDelete={
                    isRegistroEliminable(r.estado) && !esHistorial
                      ? () => setRegistroAEliminar(r)
                      : undefined
                  }
                  deleteDisabled={!!registroAEliminar || enviando}
                />
              ))}
            </div>
            <div className="hidden md:block">
            <DataTable colWidths={[...MI_TIEMPO_DIA_COLS]}>
            <thead>
              <tr>
                {[
                  ["Proyecto", "text-left"],
                  ["Actividad", "text-left"],
                  ["Tipo", "text-left"],
                  ["Horas", "text-center"],
                  ["Coment. empleado", "text-left"],
                  ["Coment. rechazo", "text-left"],
                  ["Estado", "text-center"],
                  ["", "text-center"],
                ].map(([col, align]) => (
                  <th key={col || "actions"} className={dataThWithAlign(align)}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diaRegs.map((r: RegistroMock) => {
                const esEditable = isRegistroEditable(r.estado);
                const puedeEliminar = isRegistroEliminable(r.estado);
                return (
                  <tr
                    key={r.id}
                    onClick={
                      esEditable && !esHistorial
                        ? () => openRegistrarModal({ editId: r.id, fecha, origen: "dia" })
                        : undefined
                    }
                    className={`transition-colors duration-100 ${esEditable && !esHistorial ? "cursor-pointer hover:bg-[#eef3f9] active:bg-[#dbeafe]" : "hover:bg-[#fafbfc]"}`}
                  >
                    <td className={`${dataTd} font-medium ${dataTdTruncate}`}>
                      {formatProyectoEmpleado(r.proy)}
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
                    <td className={`${dataTd} text-center`}>
                      {puedeEliminar && !esHistorial && (
                        <Button
                          variant="danger"
                          className="!px-2 !py-1 text-[11px]"
                          title="Eliminar"
                          disabled={!!registroAEliminar || enviando}
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
            </tbody>
          </DataTable>
            </div>
          </>
        )}
      </Card>

      {!esHistorial && hayBorradores && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-border bg-green-bg px-4 py-3.5 max-md:flex-col max-md:items-stretch">
          <p className="min-w-0 text-[13px] leading-snug text-green-text">
            {TIEMPO_UI_COPY.diaBorradoresPendientes}
          </p>
          <Button
            variant="success"
            className="!shrink-0 max-md:w-full max-md:justify-center"
            disabled={sobreTope || enviando || !!registroAEliminar}
            loading={enviando}
            loadingLabel="Enviando…"
            title={
              sobreTope
                ? "Corrige las horas normales antes de enviar"
                : undefined
            }
            onClick={() => void runEnviar()}
          >
            <Icon name="send" size="xs" />
            Enviar a Aprobación
          </Button>
        </div>
      )}
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
    </div>
  );
}
