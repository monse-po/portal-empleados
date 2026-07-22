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
  dataTdAction,
  dataTdCheck,
  dataTdClamp,
  dataTdNumeric,
  dataTdResAction,
  dataTdTruncate,
  dataTh,
  dataThAction,
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
  PROY_INFO,
  splitSubproy,
  type HojaAprobacion,
} from "@/src/lib/aprobacion-tiempo-mock";
import { toastAnulados } from "@/src/lib/tiempo-bridge";

type AprobacionTablaProps = {
  registros: HojaAprobacion[];
  totalBase: number;
  hasFilters: boolean;
  onOpenDetalle: (no: string) => void;
  onRechazar: (nos: string[]) => void;
  onAprobar: (nos: string[]) => void;
};

export function AprobacionTabla({
  registros,
  totalBase,
  hasFilters,
  onOpenDetalle,
  onRechazar,
  onAprobar,
}: AprobacionTablaProps) {
  const {
    proySel,
    tab,
    seleccion,
    toggleSeleccion,
    toggleSeleccionLote,
    anular,
  } = useAprobacion();
  const { toast } = useToast();

  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [registros, proySel, tab]);

  if (!proySel) {
    return (
      <div className="px-5 py-14 text-center text-[13px] text-muted">
        <Icon
          name="folderOpen"
          size="xl"
          className="mx-auto mb-2.5 opacity-25"
        />
        Selecciona un proyecto para ver las horas pendientes.
      </div>
    );
  }

  if (!totalBase) {
    return (
      <div className="px-5 py-12 text-center text-[13px] text-muted">
        <Icon name="check" size="xl" className="mx-auto mb-2 opacity-30" />
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

  const total = registros.length;
  const safePage = Math.min(
    page,
    Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE)),
  );
  const start = (safePage - 1) * TABLE_PAGE_SIZE;
  const visibles = registros.slice(start, start + TABLE_PAGE_SIZE);
  const idsFiltrados = registros.map((r) => r.no);
  const { allSelected, someSelected } = getSelectionState(seleccion, idsFiltrados);

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
      <td className={dataTd}>{renderSubproy(s.subproy)}</td>
      <td className={`${dataTd} text-[#374151] ${dataTdTruncate}`}>
        {s.actividad}
      </td>
      <td className={`${dataTd} text-muted`}>
        <div className={dataTdClamp}>{s.comentarioEmpleado || "—"}</div>
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
    ["Subproyecto", "text-left"],
    ["Actividad", "text-left"],
    ["Comentario", "text-left"],
  ];

  const resHeaderCols: [string, string][] = [
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

export function AprobacionProyMeta({
  shown,
  total,
  hasFilters,
}: {
  shown: number;
  total: number;
  hasFilters: boolean;
}) {
  const { proySel, tab, registrosActuales } = useAprobacion();
  if (!proySel) return null;
  const info = PROY_INFO[proySel];
  const horasPend = registrosActuales.reduce(
    (acc, s) => acc + horasNum(s.horas),
    0,
  );
  const horasLabel =
    horasPend % 1 === 0 ? `${horasPend}h` : `${horasPend.toFixed(1)}h`;

  const countLine = hasFilters ? (
    <span className="rounded-md border border-[#c7d9ed] bg-white px-2 py-0.5 text-[12px] text-muted">
      Mostrando <b className="text-navy">{shown}</b> de{" "}
      <b className="text-navy">{total}</b>
    </span>
  ) : null;

  if (tab === "pend") {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {info?.cliente ? (
          <span className="rounded-md bg-[#f3f4f6] px-2.5 py-1 text-[12px] font-medium text-[#374151]">
            {info.cliente}
          </span>
        ) : null}
        <span className="rounded-md bg-[#eef3f9] px-2.5 py-1 text-[12px] text-navy">
          <b>{total}</b> pendiente{total !== 1 ? "s" : ""}
        </span>
        {total > 0 ? (
          <span className="rounded-md bg-[#fffbeb] px-2.5 py-1 text-[12px] text-[#b45309]">
            <b>{horasLabel}</b> por aprobar
          </span>
        ) : null}
        {countLine}
      </div>
    );
  }

  const aprobadas = registrosActuales.filter(
    (s) => s.estadoApro === "Aprobado",
  ).length;
  const rechazadas = registrosActuales.filter(
    (s) => s.estadoApro === "Rechazado",
  ).length;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {info?.cliente ? (
        <span className="rounded-md bg-[#f3f4f6] px-2.5 py-1 text-[12px] font-medium text-[#374151]">
          {info.cliente}
        </span>
      ) : null}
      <span className="rounded-md bg-[#ecfdf5] px-2.5 py-1 text-[12px] text-[#16a34a]">
        <b>{aprobadas}</b> aprobada{aprobadas !== 1 ? "s" : ""}
      </span>
      <span className="rounded-md bg-[#fef2f2] px-2.5 py-1 text-[12px] text-[#dc2626]">
        <b>{rechazadas}</b> rechazada{rechazadas !== 1 ? "s" : ""}
      </span>
      {countLine}
    </div>
  );
}
