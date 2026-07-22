"use client";

import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { LegalizacionesFilterBar } from "@/src/app/legalizaciones/LegalizacionesFilterBar";
import { useLegalizaciones } from "@/src/app/legalizaciones/LegalizacionesContext";
import { LegalizacionesTabla } from "@/src/app/legalizaciones/LegalizacionesTabla";
import {
  applyLegalizacionFilters,
  hayFiltrosActivos,
  removeFilterByColumn,
  type LegalizacionFilterRule,
} from "@/src/lib/legalizaciones-filtros";

type LegalizacionesListaProps = {
  onOpenDetalle: (no: string) => void;
  onNueva: () => void;
};

export function LegalizacionesLista({
  onOpenDetalle,
  onNueva,
}: LegalizacionesListaProps) {
  const { tab, setTab, tabCounts, registrosActuales } = useLegalizaciones();
  const [filters, setFilters] = useState<LegalizacionFilterRule[]>([]);

  const filtrados = useMemo(
    () => applyLegalizacionFilters(registrosActuales, filters),
    [registrosActuales, filters],
  );

  const handleTab = (next: "pendientes" | "historial") => {
    setTab(next);
    if (next === "pendientes") {
      setFilters((prev) => removeFilterByColumn(prev, "estado"));
    }
  };

  return (
    <div className="view-wide">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111]">Mis Legalizaciones</h1>
          <p className="mt-1 text-[13px] text-[#4b5563]">
            Solicita y consulta el estado de tus legalizaciones de gastos
          </p>
        </div>
        <Button variant="primary" onClick={onNueva}>
          <Icon name="plus" size="xs" />
          Nueva legalización
        </Button>
      </div>

      <LegalizacionesFilterBar
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
            onClick={() => handleTab("pendientes")}
            className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all ${
              tab === "pendientes"
                ? "border-b-navy font-bold text-navy"
                : "border-b-transparent font-medium text-muted hover:text-navy"
            }`}
          >
            <Icon name="hourglass" size="sm" />
            En proceso
            <span className="rounded-full bg-[#eef3f9] px-2 py-0.5 text-[10px] font-semibold text-navy">
              {tabCounts.pendientes}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTab("historial")}
            className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all ${
              tab === "historial"
                ? "border-b-navy font-bold text-navy"
                : "border-b-transparent font-medium text-muted hover:text-navy"
            }`}
          >
            <Icon name="circleCheck" size="sm" />
            Historial
            <span className="rounded-full bg-[#eef3f9] px-2 py-0.5 text-[10px] font-semibold text-navy">
              {tabCounts.historial}
            </span>
          </button>
        </div>

        <LegalizacionesTabla
          key={tab}
          registros={filtrados}
          totalBase={registrosActuales.length}
          hasFilters={hayFiltrosActivos(filters)}
          onOpenDetalle={onOpenDetalle}
        />
      </Card>
    </div>
  );
}
