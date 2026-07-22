"use client";

import { useMemo, useState } from "react";
import { BulkSelectionBar } from "@/src/components/ui/BulkSelectionBar";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { AprobacionLegalizacionesFilterBar } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesFilterBar";
import { useAprobacionLegalizaciones } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesContext";
import { AprobacionLegalizacionesTabla } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesTabla";
import {
  applyAproLegFilters,
  hayFiltrosActivos,
  removeFilterByColumn,
  type AproLegFilterRule,
} from "@/src/lib/aprobacion-legalizaciones-filtros";

function KpiCard({
  label,
  value,
  sub,
  alert,
  navy,
  smallValue,
}: {
  label: string;
  value: string | number;
  sub: string;
  alert?: boolean;
  navy?: boolean;
  smallValue?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 ${
        alert
          ? "border-[#fcd34d] bg-[#fffbeb]"
          : navy
            ? "border-[#c7d9ed] bg-[#eef3f9]"
            : "border-border bg-white"
      }`}
    >
      <div
        className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${
          navy ? "text-navy" : "text-muted"
        }`}
      >
        {label}
      </div>
      <div
        className={`font-extrabold leading-none ${smallValue ? "text-lg" : "text-[28px]"} ${alert ? "text-[#b45309]" : "text-navy"}`}
      >
        {value}
      </div>
      <div className={`mt-1.5 text-[11px] ${navy ? "text-navy/70" : "text-muted"}`}>
        {sub}
      </div>
    </div>
  );
}

type AprobacionLegalizacionesListaProps = {
  onOpenDetalle: (no: string) => void;
  onAprobar: (nos: string[]) => void;
  onRechazar: (nos: string[]) => void;
};

export function AprobacionLegalizacionesLista({
  onOpenDetalle,
  onAprobar,
  onRechazar,
}: AprobacionLegalizacionesListaProps) {
  const {
    kpis,
    tab,
    setTab,
    tabCounts,
    seleccion,
    clearSeleccion,
    registrosActuales,
  } = useAprobacionLegalizaciones();

  const [filters, setFilters] = useState<AproLegFilterRule[]>([]);

  const filtrados = useMemo(
    () => applyAproLegFilters(registrosActuales, filters),
    [registrosActuales, filters],
  );

  const handleTab = (next: "pend" | "res") => {
    setTab(next);
    clearSeleccion();
    if (next === "pend") {
      setFilters((prev) => removeFilterByColumn(prev, "estado"));
    }
  };

  return (
    <div className="view-wide">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#111]">
          Aprobación de Legalizaciones
        </h1>
        <p className="mt-1 text-[13px] text-[#4b5563]">
          Revisa y resuelve las legalizaciones pendientes de tu equipo
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Pendientes"
          value={kpis.pendientes}
          sub="Requieren acción"
          alert
        />
        <KpiCard
          label="Aprobados"
          value={kpis.aprobadosMes}
          sub={kpis.montoAprobadoMesLabel}
          navy
        />
        <KpiCard
          label="Rechazados"
          value={kpis.rechazadosMes}
          sub="Resueltas"
        />
        <KpiCard
          label="Monto pendiente"
          value={kpis.montoPendienteLabel}
          sub="COP total"
          smallValue
        />
      </div>

      {tab === "pend" && seleccion.size > 0 && (
        <BulkSelectionBar
          className="mb-3.5"
          count={seleccion.size}
          onAprobar={() => onAprobar([...seleccion])}
          onRechazar={() => onRechazar([...seleccion])}
        />
      )}

      <AprobacionLegalizacionesFilterBar
        registros={registrosActuales}
        filters={filters}
        onChange={setFilters}
        tab={tab}
        shown={filtrados.length}
        total={registrosActuales.length}
      />

      <Card className="overflow-hidden p-0">
        <div className="flex border-b-2 border-[#e5e9f0] px-2">
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
            Pendientes
            <span className="rounded-full bg-[#eef3f9] px-2 py-0.5 text-[10px] font-semibold text-navy">
              {tabCounts.pend}
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
            Resueltas
            <span className="rounded-full bg-[#eef3f9] px-2 py-0.5 text-[10px] font-semibold text-navy">
              {tabCounts.res}
            </span>
          </button>
        </div>

        <AprobacionLegalizacionesTabla
          key={tab}
          registros={filtrados}
          totalBase={registrosActuales.length}
          hasFilters={hayFiltrosActivos(filters)}
          onOpenDetalle={onOpenDetalle}
          onAprobar={onAprobar}
          onRechazar={onRechazar}
        />
      </Card>
    </div>
  );
}
