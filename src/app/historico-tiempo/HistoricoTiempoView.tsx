"use client";

import { Fragment, useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import {
  DataTable,
  dataTd,
  dataTdClamp,
  dataTdNumeric,
  dataTdResPrimary,
  dataTdResSecondary,
  dataTdTruncate,
  dataThWithAlign,
} from "@/src/components/ui/DataTable";
import { MiTiempoLoading } from "@/src/app/hoja-tiempo/MiTiempoLoading";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
import { getProyectoListaParts } from "@/src/lib/tiempo-bridge";
import {
  formatHistoricoFechaCorta,
  formatHistoricoMesLabel,
  formatHistoricoRango,
  getHistoricoMesKey,
  getHistoricoResumenPorProyecto,
  getRegistrosHistoricoAprobados,
} from "@/src/lib/historico-tiempo";

const HISTORICO_COLS = ["10%", "18%", "16%", "11%", "6%", "22%", "17%"] as const;

function ResumenChip({
  active,
  title,
  label,
  sub,
  onClick,
}: {
  active: boolean;
  title: string;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex max-w-full flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
        active
          ? "border-[#c7d9ed] bg-[#eef3f9] ring-1 ring-[#bfdbfe]"
          : "border-border bg-white hover:border-[#d1d5db] hover:bg-[#f8fafc]"
      }`}
    >
      <span
        className={`truncate text-[12px] font-semibold ${active ? "text-navy" : "text-[#111]"}`}
      >
        {label}
      </span>
      <span className="text-[11px] text-muted">{sub}</span>
    </button>
  );
}

export function HistoricoTiempoView() {
  const { registros, registrosLoaded, registrosError } = useMiTiempo();
  const [proyFiltro, setProyFiltro] = useState<string | null>(null);

  const aprobados = useMemo(
    () => getRegistrosHistoricoAprobados(registros),
    [registros],
  );
  const resumenProyectos = useMemo(
    () => getHistoricoResumenPorProyecto(aprobados),
    [aprobados],
  );
  const filas = useMemo(
    () =>
      proyFiltro
        ? aprobados.filter((r) => r.proy === proyFiltro)
        : aprobados,
    [aprobados, proyFiltro],
  );
  const totalHoras = useMemo(
    () => filas.reduce((s, r) => s + r.horas, 0),
    [filas],
  );

  if (!registrosLoaded) {
    return <MiTiempoLoading />;
  }

  if (registrosError) {
    return (
      <div className="view-wide px-2 py-8 text-center text-[13px] text-muted">
        {registrosError}
      </div>
    );
  }

  return (
    <div className="view-wide">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#111]">Histórico de tiempo</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-snug text-muted">
          Horas <strong className="font-semibold text-[#374151]">aprobadas</strong>{" "}
          por proyecto. Solo consulta — útil para tu hoja de vida y evidencia de
          dedicación real a cada proyecto.
        </p>
      </div>

      {aprobados.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <ResumenChip
            active={proyFiltro === null}
            title="Ver todos los proyectos"
            label="Todos los proyectos"
            sub={`${aprobados.length} registro${aprobados.length !== 1 ? "s" : ""} · ${aprobados.reduce((s, r) => s + r.horas, 0)} h`}
            onClick={() => setProyFiltro(null)}
          />
          {resumenProyectos.map((p) => (
            <ResumenChip
              key={p.proyId}
              active={proyFiltro === p.proyId}
              title={p.nombre}
              label={p.codigo}
              sub={`${p.totalHoras} h · ${formatHistoricoRango(p.desde, p.hasta)}`}
              onClick={() =>
                setProyFiltro((prev) => (prev === p.proyId ? null : p.proyId))
              }
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader
          right={
            <span className="text-[11px] font-normal text-muted">
              {filas.length} registro{filas.length !== 1 ? "s" : ""} · {totalHoras} h
            </span>
          }
        >
          <span className="flex flex-row items-center gap-1.5">
            <Icon name="history" size="sm" />
            <span>Línea de tiempo</span>
          </span>
        </CardHeader>

        <CardBody className="!p-0">
          {filas.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px] text-muted">
              {aprobados.length === 0 ? (
                <>
                  Aún no hay horas aprobadas en el histórico.
                  <br />
                  <span className="mt-1 inline-block text-[12px]">
                    Los registros aparecerán aquí cuando el gerente los apruebe.
                  </span>
                </>
              ) : (
                "No hay registros para este proyecto."
              )}
            </div>
          ) : (
            <DataTable colWidths={[...HISTORICO_COLS]}>
              <thead>
                <tr>
                  {[
                    ["Fecha", "text-left"],
                    ["Proyecto", "text-left"],
                    ["Actividad", "text-left"],
                    ["Tipo", "text-left"],
                    ["Horas", "text-center"],
                    ["Comentario", "text-left"],
                    ["Subproyecto", "text-left"],
                  ].map(([col, align]) => (
                    <th key={col} className={dataThWithAlign(align)}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((r, index) => {
                  const mesKey = getHistoricoMesKey(r.fecha);
                  const mostrarMes =
                    index === 0 ||
                    mesKey !== getHistoricoMesKey(filas[index - 1].fecha);
                  const proy = getProyectoListaParts(r.proy);

                  return (
                    <Fragment key={r.id}>
                      {mostrarMes && (
                        <tr style={{ background: "#f8fafc" }}>
                          <td
                            colSpan={7}
                            className="border-t-2 border-border px-3 py-2 text-[12px] font-semibold text-navy"
                          >
                            {formatHistoricoMesLabel(mesKey)}
                          </td>
                        </tr>
                      )}
                      <tr className="transition-colors hover:bg-[#fafbfc]">
                        <td className={`${dataTd} text-muted ${dataTdTruncate}`}>
                          {formatHistoricoFechaCorta(r.fecha)}
                        </td>
                        <td className={dataTd}>
                          <div className="min-w-0">
                            <div className={dataTdResPrimary}>{proy.codigo}</div>
                            <div className={dataTdResSecondary} title={proy.nombreFull}>
                              {proy.nombre}
                            </div>
                          </div>
                        </td>
                        <td className={`${dataTd} ${dataTdTruncate}`}>{r.act}</td>
                        <td className={dataTd}>
                          <TipoHoraPill tipo={r.tipo} />
                        </td>
                        <td className={dataTdNumeric}>{r.horas}h</td>
                        <td className={`${dataTd} text-[#374151]`}>
                          <div className={dataTdClamp}>{r.comentario || "—"}</div>
                        </td>
                        <td className={`${dataTd} text-muted ${dataTdTruncate}`}>
                          {r.subproy || "—"}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </DataTable>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
