"use client";

import { useState } from "react";
import { useDocumentoSoporte } from "@/src/app/documento-soporte/DocumentoSoporteContext";
import { Icon } from "@/src/components/ui/Icon";
import { EstadoDocumentoSoportePill } from "@/src/components/ui/Pill";
import {
  DataTable,
  dataTd,
  dataTdTruncate,
  dataThWithAlign,
  TABLE_PAGE_SIZE,
} from "@/src/components/ui/DataTable";
import { TablePagination } from "@/src/components/ui/TablePagination";
import {
  DS_COLS_HIST,
  DS_COLS_PEND,
  formatSizeKb,
  type DocumentoSoporte,
} from "@/src/lib/documento-soporte-mock";

type DocumentoSoporteTablaProps = {
  registros: DocumentoSoporte[];
  totalBase: number;
  hasFilters: boolean;
  onOpenDetalle: (no: string) => void;
};

const headerCols: [string, string][] = [
  ["Código", "text-left"],
  ["Solicitado", "text-left"],
  ["Tipo", "text-left"],
  ["Referencia", "text-left"],
  ["Descripción", "text-left"],
  ["Adjunto", "text-left"],
  ["Estado", "text-left"],
];

export function DocumentoSoporteTabla({
  registros,
  totalBase,
  hasFilters,
  onOpenDetalle,
}: DocumentoSoporteTablaProps) {
  const { tab } = useDocumentoSoporte();
  const esHistorial = tab === "historial";
  const [page, setPage] = useState(1);

  if (!totalBase) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-muted">
        <Icon name="paperclip" size="xl" className="mx-auto mb-2 opacity-30" />
        {esHistorial
          ? "Sin registros en el historial."
          : "Sin documentos en proceso."}
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
          colWidths={[...(esHistorial ? DS_COLS_HIST : DS_COLS_PEND)]}
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
                <td className={`${dataTd} ${dataTdTruncate}`}>{row.tipo}</td>
                <td className={`${dataTd} ${dataTdTruncate}`} title={row.referencia}>
                  {row.referencia}
                </td>
                <td
                  className={`${dataTd} text-[#374151] ${dataTdTruncate}`}
                  title={row.descripcion}
                >
                  {row.descripcion}
                </td>
                <td className={`${dataTd} ${dataTdTruncate}`}>
                  {row.adjunto ? (
                    <span
                      className="inline-flex items-center gap-1 text-[12px] text-navy"
                      title={`${row.adjunto.nombre} · ${formatSizeKb(row.adjunto.sizeKb)}`}
                    >
                      <Icon name="paperclip" size="xs" />
                      <span className="truncate">{row.adjunto.nombre}</span>
                    </span>
                  ) : (
                    <span className="text-[#d1d5db]">—</span>
                  )}
                </td>
                <td className={dataTd}>
                  <EstadoDocumentoSoportePill estado={row.estado} />
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
