"use client";

import { useState } from "react";
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
  getRegistrosDia,
  type RegistroMock,
} from "@/src/lib/mi-tiempo-mock";
import { formatProyectoEmpleado } from "@/src/lib/tiempo-bridge";

type MiTiempoDiaProps = {
  fecha: string;
  esHistorial?: boolean;
  onVolver: () => void;
};

function getContadorStyle(normales: number) {
  if (normales > 8.5) {
    return {
      border: "1.5px solid #fca5a5",
      background: "#fff5f5",
      totalColor: "#b91c1c",
      normColor: "#b91c1c",
    };
  }
  if (normales === 8.5) {
    return {
      border: "1.5px solid #86efac",
      background: "#f0fdf4",
      totalColor: "#15803d",
      normColor: "#15803d",
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
}: MiTiempoDiaProps) {
  const { registros, openRegistrarModal, deleteRegistro, enviarDia } =
    useMiTiempo();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
  const contador = getContadorStyle(normales);
  const hayBorradores = diaRegs.some((r) => r.estado === "Registrado");
  const fechaLabel = formatFechaLegible(fecha);

  return (
    <div className="view-wide">
      <PortalSubpageHeader
        parentLabel="Mi Tiempo"
        onVolver={onVolver}
        title={fechaLabel}
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
                {normales}h normales · máx 8.5h
              </span>
            </div>
            {!esHistorial && (
              <Button
                variant="primary"
                onClick={() => openRegistrarModal({ fecha })}
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
          <span>Registros del día</span>
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
                  r.estado === "Registrado" || r.estado === "Rechazado";
                const puedeEliminar = r.estado === "Registrado";
                return (
                  <tr
                    key={r.id}
                    onClick={
                      esEditable && !esHistorial
                        ? () => openRegistrarModal({ editId: r.id, fecha })
                        : undefined
                    }
                    className={`transition-colors duration-100 hover:bg-[#fafbfc] ${esEditable && !esHistorial ? "cursor-pointer" : ""}`}
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
                          loading={deletingId === r.id}
                          disabled={!!deletingId || enviando}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setDeletingId(r.id);
                            try {
                              await deleteRegistro(r.id);
                              toast("Registro eliminado", "navy");
                            } catch {
                              toast(
                                "No se pudo eliminar el registro. Intenta de nuevo.",
                                "danger",
                              );
                            } finally {
                              setDeletingId(null);
                            }
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
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border bg-white px-5 py-3">
          <span className="text-xs text-muted">
            Solo se envían los registros en borrador. Puedes seguir agregando
            otros al día; los enviados quedan bloqueados hasta la respuesta del
            aprobador.
          </span>
          <div className="flex items-center gap-2.5">
            <Button variant="tertiary" onClick={onVolver}>
              <Icon name="arrowLeft" size="sm" />
              Volver
            </Button>
            <Button
              variant="success"
              disabled={normales > 8.5 || enviando || !!deletingId}
              loading={enviando}
              loadingLabel="Enviando…"
              title={
                normales > 8.5
                  ? "Corrige las horas normales antes de enviar"
                  : undefined
              }
              onClick={() => void runEnviar()}
            >
              Enviar a Aprobación
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
