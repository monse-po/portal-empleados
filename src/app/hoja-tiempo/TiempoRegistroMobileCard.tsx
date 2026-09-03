"use client";

import { EstadoTiempoPill } from "@/src/components/ui/Pill";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { ProyectoCell } from "@/src/components/ui/DataTable";
import {
  isRegistroEditable,
  isRegistroEliminable,
} from "@/src/lib/tiempo-registro-rules";
import type { RegistroMock } from "@/src/lib/mi-tiempo-mock";
import { formatHorasValor } from "@/src/lib/tiempo-schedule";

type TiempoRegistroMobileCardProps = {
  registro: RegistroMock;
  onOpen?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
};

export function TiempoRegistroMobileCard({
  registro,
  onOpen,
  onDelete,
  deleteDisabled,
}: TiempoRegistroMobileCardProps) {
  const editable = isRegistroEditable(registro.estado);
  const canDelete = isRegistroEliminable(registro.estado) && onDelete;
  const clickable = Boolean(editable && onOpen);

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onOpen : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
      className={`w-full rounded-xl border border-border bg-white px-3.5 py-3.5 text-left ${
        clickable ? "cursor-pointer touch-manipulation active:bg-[#f8fafc]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <ProyectoCell
            codigo={registro.proy}
            nombre={registro.proyNombre}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <EstadoTiempoPill estado={registro.estado} />
          {canDelete ? (
            <button
              type="button"
              title="Eliminar"
              aria-label="Eliminar registro"
              disabled={deleteDisabled}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="inline-flex h-7 w-7 cursor-pointer touch-manipulation items-center justify-center rounded-md text-[13px] font-medium text-[#9b1c1c] active:bg-[#fde8e8] disabled:opacity-40"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {registro.act ? (
        <div className="mt-2 truncate text-[12px] text-[#374151]">
          {registro.act}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <TipoHoraPill tipo={registro.tipo} />
        <span className="text-[16px] font-bold tabular-nums text-navy">
          {formatHorasValor(registro.horas)}
        </span>
      </div>
    </div>
  );
}
