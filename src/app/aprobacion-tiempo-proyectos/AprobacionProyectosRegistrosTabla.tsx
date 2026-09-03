"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/src/components/ui/Icon";
import { EstadoTiempoPill } from "@/src/components/ui/Pill";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { TableSelectionCheckbox } from "@/src/components/ui/TableSelectionCheckbox";
import {
  CHECKBOX_COL_WIDTH,
  DataTable,
  RES_TAB_SPACER_COL,
  dataTd,
  dataTdCheck,
  dataTdNumeric,
  dataTdResPrimary,
  dataTdResSecondary,
  dataTdTruncate,
  dataTh,
  dataThCheck,
  dataThWithAlign,
  TABLE_PAGE_SIZE,
} from "@/src/components/ui/DataTable";
import { TablePagination } from "@/src/components/ui/TablePagination";
import { getSelectionState } from "@/src/lib/use-table-selection";
import {
  horasNum,
  splitSubproy,
  type HojaAprobacion,
} from "@/src/lib/aprobacion-tiempo-mock";

const COLS_PEND = [
  CHECKBOX_COL_WIDTH,
  "92px",
  "18%",
  "148px",
  "68px",
  "16%",
  "16%",
  "22%",
] as const;

const COLS_RES = [
  RES_TAB_SPACER_COL,
  "92px",
  "16%",
  "140px",
  "64px",
  "14%",
  "14%",
  "110px",
  "20%",
] as const;

export function hojaRegistroId(h: HojaAprobacion): string {
  return h.registroId || h.no;
}

export function esHojaPendiente(h: HojaAprobacion): boolean {
  return !h.estadoApro;
}

export function esHojaResuelta(h: HojaAprobacion): boolean {
  return h.estadoApro === "Aprobado" || h.estadoApro === "Rechazado";
}

type AprobacionProyectosRegistrosTablaProps = {
  tab: "pend" | "res";
  registros: HojaAprobacion[];
  totalBase: number;
  hasFilters: boolean;
  loaded: boolean;
  seleccion: Set<string>;
  onToggle: (id: string) => void;
  onToggleLote: (ids: string[]) => void;
};

function renderSubproy(subproy: string) {
  const sp = splitSubproy(subproy);
  return (
    <>
      <div className={dataTdResPrimary}>{sp.code}</div>
      {sp.name ? (
        <div className={dataTdResSecondary} title={sp.name}>
          {sp.name}
        </div>
      ) : null}
    </>
  );
}

export function AprobacionProyectosRegistrosTabla({
  tab,
  registros,
  totalBase,
  hasFilters,
  loaded,
  seleccion,
  onToggle,
  onToggleLote,
}: AprobacionProyectosRegistrosTablaProps) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [registros, tab]);

  if (!loaded) {
    return (
      <div className="space-y-2 px-4 py-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-[#e5e9f0]" />
        ))}
      </div>
    );
  }

  if (!totalBase) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-muted">
        <Icon
          name={tab === "pend" ? "clock" : "check"}
          size="xl"
          className="mx-auto mb-2 opacity-30"
        />
        {tab === "pend"
          ? "Sin registros pendientes en este proyecto."
          : "Sin registros resueltos en este proyecto."}
      </div>
    );
  }

  if (!registros.length && hasFilters) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-muted">
        <Icon name="info" size="xl" className="mx-auto mb-2 opacity-30" />
        Sin resultados con esos filtros.
      </div>
    );
  }

  const ids = registros.map(hojaRegistroId);
  const { allSelected, someSelected } = getSelectionState(seleccion, ids);
  const pages = Math.max(1, Math.ceil(registros.length / TABLE_PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visibles = registros.slice(
    (safePage - 1) * TABLE_PAGE_SIZE,
    safePage * TABLE_PAGE_SIZE,
  );

  const pendHeaders: [string, string][] = [
    ["Fecha", "text-left"],
    ["Empleado", "text-left"],
    ["Tipo hora", "text-left"],
    ["Horas", "text-center"],
    ["Subproyecto", "text-left"],
    ["Actividad", "text-left"],
    ["Comentario", "text-left"],
  ];

  const resHeaders: [string, string][] = [
    ["Fecha", "text-left"],
    ["Empleado", "text-left"],
    ["Tipo hora", "text-left"],
    ["Horas", "text-center"],
    ["Subproyecto", "text-left"],
    ["Actividad", "text-left"],
    ["Estado", "text-left"],
    ["Motivo", "text-left"],
  ];

  return (
    <div>
      <div className="overflow-x-auto">
        <DataTable
          colWidths={[...(tab === "pend" ? COLS_PEND : COLS_RES)]}
          className="min-w-[1080px]"
        >
          <thead>
            <tr>
              {tab === "pend" ? (
                <th className={dataThCheck}>
                  <TableSelectionCheckbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={() => onToggleLote(ids)}
                    aria-label="Seleccionar todos los registros pendientes"
                  />
                </th>
              ) : (
                <th className={dataTh} />
              )}
              {(tab === "pend" ? pendHeaders : resHeaders).map(
                ([col, align]) => (
                  <th key={col} className={dataThWithAlign(align)}>
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {visibles.map((s) => {
              const id = hojaRegistroId(s);
              return (
                <tr key={id} className="transition-colors hover:bg-[#fafbfc]">
                  {tab === "pend" ? (
                    <td className={dataTdCheck}>
                      <TableSelectionCheckbox
                        checked={seleccion.has(id)}
                        onChange={() => onToggle(id)}
                        aria-label={`Seleccionar ${s.solicitante} · ${s.fecha}`}
                      />
                    </td>
                  ) : (
                    <td className={dataTd} />
                  )}
                  <td className={`${dataTd} text-muted ${dataTdTruncate}`}>
                    {s.fecha}
                  </td>
                  <td className={dataTd}>
                    <div className={`${dataTdResPrimary} ${dataTdTruncate}`}>
                      {s.solicitante}
                    </div>
                    <div className={dataTdResSecondary}>{s.cedula}</div>
                  </td>
                  <td className={dataTd}>
                    <TipoHoraPill tipo={s.tipo} />
                  </td>
                  <td className={dataTdNumeric}>{horasNum(s.horas)}</td>
                  <td className={dataTd}>{renderSubproy(s.subproy)}</td>
                  <td className={`${dataTd} text-[#374151] ${dataTdTruncate}`}>
                    {s.actividad}
                  </td>
                  {tab === "pend" ? (
                    <td
                      className={`${dataTd} text-muted ${dataTdTruncate}`}
                      title={s.comentarioEmpleado || undefined}
                    >
                      {s.comentarioEmpleado || "—"}
                    </td>
                  ) : (
                    <>
                      <td className={dataTd}>
                        <EstadoTiempoPill estado={s.estadoApro || ""} />
                        <div className={`${dataTdResSecondary} text-muted`}>
                          {s.fechaApro || "—"}
                        </div>
                      </td>
                      <td
                        className={`${dataTd} ${
                          s.estadoApro === "Rechazado"
                            ? "text-[#b91c1c]"
                            : "text-muted"
                        } ${dataTdTruncate}`}
                        title={s.comentarioApro}
                      >
                        {s.comentarioApro || "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </div>
      {registros.length > 0 ? (
        <TablePagination
          page={safePage}
          total={registros.length}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
