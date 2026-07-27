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
import { isIfsRegistroId } from "@/src/lib/ifs/tiempo-timesheet";
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
import {
  getJornadaLimiteFromSistema,
  scheduleSourceLabel as formatScheduleSource,
} from "@/src/lib/tiempo-config";
import {
  hayRegistrosBorrador,
  isRegistroEditable,
  isRegistroEliminable,
} from "@/src/lib/tiempo-registro-rules";
import {
  atNormalLimit,
  exceedsNormalLimit,
  formatScheduleHoursLabel,
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

  useEffect(() => {
    let cancelled = false;

    void fetchScheduleHoursAction(fecha).then((result) => {
      if (cancelled) return;
      setMaxScheduleHours(result.scheduleHours);
      setJornadaSourceLabel(formatScheduleSource(result.source));
    });

    return () => {
      cancelled = true;
    };
  }, [fecha]);
  const { loading: enviando, run: runEnviar } = useAsyncAction(async () => {
    try {
      const enviados = await enviarDia(fecha);
      if (!enviados.length) {
        toast("No hay borradores para enviar", "warn");
        return;
      }
      toast("Registros enviados a aprobación", "green");
    } catch {
      toast("No se pudo enviar a aprobación. Intenta de nuevo.", "danger");
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
  const hayBorradores = hayRegistrosBorrador(diaRegsAll);
  const hayFilasEditables =
    !esHistorial &&
    diaRegs.some(
      (r) => !isIfsRegistroId(r.id) && isRegistroEditable(r.estado),
    );
  const fechaLabel = formatFechaLegible(fecha);
  const mesBounds = getMesActualBounds();
  const fechaAnterior = shiftFechaMes(fecha, -1, mesBounds);
  const fechaSiguiente = shiftFechaMes(fecha, 1, mesBounds);

  return (
    <div className="view-wide">
      <PortalSubpageHeader
        parentLabel="Mi Tiempo"
        onVolver={onVolver}
        title={fechaLabel}
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
          <div className="flex items-center gap-2.5">
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
          <div className="flex flex-col gap-0.5">
            <span>Registros del día</span>
            {hayFilasEditables && (
              <span className="text-[11px] font-normal text-muted">
                {TIEMPO_UI_COPY.filaEditableHint}
              </span>
            )}
          </div>
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
            {/* Perfil B (display): sin ColFiltros ni paginación — ver .cursor/rules/10-tables-filters.mdc */}
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
                const esEditable =
                  !isIfsRegistroId(r.id) && isRegistroEditable(r.estado);
                const puedeEliminar =
                  !isIfsRegistroId(r.id) && isRegistroEliminable(r.estado);
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
          </>
        )}
      </Card>

      {!esHistorial && hayBorradores && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-border bg-green-bg px-4 py-3.5">
          <p className="min-w-0 text-[13px] leading-snug text-green-text">
            {TIEMPO_UI_COPY.diaBorradoresPendientes}
          </p>
          <Button
            variant="success"
            className="!shrink-0"
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
          } catch {
            toast(
              "No se pudo eliminar el registro. Intenta de nuevo.",
              "danger",
            );
          }
        }}
      />
    </div>
  );
}
