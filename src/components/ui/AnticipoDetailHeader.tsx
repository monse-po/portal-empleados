import type { ReactNode } from "react";
import { PageBreadcrumb } from "@/src/components/ui/PageBreadcrumb";
import {
  EstadoAnticipoPill,
  estadoAnticipoPillProps,
  type PillVariant,
} from "@/src/components/ui/Pill";
import type { AnticipoExtra } from "@/src/lib/mis-anticipos-mock";

export type RecordEventBanner = {
  autor: string;
  fecha: string;
  motivo: string;
};

/** @deprecated Use RecordEventBanner */
export type AnticipoEventBanner = RecordEventBanner;

const bannerToneByVariant: Partial<Record<PillVariant, string>> = {
  aprobado: "border-[#bbf7d0] bg-[#f0fdf4]",
  pagado: "border-[#bbf7d0] bg-[#f0fdf4]",
  rechazado: "border-[#fecaca] bg-[#fef2f2]",
  cancelado: "border-[#e5e7eb] bg-[#f9fafb]",
  lanzado: "border-[#bfdbfe] bg-[#eff6ff]",
  revision: "border-[#fde68a] bg-[#fffbeb]",
  registrado: "border-[#e5e7eb] bg-[#f9fafb]",
};

function parseMotivoFromAccion(accion: string): string {
  if (accion.includes(" — ")) {
    return accion.split(" — ").slice(1).join(" — ").trim() || "—";
  }
  if (/^Rechazada\b/i.test(accion)) {
    return accion.replace(/^Rechazada\s*—?\s*/i, "").trim() || "—";
  }
  if (/^Cancelado\b/i.test(accion)) {
    return accion.replace(/^Cancelado\s*/i, "").trim() || "—";
  }
  return accion.trim() || "—";
}

function stripGerenteSuffix(nombre: string): string {
  return nombre.replace(/\s*\(Gerente\)\s*$/, "").trim();
}

export function getAnticipoEventBanner(
  estado: string,
  extra?: AnticipoExtra,
  fechaAprob?: string | null,
): RecordEventBanner | null {
  if (estado === "Lanzado" || estado === "Pendiente") return null;

  const tl = extra?.tl ?? [];

  if (estado === "Aprobado" || estado === "Pagado") {
    const aprobEntry = [...tl].reverse().find((t) => /^Aprobada\b/i.test(t.accion));
    const payEntry = [...tl]
      .reverse()
      .find((t) => /pago/i.test(t.accion) && estado === "Pagado");

    if (estado === "Pagado" && payEntry) {
      return {
        autor: payEntry.usuario,
        fecha: payEntry.fecha,
        motivo: parseMotivoFromAccion(payEntry.accion),
      };
    }

    return {
      autor:
        (extra?.aprobadoPor && stripGerenteSuffix(extra.aprobadoPor)) ||
        aprobEntry?.usuario ||
        "—",
      fecha: fechaAprob || aprobEntry?.fecha || "—",
      motivo: "—",
    };
  }

  const lastEvent = tl[tl.length - 1];
  if (!lastEvent) return null;

  if (estado === "Rechazado" || estado === "Cancelado") {
    return {
      autor: lastEvent.usuario,
      fecha: lastEvent.fecha,
      motivo: parseMotivoFromAccion(lastEvent.accion),
    };
  }

  return null;
}

type RecordDetailHeaderProps = {
  parentLabel: string;
  codigo: string;
  nombre: string;
  estado: string;
  onVolver: () => void;
  banner?: RecordEventBanner | null;
  trailingAction?: ReactNode;
  resolvePillVariant: (estado: string) => PillVariant;
  renderEstadoPill: (estado: string) => ReactNode;
};

export function RecordDetailHeader({
  parentLabel,
  codigo,
  nombre,
  estado,
  onVolver,
  banner,
  trailingAction,
  resolvePillVariant,
  renderEstadoPill,
}: RecordDetailHeaderProps) {
  const bannerTone =
    bannerToneByVariant[resolvePillVariant(estado)] ??
    "border-border bg-[#fafbfc]";

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <PageBreadcrumb
            parentLabel={parentLabel}
            onVolver={onVolver}
            segment={codigo}
          />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-[#111]">{nombre}</h1>
            {renderEstadoPill(estado)}
          </div>
        </div>
        {trailingAction}
      </div>

      {banner && (
        <div className={`mt-3 rounded-lg border px-4 py-3 ${bannerTone}`}>
          <p className="text-[13px] leading-relaxed text-[#374151]">
            <span>{banner.autor}</span>
            <span className="text-muted"> · </span>
            <span>{banner.fecha}</span>
            {banner.motivo !== "—" && (
              <>
                <span className="text-muted"> · </span>
                <span>{banner.motivo}</span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

type AnticipoDetailHeaderProps = Omit<
  RecordDetailHeaderProps,
  "resolvePillVariant" | "renderEstadoPill"
>;

export function AnticipoDetailHeader(props: AnticipoDetailHeaderProps) {
  return (
    <RecordDetailHeader
      {...props}
      resolvePillVariant={(estado) => estadoAnticipoPillProps(estado).variant}
      renderEstadoPill={(estado) => <EstadoAnticipoPill estado={estado} />}
    />
  );
}
