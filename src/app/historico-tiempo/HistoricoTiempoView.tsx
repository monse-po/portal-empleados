"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import {
  DataTable,
  dataTd,
  dataTdNumeric,
  dataTdResPrimary,
  dataTdResSecondary,
  dataTdTruncate,
  dataThWithAlign,
} from "@/src/components/ui/DataTable";
import { MiTiempoLoading } from "@/src/app/hoja-tiempo/MiTiempoLoading";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
import { HistoricoTiempoFilterBar } from "@/src/app/historico-tiempo/HistoricoTiempoFilterBar";
import { HISTORICO_UI_COPY } from "@/src/lib/copy/historico";
import { dateToIso } from "@/src/lib/date-picker-utils";
import {
  applyHistoricoFilters,
  type HistoricoFilterRule,
} from "@/src/lib/historico-tiempo-filtros";
import {
  formatHistoricoRango,
  getHistoricoResumenPorProyectoSub,
  getRegistrosHistoricoAprobados,
  HISTORICO_DUMMY_REGISTROS,
  nombresProyectoFromCatalog,
  openKeysFromCatalog,
} from "@/src/lib/historico-tiempo";
import { fetchTiempoCatalogAction } from "@/src/server/mi-tiempo-catalog-actions";

const HISTORICO_COLS = ["40%", "26%", "12%", "22%"] as const;

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
        <Icon name="folderOpen" size="xs" className="text-navy" />
        <span className="font-bold text-navy">{count}</span>
        línea{count !== 1 ? "s" : ""}
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
  const { registros, registrosLoaded, registrosError, registrosIfsWarning, registrosFromIfs, ifsConnected } =
    useMiTiempo();
  const [filters, setFilters] = useState<HistoricoFilterRule[]>([]);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [nombresPorProy, setNombresPorProy] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const hoy = dateToIso(new Date());
    if (!hoy) return;
    void fetchTiempoCatalogAction(hoy).then((result) => {
      if (!result.catalog) return;
      setOpenKeys(openKeysFromCatalog(result.catalog));
      setNombresPorProy(nombresProyectoFromCatalog(result.catalog));
    });
  }, []);

  const reales = useMemo(
    () => getRegistrosHistoricoAprobados(registros),
    [registros],
  );
  const usandoDummy =
    reales.length === 0 && !ifsConnected && !registrosFromIfs;
  const aprobados = usandoDummy ? HISTORICO_DUMMY_REGISTROS : reales;
  const filtrados = useMemo(
    () => applyHistoricoFilters(aprobados, filters),
    [aprobados, filters],
  );
  const filas = useMemo(
    () =>
      getHistoricoResumenPorProyectoSub(filtrados, {
        openKeys: usandoDummy ? undefined : openKeys,
        nombresPorProy,
      }),
    [filtrados, openKeys, nombresPorProy, usandoDummy],
  );
  const totalHoras = useMemo(
    () => filas.reduce((s, r) => s + r.totalHoras, 0),
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
        <h1 className="text-xl font-bold text-[#111]">Mi Histórico</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
          {HISTORICO_UI_COPY.subtitle}
        </p>
        {registrosIfsWarning ? (
          <p className="alert-warn mt-2 px-3 py-2 text-sm">{registrosIfsWarning}</p>
        ) : null}
        {usandoDummy && (
          <p className="mt-2 inline-flex rounded-md border border-[#fde68a] bg-[#fffbeb] px-2.5 py-1 text-[11px] font-medium text-[#92400e]">
            Datos de ejemplo — entra con IFS para ver tu hoja real
            (GetEmployeeTimesheet)
          </p>
        )}
        {ifsConnected && reales.length === 0 && !registrosIfsWarning && (
          <p className="mt-2 inline-flex rounded-md border border-[#c7d9ed] bg-[#eef3f9] px-2.5 py-1 text-[11px] font-medium text-navy">
            Hoja IFS conectada · aún no hay horas enviadas o aprobadas
          </p>
        )}
        {registrosFromIfs && reales.length > 0 && (
          <p className="mt-2 inline-flex rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1 text-[11px] font-medium text-[#15803d]">
            Datos de tu hoja IFS (GetEmployeeTimesheet)
          </p>
        )}
      </div>

      {aprobados.length > 0 && (
        <HistoricoTiempoFilterBar
          registros={aprobados}
          filters={filters}
          onChange={setFilters}
          shown={filas.length}
          total={getHistoricoResumenPorProyectoSub(aprobados, {
            openKeys: usandoDummy ? undefined : openKeys,
            nombresPorProy,
          }).length}
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
            <span>Proyectos y horas</span>
          </span>
        </CardHeader>

        <CardBody className="!p-0">
          {filas.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px] text-muted">
              {aprobados.length === 0 ? (
                <>
                  {ifsConnected
                    ? "Tu hoja IFS no tiene horas enviadas o aprobadas todavía."
                    : "Aún no hay horas reportadas en el histórico."}
                  <br />
                  <span className="mt-1 inline-block text-[12px]">
                    Aparecen aquí cuando envías registros (Lanzado) o cuando ya
                    están aprobados. Los borradores no entran.
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
                    ["Proyecto", "text-left"],
                    ["Subproyecto", "text-left"],
                    ["Horas", "text-center"],
                    ["Periodo", "text-left"],
                  ].map(([col, align]) => (
                    <th key={col} className={dataThWithAlign(align)}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr
                    key={`${r.proyId}::${r.subproy}`}
                    className="transition-colors hover:bg-[#fafbfc]"
                  >
                    <td className={dataTd}>
                      <div className="min-w-0">
                        <div className={dataTdResPrimary} title={r.nombre}>
                          {r.nombre}
                        </div>
                        <div className={dataTdResSecondary}>{r.codigo}</div>
                      </div>
                    </td>
                    <td className={`${dataTd} ${dataTdTruncate}`}>{r.subproy}</td>
                    <td className={dataTdNumeric}>
                      <span className="font-semibold text-navy">
                        {formatHorasTotal(r.totalHoras)}h
                      </span>
                    </td>
                    <td className={`${dataTd} text-muted`}>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="truncate">
                          {formatHistoricoRango(r.desde, r.hasta, r.abierto)}
                        </span>
                        {r.abierto && (
                          <span className="shrink-0 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[#15803d]">
                            Abierto
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
