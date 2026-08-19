"use client";

import { EstadoAnticipoPill } from "@/src/components/ui/Pill";
import { TipoAnticipoPill } from "@/src/components/ui/TipoAnticipoPill";
import {
  formatMonto,
  getBeneficiarioNombre,
  getBeneficiarioSolicitante,
  type Anticipo,
} from "@/src/lib/mis-anticipos-mock";

type AnticiposMobileCardsProps = {
  registros: Anticipo[];
  sessionIds: string[];
  onOpenDetalle: (no: string) => void;
};

export function AnticiposMobileCards({
  registros,
  sessionIds,
  onOpenDetalle,
}: AnticiposMobileCardsProps) {
  return (
    <div className="flex flex-col gap-2 p-3">
      {registros.map((s) => {
        const solicitante = getBeneficiarioSolicitante(s, sessionIds);
        const nombreBenef = getBeneficiarioNombre(s);
        return (
          <button
            key={s.no}
            type="button"
            onClick={() => onOpenDetalle(s.no)}
            className="w-full touch-manipulation rounded-xl border border-border bg-white px-3.5 py-3.5 text-left active:bg-[#f8fafc]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-navy">{s.no}</div>
                <div className="mt-0.5 text-[11px] text-muted">{s.fecha}</div>
              </div>
              <EstadoAnticipoPill estado={s.estado} />
            </div>

            <div className="mt-2 truncate text-[12px] text-[#374151]">
              {s.proy}
              {s.proyN ? ` · ${s.proyN}` : ""}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <TipoAnticipoPill tipo={s.tipo} />
              <span className="text-[14px] font-bold tabular-nums text-navy">
                {formatMonto(s.monto, s.div)}
              </span>
            </div>

            <div className="mt-2 truncate text-[12px] text-[#4b5563]">
              {nombreBenef}
            </div>
            {solicitante ? (
              <div className="mt-1 text-[11px] text-muted">
                Solicitado por{" "}
                <span className="font-semibold text-navy">{solicitante}</span>
              </div>
            ) : null}
            {s.motivo ? (
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-[#6b7280]">
                {s.motivo}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
