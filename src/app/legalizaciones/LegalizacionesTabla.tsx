"use client";

import { useState } from "react";
import { useLegalizaciones } from "@/src/app/legalizaciones/LegalizacionesContext";
import { Icon } from "@/src/components/ui/Icon";
import { EstadoLegalizacionPill } from "@/src/components/ui/Pill";
import { TipoLegalizacionPill } from "@/src/components/ui/TipoLegalizacionPill";
import {
  DataTable,
  dataTd,
  dataTdResSecondary,
  dataTdTruncate,
  dataThWithAlign,
  TABLE_PAGE_SIZE,
} from "@/src/components/ui/DataTable";
import { TablePagination } from "@/src/components/ui/TablePagination";
import {
  formatMontoLegal,
  LEG_COLS_HIST,
  LEG_COLS_PEND,
  type Legalizacion,
} from "@/src/lib/legalizaciones-mock";

type LegalizacionesTablaProps = {
  registros: Legalizacion[];
  totalBase: number;
  hasFilters: boolean;
  onOpenDetalle: (no: string) => void;
};

const headerCols: [string, string][] = [
  ["Código", "text-left"],
  ["Solicitado", "text-left"],
  ["Tipo", "text-left"],
  ["Concepto", "text-left"],
  ["Monto", "text-right"],
  ["Motivo", "text-left"],
  ["Estado", "text-left"],
];

export function LegalizacionesTabla({
  registros,
  totalBase,
  hasFilters,
  onOpenDetalle,
}: LegalizacionesTablaProps) {
  const { tab } = useLegalizaciones();
  const esHistorial = tab === "historial";
  const [page, setPage] = useState(1);

  if (!totalBase) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-muted">
        <Icon name="folderOpen" size="xl" className="mx-auto mb-2 opacity-30" />
        {esHistorial
          ? "Sin registros en el historial."
          : "Sin legalizaciones en proceso."}
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

  return (
    <div>
      <div className="overflow-x-auto">
        <DataTable
          className="min-w-[1020px]"
          colWidths={[...(esHistorial ? LEG_COLS_HIST : LEG_COLS_PEND)]}
        >
          <thead>
            <tr>
              {headerCols.map(([col, align]) => (
                <th key={col} className={dataThWithAlign(align)}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((row) => (
              <tr
                key={row.no}
                onClick={() => onOpenDetalle(row.no)}
                className="cursor-pointer transition-colors hover:bg-[#fafbfc]"
              >
                <td
                  className={`${dataTd} font-semibold text-navy ${dataTdTruncate}`}
                  title={row.no}
                >
                  {row.no}
                </td>
                <td className={`${dataTd} text-muted ${dataTdTruncate}`}>
                  {row.fecha}
                </td>
                <td className={dataTd}>
                  <TipoLegalizacionPill tipo={row.tipo} />
                </td>
                <td
                  className={`${dataTd} text-[#374151] ${dataTdTruncate}`}
                  title={row.concepto}
                >
                  {row.concepto}
                </td>
                <td className={`${dataTd} text-right`}>
                  <div className="font-semibold leading-snug">
                    {formatMontoLegal(row.monto, row.div)}
                  </div>
                  <div className={dataTdResSecondary}>{row.div}</div>
                </td>
                <td
                  className={`${dataTd} text-[#374151] ${dataTdTruncate}`}
                  title={row.motivo}
                >
                  {row.motivo}
                </td>
                <td className={dataTd}>
                  <EstadoLegalizacionPill estado={row.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>

      <TablePagination page={safePage} total={total} onPageChange={setPage} />
    </div>
  );
}
