"use client";

import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { FloatingActions } from "@/src/components/ui/FloatingActions";
import { Icon } from "@/src/components/ui/Icon";
import { AnticiposFilterBar } from "@/src/app/mis-anticipos/AnticiposFilterBar";
import { useAnticipos } from "@/src/app/mis-anticipos/AnticiposContext";
import { AnticiposTabla } from "@/src/app/mis-anticipos/AnticiposTabla";
import {
  applyAnticipoFilters,
  hayFiltrosActivos,
  removeFilterByColumn,
  type AnticipoFilterRule,
} from "@/src/lib/anticipos-filtros";

type AnticiposListaProps = {
  onOpenDetalle: (no: string) => void;
  onNuevaSolicitud: () => void;
};

export function AnticiposLista({
  onOpenDetalle,
  onNuevaSolicitud,
}: AnticiposListaProps) {
  const { tab, setTab, tabCounts, registrosActuales } = useAnticipos();
  const [filters, setFilters] = useState<AnticipoFilterRule[]>([]);

  const filtrados = useMemo(
    () => applyAnticipoFilters(registrosActuales, filters),
    [registrosActuales, filters],
  );

  const handleTab = (next: "pendientes" | "disponibles") => {
    setTab(next);
    if (next === "pendientes") {
      setFilters((prev) => removeFilterByColumn(prev, "estado"));
    }
  };

  return (
    <div className="view-wide max-md:pb-24">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 max-md:mb-4 max-md:flex-col max-md:gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#111]">Mis Anticipos</h1>
          <p className="mt-1 text-[13px] text-[#4b5563] max-md:hidden">
            Solicita y consulta el estado de tus anticipos
          </p>
        </div>
        <FloatingActions>
          <Button variant="primary" onClick={onNuevaSolicitud}>
            <Icon name="plus" size="xs" />
            Nuevo anticipo
          </Button>
        </FloatingActions>
      </div>

      <AnticiposFilterBar
        registros={registrosActuales}
        filters={filters}
        onChange={setFilters}
        tab={tab}
        shown={filtrados.length}
        total={registrosActuales.length}
      />

      <Card className="overflow-hidden p-0">
        <div className="flex border-b-2 border-[#e5e9f0] px-2 max-md:px-1">
          <button
            type="button"
            onClick={() => handleTab("pendientes")}
            className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all max-md:min-h-12 max-md:flex-1 max-md:justify-center max-md:gap-1.5 max-md:px-2 max-md:text-[14px] ${
              tab === "pendientes"
                ? "border-b-navy font-bold text-navy"
                : "border-b-transparent font-medium text-muted hover:text-navy max-md:active:bg-[#f0f2f5]"
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
            onClick={() => handleTab("disponibles")}
            className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all max-md:min-h-12 max-md:flex-1 max-md:justify-center max-md:gap-1.5 max-md:px-2 max-md:text-[14px] ${
              tab === "disponibles"
                ? "border-b-navy font-bold text-navy"
                : "border-b-transparent font-medium text-muted hover:text-navy max-md:active:bg-[#f0f2f5]"
            }`}
          >
            <Icon name="circleCheck" size="sm" />
            Historial
            <span className="rounded-full bg-[#eef3f9] px-2 py-0.5 text-[10px] font-semibold text-navy">
              {tabCounts.disponibles}
            </span>
          </button>
        </div>

        <AnticiposTabla
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
