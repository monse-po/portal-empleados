"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import {
  DataTable,
  dataTd,
  dataTdNumeric,
  dataTdTruncate,
  dataThWithAlign,
} from "@/src/components/ui/DataTable";
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
  nombresProyectoFromCatalog,
  openKeysFromCatalog,
} from "@/src/lib/historico-tiempo";
import { downloadHistoricoPdf } from "@/src/lib/historico-pdf";
import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";
import type { RegistroMock } from "@/src/lib/mi-tiempo-mock";
import { fetchTiempoCatalogAction } from "@/src/server/mi-tiempo-catalog-actions";
import { getHistoricoRegistrosAction } from "@/src/server/historico-tiempo-actions";

/** Proyecto | Subproyecto | Actividad | Horas | Periodo | Estado */
const HISTORICO_COLS = ["26%", "16%", "18%", "8%", "18%", "14%"] as const;

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
  const [aprobados, setAprobados] = useState<RegistroMock[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [empNo, setEmpNo] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoricoFilterRule[]>([]);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [nombresPorProy, setNombresPorProy] = useState<Record<string, string>>(
    {},
  );

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await getHistoricoRegistrosAction();
      setEmpNo(result.empNo ?? null);
      if (result.error && result.registros.length === 0) {
        setLoadError(result.error);
        setAprobados([]);
      } else {
        setAprobados(result.registros as RegistroMock[]);
        if (result.error) setLoadError(result.error);
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

  useEffect(() => {
    const hoy = dateToIso(new Date());
    if (!hoy) return;
    void fetchTiempoCatalogAction(hoy).then((result) => {
      if (!result.catalog) return;
      setOpenKeys(openKeysFromCatalog(result.catalog));
      setNombresPorProy(nombresProyectoFromCatalog(result.catalog));
    });
  }, []);

  const filtrados = useMemo(
    () => applyHistoricoFilters(aprobados, filters) as RegistroMock[],
    [aprobados, filters],
  );
  const filas = useMemo(
    () =>
      getHistoricoResumenPorProyectoSub(filtrados, {
        openKeys,
        nombresPorProy,
      }),
    [filtrados, openKeys, nombresPorProy],
  );
  const totalHoras = useMemo(
    () => filas.reduce((s, r) => s + r.totalHoras, 0),
    [filas],
  );

  if (!loaded) {
    return (
      <div className="view-wide flex min-h-[240px] items-center justify-center text-[13px] text-muted">
        Consultando histórico en IFS…
      </div>
    );
  }

  if (loadError && aprobados.length === 0) {
    return (
      <div className="view-wide px-2 py-8 text-center text-[13px] text-muted">
        <p>{loadError}</p>
        <p className="mt-2 text-[12px]">Inicia sesión con tu correo @h-mv.com</p>
      </div>
    );
  }

  return (
    <div className="view-wide">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#111]">Mi Histórico</h1>
          {loadError ? (
            <p className="alert-warn mt-2 px-3 py-2 text-sm">{loadError}</p>
          ) : null}
        </div>
        {filas.length > 0 ? (
          <Button
            variant="secondary"
            className="shrink-0"
            onClick={() =>
              downloadHistoricoPdf(filas, {
                empleadoNombre: SESSION_EMPLEADO.nombre,
                empNo: empNo ?? undefined,
              })
            }
          >
            <Icon name="download" size="sm" />
            {HISTORICO_UI_COPY.downloadPdf}
          </Button>
        ) : null}
      </div>

      {aprobados.length > 0 && (
        <HistoricoTiempoFilterBar
          registros={aprobados}
          filters={filters}
          onChange={setFilters}
          shown={filas.length}
          total={getHistoricoResumenPorProyectoSub(aprobados, {
            openKeys,
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
                  Aún no hay horas reportadas en el histórico.
                  <br />
                  <span className="mt-1 inline-block text-[12px]">
                    Aparecen aquí cuando quedan Registrados en IFS o cuando ya
                    están aprobados.
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
                    ["Actividad", "text-left"],
                    ["Horas", "text-center"],
                    ["Periodo", "text-left"],
                    ["Estado", "text-left"],
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
                    key={`${r.proyId}::${r.subproy}::${r.actividad}`}
                    className="transition-colors hover:bg-[#fafbfc]"
                  >
                    <td className={dataTd}>
                      <div
                        className="flex min-w-0 items-baseline gap-2"
                        title={`${r.codigo} · ${r.nombre}`}
                      >
                        <span className="shrink-0 font-bold text-navy">
                          {r.codigo}
                        </span>
                        <span className={`${dataTdTruncate} text-[#374151]`}>
                          {r.nombre}
                        </span>
                      </div>
                    </td>
                    <td className={`${dataTd} ${dataTdTruncate}`}>{r.subproy}</td>
                    <td className={`${dataTd} ${dataTdTruncate}`}>{r.actividad}</td>
                    <td className={dataTdNumeric}>
                      <span className="font-semibold text-navy">
                        {formatHorasTotal(r.totalHoras)}
                      </span>
                    </td>
                    <td className={`${dataTd} ${dataTdTruncate} text-muted`}>
                      {formatHistoricoRango(r.desde, r.hasta, r.abierto)}
                    </td>
                    <td className={dataTd}>
                      <span
                        className={
                          r.abierto
                            ? "font-semibold text-[#15803d]"
                            : "font-medium text-muted"
                        }
                      >
                        {r.abierto ? "Abierto" : "Cerrado"}
                      </span>
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
