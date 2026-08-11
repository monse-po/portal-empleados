"use client";

import { useState } from "react";
import { useDocumentoSoporte } from "@/src/app/documento-soporte/DocumentoSoporteContext";
import { Icon } from "@/src/components/ui/Icon";
import { EstadoDocumentoSoportePill } from "@/src/components/ui/Pill";
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
  DS_COLS_HIST,
  DS_COLS_PEND,
  getRegistradoPorLabel,
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
  ["A nombre de", "text-left"],
  ["NIF", "text-left"],
  ["Documento", "text-left"],
  ["Concepto", "text-left"],
  ["Monto", "text-right"],
  ["Estado", "text-left"],
];

export function DocumentoSoporteTabla({
  registros,
  totalBase,
  hasFilters,
  onOpenDetalle,
}: DocumentoSoporteTablaProps) {
  const { tab, sessionEmpleadoId } = useDocumentoSoporte();
  const esHistorial = tab === "historial";
  const [page, setPage] = useState(1);

  if (!totalBase) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-muted">
        <Icon name="folderOpen" size="xl" className="mx-auto mb-2 opacity-30" />
        {esHistorial
          ? "Sin registros en el historial."
          : "Sin solicitudes en proceso."}
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
            {visibles.map((row) => {
              const registradoPor = getRegistradoPorLabel(
                row,
                sessionEmpleadoId,
              );
              return (
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
                  <td className={`${dataTd} align-top`}>
                    <div
                      className="font-medium leading-snug text-[#374151] [overflow-wrap:anywhere]"
                      title={row.solicitadoPorNombre}
                    >
                      {row.solicitadoPorNombre}
                    </div>
                    {registradoPor ? (
                      <div
                        className="mt-1 inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-md bg-[#eef3f9] px-1.5 py-0.5 text-[11px] leading-snug [overflow-wrap:anywhere]"
                        title={`Registrado por ${registradoPor}`}
                      >
                        <span className="font-medium text-[#4b5563]">
                          Registrado por
                        </span>
                        <span className="font-semibold text-navy">
                          {registradoPor}
                        </span>
                      </div>
                    ) : null}
                  </td>
                  <td
                    className={`${dataTd} ${dataTdTruncate}`}
                    title={row.nif}
                  >
                    {row.nif}
                  </td>
                  <td
                    className={`${dataTd} ${dataTdTruncate}`}
                    title={row.noDocumentoOriginal}
                  >
                    {row.noDocumentoOriginal}
                  </td>
                  <td
                    className={`${dataTd} text-[#374151] ${dataTdTruncate}`}
                    title={row.concepto}
                  >
                    {row.concepto}
                  </td>
                  <td className={`${dataTd} text-right`}>
                    <div className="font-semibold leading-snug">
                      {`${row.monto < 0 ? "-" : ""}${Math.abs(row.monto).toLocaleString("es-CO")}`}
                    </div>
                    <div className={dataTdResSecondary}>{row.divisa}</div>
                  </td>
                  <td className={dataTd}>
                    <EstadoDocumentoSoportePill estado={row.estado} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </div>

      <TablePagination page={safePage} total={total} onPageChange={setPage} />
    </div>
  );
}
