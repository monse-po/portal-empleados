"use client";

import { useState } from "react";
import { useAprobacionLegalizaciones } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesContext";
import { Icon } from "@/src/components/ui/Icon";
import { EstadoLegalizacionPill } from "@/src/components/ui/Pill";
import { TipoLegalizacionPill } from "@/src/components/ui/TipoLegalizacionPill";
import { TableAproIconButton } from "@/src/components/ui/TableAproIconButton";
import { TableSelectionCheckbox } from "@/src/components/ui/TableSelectionCheckbox";
import {
  APRO_LEG_COLS_RES,
  DataTable,
  dataTd,
  dataTdAction,
  dataTdCheck,
  dataTdResSecondary,
  dataTdTruncate,
  dataTh,
  dataThAction,
  dataThCheck,
  dataThWithAlign,
  TableActionWrap,
  TABLE_PAGE_SIZE,
} from "@/src/components/ui/DataTable";
import { TablePagination } from "@/src/components/ui/TablePagination";
import { getSelectionState } from "@/src/lib/use-table-selection";
import {
  APRO_LEG_COLS_PEND,
  type LegalizacionApro,
} from "@/src/lib/aprobacion-legalizaciones-mock";
import { formatMontoLegal } from "@/src/lib/legalizaciones-mock";

type AprobacionLegalizacionesTablaProps = {
  registros: LegalizacionApro[];
  totalBase: number;
  hasFilters: boolean;
  onOpenDetalle: (no: string) => void;
  onAprobar: (nos: string[]) => void;
  onRechazar: (nos: string[]) => void;
};

