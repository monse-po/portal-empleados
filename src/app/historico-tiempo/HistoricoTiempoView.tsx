"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
import { HistoricoTiempoFilterBar } from "@/src/app/historico-tiempo/HistoricoTiempoFilterBar";
import { HISTORICO_UI_COPY } from "@/src/lib/copy/historico";
import { getProyectoListaParts } from "@/src/lib/tiempo-bridge";
import type { RegistroMock } from "@/src/lib/tiempo-registro";
import {
  applyHistoricoFilters,
  type HistoricoFilterRule,
} from "@/src/lib/historico-tiempo-filtros";
import {
  formatHistoricoFechaCorta,
  formatHistoricoMesLabel,
  formatHistoricoVentanaLabel,
  getHistoricoMesKey,
} from "@/src/lib/historico-tiempo";
import { getHistoricoRegistrosAction } from "@/src/server/historico-tiempo-actions";

const HISTORICO_COLS = ["10%", "18%", "16%", "11%", "6%", "22%", "17%"] as const;

function formatHorasTotal(horas: number): string {
  return Number.isInteger(horas) ? String(horas) : horas.toFixed(1);
}

function HistoricoTimelineStats({
  count,
  horas,
}: {
  count: number;
  horas: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c7d9ed] bg-white px-2.5 py-1 text-[11px] font-medium text-muted">
        <Icon name="list" size="xs" className="text-navy" />
        <span className="font-bold text-navy">{count}</span>
        registro{count !== 1 ? "s" : ""}
      </span>
      <span aria-hidden className="h-4 w-px bg-[#d1d9e6]" />
      <span className="inline-flex items-baseline gap-0.5 rounded-full bg-[#eef3f9] px-3 py-1">
        <span className="text-[15px] font-bold leading-none text-navy">
          {formatHorasTotal(horas)}
        </span>
        <span className="text-[11px] font-semibold text-muted">h</span>
      </span>
    </div>
  );
}

export function HistoricoTiempoView() {
  const [aprobados, setAprobados] = useState<RegistroMock[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoricoFilterRule[]>([]);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await getHistoricoRegistrosAction();
      if (result.error && result.registros.length === 0) {
        setLoadError(result.error);
        setAprobados([]);
      } else {
        setAprobados(result.registros);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el histórico.",
      );
      setAprobados([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filas = useMemo(
    () => applyHistoricoFilters(aprobados, filters),
    [aprobados, filters],
  );
  const totalHoras = useMemo(
    () => filas.reduce((s, r) => s + r.horas, 0),
    [filas],
  );

  if (!loaded) {
    return (
      <div className="view-wide flex min-h-[240px] items-center justify-center text-[13px] text-muted">
        Consultando histórico en IFS…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="view-wide px-2 py-8 text-center text-[13px] text-muted">
        <p>{loadError}</p>
        <p className="mt-2 text-[12px]">Inicia sesión con tu correo @h-mv.com</p>
      </div>
    );
  }

  return (
    <div className="view-wide">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#111]">Mi Histórico</h1>
        <p className="mt-1 text-[13px] text-muted">
          {HISTORICO_UI_COPY.subtitle}
          <span className="mt-0.5 block text-[12px]">
            Desde {formatHistoricoVentanaLabel()} hasta hoy.
          </span>
        </p>
      </div>

      {aprobados.length > 0 && (
        <HistoricoTiempoFilterBar
          registros={aprobados}
          filters={filters}
          onChange={setFilters}
          shown={filas.length}
          total={aprobados.length}
        />
      )}

      <Card>
        <CardHeader
          right={
            filas.length > 0 ? (
              <HistoricoTimelineStats count={filas.length} horas={totalHoras} />
            ) : null
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
                  No hay horas confirmadas por tu gerente en los últimos 12 meses.
                  <br />
                  <span className="mt-1 inline-block text-[12px]">
                    Aquí entran solo registros <strong>aprobados</strong> (IFS{" "}
                    <strong>Confirmed</strong>). Los de Mi Tiempo en{" "}
                    <strong>Borrador</strong> o <strong>Registrado</strong> aún
                    no han sido confirmados.
                  </span>
                </>
              ) : (
                "Ningún registro coincide con los filtros."
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
