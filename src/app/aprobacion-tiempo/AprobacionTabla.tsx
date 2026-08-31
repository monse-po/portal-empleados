"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/src/components/ui/Icon";
import { useToast } from "@/src/components/ui/Toast";
import { EstadoTiempoPill } from "@/src/components/ui/Pill";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { TableAproIconButton } from "@/src/components/ui/TableAproIconButton";
import { TableSelectionCheckbox } from "@/src/components/ui/TableSelectionCheckbox";
import {
  APRO_PEND_COLS,
  APRO_RES_COLS,
  DataTable,
  dataTd,
  dataTdCheck,
  dataTdClamp,
  dataTdNumeric,
  dataTdResAction,
  dataTdTruncate,
  dataTh,
  dataThCheck,
  dataThResAction,
  dataThWithAlign,
  TableActionWrap,
  TABLE_PAGE_SIZE,
} from "@/src/components/ui/DataTable";
import { TablePagination } from "@/src/components/ui/TablePagination";
import { useAprobacion } from "@/src/app/aprobacion-tiempo/AprobacionContext";
import { getSelectionState } from "@/src/lib/use-table-selection";
import {
  horasNum,
  proyKey,
  proyNombre,
  splitSubproy,
  type HojaAprobacion,
} from "@/src/lib/aprobacion-tiempo-mock";
import { toastAnulados } from "@/src/lib/tiempo-bridge";

type AprobacionTablaProps = {
  registros: HojaAprobacion[];
  totalBase: number;
  hasFilters: boolean;
  onOpenDetalle: (no: string) => void;
};

export function AprobacionTabla({
  registros,
  totalBase,
  hasFilters,
  onOpenDetalle,
}: AprobacionTablaProps) {
  const { tab, seleccion, toggleSeleccion, toggleSeleccionLote, anular } =
    useAprobacion();
  const { toast } = useToast();

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [registros, tab]);

  if (!totalBase) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-muted">
        <Icon name="check" size="xl" className="mx-auto mb-2 opacity-30" />
        {tab === "pend"
          ? "Sin registros pendientes."
          : "Sin registros resueltos."}
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
  const { allSelected, someSelected } = getSelectionState(seleccion, idsFiltrados);

  const renderProy = (proy: string) => {
    const code = proyKey(proy);
    const name = proyNombre(proy);
    return (
      <>
        <div className={dataTdTruncate}>{code || proy || "—"}</div>
        {name && (
          <div className={`text-[11px] text-[#9ca3af] ${dataTdTruncate}`}>
            {name}
          </div>
        )}
      </>
    );
  };

  const renderSubproy = (subproy: string) => {
    const sp = splitSubproy(subproy);
    return (
      <>
        <div className={dataTdTruncate}>{sp.code}</div>
        {sp.name && (
          <div className={`text-[11px] text-[#9ca3af] ${dataTdTruncate}`}>
            {sp.name}
          </div>
        )}
      </>
    );
  };

  const renderRowPend = (s: HojaAprobacion) => (
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
      <td className={`${dataTd} text-muted ${dataTdTruncate}`}>{s.fecha}</td>
      <td className={`${dataTd} font-medium ${dataTdTruncate}`}>
        {s.solicitante}
      </td>
      <td className={dataTd}>
        <TipoHoraPill tipo={s.tipo} />
      </td>
      <td className={dataTdNumeric}>{horasNum(s.horas)}</td>
      <td className={dataTd}>{renderProy(s.proy)}</td>
      <td className={dataTd}>{renderSubproy(s.subproy)}</td>
      <td className={`${dataTd} text-[#374151] ${dataTdTruncate}`}>
        {s.actividad}
      </td>
      <td className={`${dataTd} text-muted`}>
        <div className={dataTdClamp}>{s.comentarioEmpleado || "—"}</div>
      </td>
    </tr>
  );

  const renderRowRes = (s: HojaAprobacion) => (
    <tr
      key={s.no}
      onClick={() => onOpenDetalle(s.no)}
      className="cursor-pointer transition-colors hover:bg-[#fafbfc]"
    >
      <td className={dataTd} />
      <td className={`${dataTd} text-muted ${dataTdTruncate}`}>{s.fecha}</td>
      <td className={`${dataTd} font-medium ${dataTdTruncate}`}>
        {s.solicitante}
      </td>
      <td className={dataTd}>
        <TipoHoraPill tipo={s.tipo} />
      </td>
      <td className={dataTdNumeric}>{horasNum(s.horas)}</td>
      <td className={dataTd}>{renderProy(s.proy)}</td>
      <td className={dataTd}>{renderSubproy(s.subproy)}</td>
      <td className={`${dataTd} text-[#374151] ${dataTdTruncate}`}>
        {s.actividad}
      </td>
      <td className={dataTd}>
        <EstadoTiempoPill estado={s.estadoApro || ""} />
      </td>
      <td
        className={`${dataTd} ${s.estadoApro === "Rechazado" ? "text-[#b91c1c]" : "text-muted"}`}
      >
        <div className={dataTdClamp}>{s.comentarioApro || "—"}</div>
      </td>
      <td className={dataTdResAction} onClick={(e) => e.stopPropagation()}>
        <TableActionWrap>
          <TableAproIconButton
            variant="undo"
            title="Anular decisión"
            onClick={(e) => {
              e.stopPropagation();
              anular([s.no]);
              toast(toastAnulados([s.no]), "green");
            }}
          />
        </TableActionWrap>
      </td>
    </tr>
  );

  const pendHeaderCols: [string, string][] = [
    ["Fecha", "text-left"],
    ["Empleado", "text-left"],
    ["Tipo hora", "text-left"],
    ["Horas", "text-center"],
    ["Proyecto", "text-left"],
    ["Subproyecto", "text-left"],
    ["Actividad", "text-left"],
    ["Comentario", "text-left"],
  ];

  const resHeaderCols: [string, string][] = [
    ["Fecha", "text-left"],
    ["Empleado", "text-left"],
    ["Tipo hora", "text-left"],
    ["Horas", "text-center"],
    ["Proyecto", "text-left"],
    ["Subproyecto", "text-left"],
    ["Actividad", "text-left"],
    ["Estado", "text-left"],
    ["Motivo", "text-left"],
  ];

  return (
    <div>
      <DataTable colWidths={[...(tab === "pend" ? APRO_PEND_COLS : APRO_RES_COLS)]}>
        <thead>
          <tr>
            {tab === "pend" ? (
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
              </>
            ) : (
              <>
                <th className={dataTh} />
                {resHeaderCols.map(([col, align]) => (
                  <th key={col} className={dataThWithAlign(align)}>
                    {col}
                  </th>
                ))}
                <th className={dataThResAction}>Anular</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {visibles.map((s) =>
            tab === "pend" ? renderRowPend(s) : renderRowRes(s),
          )}
        </tbody>
      </DataTable>

      <TablePagination
        page={safePage}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