export function AprobacionLegalizacionesTabla({
  registros,
  totalBase,
  hasFilters,
  onOpenDetalle,
  onAprobar,
  onRechazar,
}: AprobacionLegalizacionesTablaProps) {
  const { tab, seleccion, toggleSeleccion, toggleSeleccionLote } =
    useAprobacionLegalizaciones();
  const esPendientes = tab === "pend";
  const [page, setPage] = useState(1);

  if (!totalBase) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-muted">
        <Icon name="folderOpen" size="xl" className="mx-auto mb-2 opacity-30" />
        {esPendientes
          ? "Sin solicitudes pendientes."
          : "Sin solicitudes resueltas."}
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

  const total = registros.length;
  const safePage = Math.min(
    page,
    Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE)),
  );
  const start = (safePage - 1) * TABLE_PAGE_SIZE;
  const visibles = registros.slice(start, start + TABLE_PAGE_SIZE);
  const idsFiltrados = registros.map((r) => r.no);
  const { allSelected, someSelected } = getSelectionState(
    seleccion,
    idsFiltrados,
  );

  const renderRowPend = (s: LegalizacionApro) => (
    <tr
      key={s.no}
      onClick={() => onOpenDetalle(s.no)}
      className="cursor-pointer transition-colors hover:bg-[#fafbfc]"
    >
      <td className={dataTdCheck} onClick={(e) => e.stopPropagation()}>
        <TableSelectionCheckbox
          checked={seleccion.has(s.no)}
          onChange={() => toggleSeleccion(s.no)}
          aria-label={`Seleccionar ${s.no}`}
        />
      </td>
      <td className={`${dataTd} font-semibold text-navy ${dataTdTruncate}`}>
        {s.no}
      </td>
      <td className={`${dataTd} text-muted ${dataTdTruncate}`}>{s.fecha}</td>
      <td className={`${dataTd} font-medium ${dataTdTruncate}`}>
        {s.solicitante}
      </td>
      <td className={dataTd}>
        <TipoLegalizacionPill tipo={s.tipo} />
      </td>
      <td
        className={`${dataTd} text-[#374151] ${dataTdTruncate}`}
        title={s.concepto}
      >
        {s.concepto}
      </td>
      <td
        className={`${dataTd} text-[#374151] ${dataTdTruncate}`}
        title={s.motivo}
      >
        {s.motivo}
      </td>
      <td className={`${dataTd} text-right`}>
        <div className="font-semibold leading-snug">
          {formatMontoLegal(s.monto, s.div)}
        </div>
        <div className={dataTdResSecondary}>{s.div}</div>
      </td>
      <td className={dataTdAction} onClick={(e) => e.stopPropagation()}>
        <TableActionWrap>
          <TableAproIconButton
            variant="ok"
            title="Aprobar"
            onClick={(e) => {
              e.stopPropagation();
              onAprobar([s.no]);
            }}
          />
          <TableAproIconButton
            variant="no"
            title="Rechazar"
            onClick={(e) => {
              e.stopPropagation();
              onRechazar([s.no]);
            }}
          />
        </TableActionWrap>
      </td>
    </tr>
  );

  const renderRowRes = (s: LegalizacionApro) => (
    <tr
      key={s.no}
      onClick={() => onOpenDetalle(s.no)}
      className="cursor-pointer transition-colors hover:bg-[#fafbfc]"
    >
      <td className={dataTd} />
      <td className={`${dataTd} font-semibold text-navy ${dataTdTruncate}`}>
        {s.no}
      </td>
      <td className={`${dataTd} text-muted ${dataTdTruncate}`}>{s.fecha}</td>
      <td className={`${dataTd} font-medium ${dataTdTruncate}`}>
        {s.solicitante}
      </td>
      <td className={dataTd}>
        <TipoLegalizacionPill tipo={s.tipo} />
      </td>
      <td
        className={`${dataTd} text-[#374151] ${dataTdTruncate}`}
        title={s.concepto}
      >
        {s.concepto}
      </td>
      <td className={`${dataTd} text-right`}>
        <div className="font-semibold leading-snug">
          {formatMontoLegal(s.monto, s.div)}
        </div>
        <div className={dataTdResSecondary}>{s.div}</div>
      </td>
      <td className={dataTd}>
        <EstadoLegalizacionPill estado={s.estadoApro} />
        <div className={`${dataTdResSecondary} text-muted`}>
          {s.fechaApro || "—"}
        </div>
      </td>
      <td
        className={`${dataTd} ${s.estadoApro === "Rechazado" ? "text-[#b91c1c]" : "text-muted"} ${dataTdTruncate}`}
        title={s.comentarioApro}
      >
        {s.comentarioApro || "—"}
      </td>
    </tr>
  );

  const pendHeaderCols: [string, string][] = [
    ["Código", "text-left"],
    ["Solicitado", "text-left"],
    ["Empleado", "text-left"],
    ["Tipo", "text-left"],
    ["Concepto", "text-left"],
    ["Motivo", "text-left"],
    ["Monto", "text-right"],
  ];

  const resHeaderCols: [string, string][] = [
    ["Código", "text-left"],
    ["Solicitado", "text-left"],
    ["Empleado", "text-left"],
    ["Tipo", "text-left"],
    ["Concepto", "text-left"],
    ["Monto", "text-right"],
    ["Estado", "text-left"],
    ["Motivo", "text-left"],
  ];

  return (
    <div>
      <DataTable
        colWidths={[...(esPendientes ? APRO_LEG_COLS_PEND : APRO_LEG_COLS_RES)]}
      >
        <thead>
          <tr>
            {esPendientes ? (
              <>
                <th className={dataThCheck}>
                  <TableSelectionCheckbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={() => toggleSeleccionLote(idsFiltrados)}
                    aria-label="Seleccionar todos"
                  />
                </th>
                {pendHeaderCols.map(([col, align]) => (
                  <th key={col} className={dataThWithAlign(align)}>
                    {col}
                  </th>
                ))}
                <th className={dataThAction}>Acciones</th>
              </>
            ) : (
              <>
                <th className={dataTh} />
                {resHeaderCols.map(([col, align]) => (
                  <th key={col} className={dataThWithAlign(align)}>
                    {col}
                  </th>
                ))}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {visibles.map((s) =>
            esPendientes ? renderRowPend(s) : renderRowRes(s),
          )}
        </tbody>
      </DataTable>
      <TablePagination page={safePage} total={total} onPageChange={setPage} />
    </div>
  );
}
