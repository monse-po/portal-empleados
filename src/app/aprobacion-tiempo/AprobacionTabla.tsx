"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/src/components/ui/Icon";
import { useToast } from "@/src/components/ui/Toast";
import { EstadoTiempoPill } from "@/src/components/ui/Pill";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { TableAproIconButton } from "@/src/components/ui/TableAproIconButton";
import { TableSelectionCheckbox } from "@/src/components/ui/TableSelectionCheckbox";
import {
  CHECKBOX_COL_WIDTH,
  DataTable,
  dataTd,
  dataTdCheck,
  dataTdNumeric,
  dataTdResAction,
  EmpleadoCell,
  ProyectoCell,
  RES_TAB_ACTION_COL,
  RES_TAB_SPACER_COL,
  SubproyectoCell,
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
  type HojaAprobacion,
} from "@/src/lib/aprobacion-tiempo-mock";
import { toastAnulados } from "@/src/lib/tiempo-bridge";
import { formatHorasValor } from "@/src/lib/tiempo-schedule";

const COLS_PEND = [
  CHECKBOX_COL_WIDTH,
  "88px",
  "200px",
  "140px",
  "64px",
  "180px",
  "160px",
  "200px",
  "280px",
] as const;

const COLS_RES = [
  RES_TAB_SPACER_COL,
  "88px",
  "180px",
  "100px",
  "140px",
  "64px",
  "180px",
  "160px",
  "180px",
  "110px",
  "240px",
  "240px",
  RES_TAB_ACTION_COL,
] as const;

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

  const renderProy = (proy: string) => (
    <ProyectoCell
      codigo={proyKey(proy) || proy}
      nombre={proyNombre(proy)}
      fullText
    />
  );

  const renderSubproy = (subproy: string) => (
    <SubproyectoCell codigo={subproy} fullText />
  );

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
      <td className={`${dataTd} whitespace-nowrap text-muted`}>{s.fecha}</td>
      <td className={`${dataTd} whitespace-nowrap`}>
        <EmpleadoCell nombre={s.nombre} codigo={s.cedula} fullText />
      </td>
      <td className={`${dataTd} whitespace-nowrap`}>
        <TipoHoraPill tipo={s.tipo} />
      </td>
      <td className={`${dataTdNumeric} whitespace-nowrap`}>
        {formatHorasValor(horasNum(s.horas))}
      </td>
      <td className={`${dataTd} whitespace-nowrap`}>{renderProy(s.proy)}</td>
      <td className={`${dataTd} whitespace-nowrap`}>{renderSubproy(s.subproy)}</td>
      <td
        className={`${dataTd} whitespace-nowrap text-[#374151]`}
        title={s.actividad}
      >
        {s.actividad}
      </td>
      <td
        className={`${dataTd} whitespace-nowrap text-muted`}
        title={s.comentarioEmpleado || undefined}
      >
        {s.comentarioEmpleado || "—"}
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
      <td className={`${dataTd} whitespace-nowrap text-muted`}>{s.fecha}</td>
      <td className={`${dataTd} whitespace-nowrap`}>
        <EmpleadoCell nombre={s.nombre} codigo={s.cedula} fullText />
      </td>
      <td
        className={`${dataTd} whitespace-nowrap text-[#374151]`}
        title={s.aprobadorNombre || s.aprobador || undefined}
      >
        {s.aprobador?.trim() || "—"}
      </td>
      <td className={`${dataTd} whitespace-nowrap`}>
        <TipoHoraPill tipo={s.tipo} />
      </td>
      <td className={`${dataTdNumeric} whitespace-nowrap`}>
        {formatHorasValor(horasNum(s.horas))}
      </td>
      <td className={`${dataTd} whitespace-nowrap`}>{renderProy(s.proy)}</td>
      <td className={`${dataTd} whitespace-nowrap`}>{renderSubproy(s.subproy)}</td>
      <td
        className={`${dataTd} whitespace-nowrap text-[#374151]`}
        title={s.actividad}
      >
        {s.actividad}
      </td>
      <td className={`${dataTd} whitespace-nowrap`}>
        <EstadoTiempoPill estado={s.estadoApro || ""} />
      </td>
      <td
        className={`${dataTd} whitespace-nowrap text-muted`}
        title={s.comentarioEmpleado || undefined}
      >
        {s.comentarioEmpleado || "—"}
      </td>
      <td
        className={`${dataTd} whitespace-nowrap ${s.estadoApro === "Rechazado" ? "text-[#b91c1c]" : "text-muted"}`}
        title={s.comentarioApro || undefined}
      >
        {s.comentarioApro?.trim() || "—"}
      </td>
      <td className={dataTdResAction} onClick={(e) => e.stopPropagation()}>
        <TableActionWrap>
          <TableAproIconButton
            variant="undo"
            title="Anular decisión"
            onClick={async (e) => {
              e.stopPropagation();
              const result = await anular([s.no]);
              if (!result.ok) {
                toast(result.error || "No se pudo anular.", "danger");
                return;
              }
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
    ["Aprobador", "text-left"],
    ["Tipo hora", "text-left"],
    ["Horas", "text-center"],
    ["Proyecto", "text-left"],
    ["Subproyecto", "text-left"],
    ["Actividad", "text-left"],
    ["Estado", "text-left"],
    ["Comentario", "text-left"],
    ["Motivo", "text-left"],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
      <DataTable
        layout="auto"
        stickyHeader
        colWidths={[...(tab === "pend" ? COLS_PEND : COLS_RES)]}
      >
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
      </div>

      <TablePagination
        page={safePage}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
