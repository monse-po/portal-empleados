"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Card } from "@/src/components/ui/Card";
import { BulkActionButtons } from "@/src/components/ui/BulkSelectionBar";
import { Icon } from "@/src/components/ui/Icon";
import { AprobacionFilterBar } from "@/src/app/aprobacion-tiempo/AprobacionFilterBar";
import { useAprobacion } from "@/src/app/aprobacion-tiempo/AprobacionContext";
import { AprobacionTabla } from "@/src/app/aprobacion-tiempo/AprobacionTabla";
import {
  IfsConnectedChip,
  IfsStatusBanner,
} from "@/src/components/layout/IfsStatusBanner";
import {
  applyAproFilters,
  hayFiltrosActivos,
  removeFilterByColumn,
  type AproFilterRule,
} from "@/src/lib/aprobacion-filtros";
import { formatHorasValor } from "@/src/lib/tiempo-schedule";
import { KpiCard } from "@/src/components/ui/KpiCard";

type AprobacionListaProps = {
  onOpenDetalle: (no: string) => void;
  onRechazar: (nos: string[]) => void;
  onAprobar: (nos: string[]) => void;
  ifsConnected: boolean;
  fromIfs: boolean;
  ifsEmail?: string | null;
  ifsWarning?: string | null;
  /** Tercer nivel (proyecto → empleado): solo filtros + tabla, sin título/KPI. */
  embedded?: boolean;
  /** Breadcrumb u otra franja arriba de las tabs, dentro del Card. */
  tableLead?: ReactNode;
  /** Sustituye la tabla sin salir del Card (mismo padding). */
  detail?: ReactNode;
};

export function AprobacionLista({
  onOpenDetalle,
  onRechazar,
  onAprobar,
  ifsConnected,
  fromIfs,
  ifsEmail,
  ifsWarning,
  embedded = false,
  tableLead,
  detail,
}: AprobacionListaProps) {
  const {
    kpis,
    tab,
    setTab,
    tabCounts,
    seleccion,
    clearSeleccion,
    registrosActuales,
    hojas,
  } = useAprobacion();

  const [filters, setFilters] = useState<AproFilterRule[]>([]);

  const filtrados = useMemo(
    () => applyAproFilters(registrosActuales, filters),
    [registrosActuales, filters],
  );
  const filtrosActivos = hayFiltrosActivos(filters);

  const handleTab = (next: "pend" | "res") => {
    setTab(next);
    clearSeleccion();
    if (next === "pend") {
      setFilters((prev) => removeFilterByColumn(prev, "estado"));
    }
  };

  const body = (
    <>
      {embedded ? null : (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <KpiCard
            label="Horas por aprobar"
            value={formatHorasValor(kpis.horasPendientes)}
            sub="Pendientes de tu decisión"
            alert={kpis.horasPendientes > 0}
          />
          <KpiCard
            label="Horas aprobadas"
            value={formatHorasValor(kpis.horasAprobadas)}
            sub="Ya aprobadas este mes"
            navy
          />
          <KpiCard
            label="Horas rechazadas"
            value={formatHorasValor(kpis.horasRechazadas)}
            sub="Rechazadas este mes"
          />
        </div>
      )}

      <div className="flex flex-col overflow-hidden bg-[#f5f7fa] lg:sticky lg:top-[72px] lg:z-20 lg:max-h-[calc(100dvh-8rem)]">
      <AprobacionFilterBar
        registros={registrosActuales}
        filters={filters}
        onChange={setFilters}
        tab={tab}
        shown={filtrados.length}
        total={registrosActuales.length}
        actions={
          tab === "pend" ? (
            <BulkActionButtons
              onAprobar={() => onAprobar([...seleccion])}
              onRechazar={() => onRechazar([...seleccion])}
            />
          ) : undefined
        }
      />

      <Card className="mb-0 flex min-h-0 flex-1 flex-col !overflow-hidden p-0">
        {tableLead}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-[#e5e9f0] bg-white px-2">
          <div className="flex">
            <button
              type="button"
              onClick={() => handleTab("pend")}
              className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all ${
                tab === "pend"
                  ? "border-b-navy font-bold text-navy"
                  : "border-b-transparent font-medium text-muted hover:text-navy"
              }`}
            >
              <Icon name="clock" size="sm" />
              Horas por aprobar
              <span
                className="rounded-full bg-[#fffbeb] px-2 py-0.5 text-[10px] font-semibold text-[#b45309]"
                title="Horas por aprobar"
              >
                {formatHorasValor(tabCounts.pend)}h
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTab("res")}
              className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all ${
                tab === "res"
                  ? "border-b-navy font-bold text-navy"
                  : "border-b-transparent font-medium text-muted hover:text-navy"
              }`}
            >
              <Icon name="checkSquare" size="sm" />
              Horas resueltas
              <span
                className="rounded-full bg-green-bg px-2 py-0.5 text-[10px] font-semibold text-green"
                title="Horas ya resueltas"
              >
                {formatHorasValor(tabCounts.res)}h
              </span>
            </button>
          </div>
          <div className="flex items-baseline gap-2.5 pr-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Horas registradas totales
            </span>
            <span className="text-[18px] font-extrabold tabular-nums text-navy">
              {formatHorasValor(tabCounts.pend + tabCounts.res)}
            </span>
          </div>
        </div>

        {detail ?? (
          <AprobacionTabla
            key={tab}
            registros={filtrados}
            totalBase={registrosActuales.length}
            hasFilters={filtrosActivos}
            onOpenDetalle={onOpenDetalle}
          />
        )}
      </Card>
      </div>
    </>
  );

  if (embedded) return body;

  return (
    <div className="view-wide max-md:pb-24">
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-[#111]">
            Aprobación de Hoja de Tiempo
          </h1>
          <IfsConnectedChip
            surface="approval"
            connected={ifsConnected}
            fromIfs={fromIfs}
            warning={ifsWarning}
          />
        </div>
        <p className="mt-1 text-[13px] text-[#4b5563]">
          Horas extras de tu equipo. Aprueba o rechaza lo que sigue pendiente.
        </p>
        <div className="mt-3">
          <IfsStatusBanner
            surface="approval"
            connected={ifsConnected}
            fromIfs={fromIfs}
            email={ifsEmail}
            warning={ifsWarning}
          />
        </div>
      </div>
      {body}
    </div>
  );
}
