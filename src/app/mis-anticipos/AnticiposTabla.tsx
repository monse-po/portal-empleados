"use client";

import { useState } from "react";
import { useAnticipos } from "@/src/app/mis-anticipos/AnticiposContext";
import { Icon } from "@/src/components/ui/Icon";
import { EstadoAnticipoPill } from "@/src/components/ui/Pill";
import { TipoAnticipoPill } from "@/src/components/ui/TipoAnticipoPill";
import {
  DataTable,
  dataTd,
  dataTdResPrimary,
  dataTdResSecondary,
  dataTdTruncate,
  dataThWithAlign,
  TABLE_PAGE_SIZE,
} from "@/src/components/ui/DataTable";
import { TablePagination } from "@/src/components/ui/TablePagination";
import {
  ANTICIPOS_COLS_HIST,
  ANTICIPOS_COLS_PEND,
  formatMonto,
  getBeneficiarioNombre,
  getBeneficiarioSolicitante,
  nombreAprobador,
  type Anticipo,
} from "@/src/lib/mis-anticipos-mock";

type AnticiposTablaProps = {
  registros: Anticipo[];
  totalBase: number;
  hasFilters: boolean;
  onOpenDetalle: (no: string) => void;
};

const headerCols: [string, string][] = [
  ["Código", "text-left"],
  ["Solicitado", "text-left"],
  ["Proyecto", "text-left"],
  ["Tipo", "text-left"],
  ["Beneficiario", "text-left"],
  ["Monto", "text-right"],
  ["Motivo", "text-left"],
  ["Estado", "text-left"],
];

export function AnticiposTabla({
  registros,
  totalBase,
  hasFilters,
  onOpenDetalle,
}: AnticiposTablaProps) {
  const { tab } = useAnticipos();
  const esHistorial = tab === "disponibles";

  const [page, setPage] = useState(1);

  if (!totalBase) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-muted">
        <Icon name="folderOpen" size="xl" className="mx-auto mb-2 opacity-30" />
        {esHistorial
          ? "Sin registros en el historial."
          : "Sin anticipos en proceso."}
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

  const renderAprobador = (s: Anticipo) => {
    const nombre = nombreAprobador(s.aprobador);
    if (nombre && s.aprobador) {
      return (
        <td className={dataTd}>
          <div className="flex min-w-0 items-baseline gap-1.5 leading-tight">
            <span className="shrink-0 font-mono text-[10px] font-bold text-navy">
              {s.aprobador}
            </span>
            <span
              className={`min-w-0 ${dataTdTruncate} text-[11.5px] font-medium text-[#374151]`}
              title={nombre}
            >
              {nombre}
            </span>
          </div>
          {s.fechaAprob ? (
            <div className={`${dataTdResSecondary} text-muted`}>
              {s.fechaAprob}
            </div>
          ) : (
            <div className={`${dataTdResSecondary} italic`}>
              Pendiente de aprobar
            </div>
          )}
        </td>
      );
    }
    if (s.estado === "Cancelado") {
      return (
        <td className={`${dataTd} text-[#d1d5db]`}>—</td>
      );
    }
    return (
      <td className={`${dataTd} text-[11.5px] italic text-[#9ca3af]`}>
        Pendiente
      </td>
    );
  };

  const renderPagado = (s: Anticipo) => {
    if (s.estado === "Pagado" && s.fechaAprob) {
      return (
        <td className={`${dataTd} text-muted ${dataTdTruncate}`}>
          {s.fechaAprob}
        </td>
      );
    }
    return (
      <td className={`${dataTd} text-[#d1d5db]`}>—</td>
    );
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <DataTable
          className={esHistorial ? "min-w-[1380px]" : "min-w-[1280px]"}
          colWidths={[
            ...(esHistorial ? ANTICIPOS_COLS_HIST : ANTICIPOS_COLS_PEND),
          ]}
        >
        <thead>
          <tr>
            {headerCols.map(([col, align]) => (
              <th key={col} className={dataThWithAlign(align)}>
                {col}
              </th>
            ))}
            {esHistorial ? (
              <th className={dataThWithAlign("text-left")}>Pagado</th>
            ) : null}
            <th className={dataThWithAlign("text-left")}>Aprobador</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((s) => {
            const solicitanteBenef = getBeneficiarioSolicitante(s);
            const nombreBenef = getBeneficiarioNombre(s);
            return (
              <tr
                key={s.no}
                onClick={() => onOpenDetalle(s.no)}
                className="cursor-pointer transition-colors hover:bg-[#fafbfc]"
              >
                <td
                  className={`${dataTd} font-semibold text-navy ${dataTdTruncate}`}
                  title={s.no}
                >
                  {s.no}
                </td>
                <td className={`${dataTd} text-muted ${dataTdTruncate}`}>
                  {s.fecha}
                </td>
                <td className={dataTd}>
                  <div className={dataTdResPrimary}>{s.proy}</div>
                  <div className={dataTdResSecondary} title={s.proyN}>
                    {s.proyN}
                  </div>
                </td>
                <td className={dataTd}>
                  <TipoAnticipoPill tipo={s.tipo} />
                </td>
                <td className={`${dataTd} align-top`}>
                  <div
                    className="font-medium leading-snug text-[#374151] [overflow-wrap:anywhere]"
                    title={nombreBenef}
                  >
                    {nombreBenef}
                  </div>
                  {solicitanteBenef ? (
                    <div
                      className="mt-1 inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-md bg-[#eef3f9] px-1.5 py-0.5 text-[11px] leading-snug [overflow-wrap:anywhere]"
                      title={`Solicitado por ${solicitanteBenef}`}
                    >
                      <span className="font-medium text-[#4b5563]">
                        Solicitado por
                      </span>
                      <span className="font-semibold text-navy">
                        {solicitanteBenef}
                      </span>
                    </div>
                  ) : null}
                </td>
                <td className={`${dataTd} text-right`}>
                  <div className="font-semibold leading-snug">
                    {formatMonto(s.monto, s.div)}
                  </div>
                  <div className={dataTdResSecondary}>{s.div}</div>
                </td>
                <td
                  className={`${dataTd} text-[#374151] ${dataTdTruncate}`}
                  title={s.motivo}
                >
                  {s.motivo}
                </td>
                <td className={dataTd}>
                  <EstadoAnticipoPill estado={s.estado} />
                </td>
                {esHistorial ? renderPagado(s) : null}
                {renderAprobador(s)}
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
