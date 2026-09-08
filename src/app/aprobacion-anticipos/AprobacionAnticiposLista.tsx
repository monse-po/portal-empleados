"use client";

import { useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { BulkActionButtons } from "@/src/components/ui/BulkSelectionBar";
import { Icon } from "@/src/components/ui/Icon";
import {
  IfsConnectedChip,
  IfsStatusBanner,
} from "@/src/components/layout/IfsStatusBanner";
import { AprobacionAnticiposFilterBar } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposFilterBar";
import { useAprobacionAnticipos } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposContext";
import { AprobacionAnticiposTabla } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposTabla";
import {
  applyAproAntFilters,
  hayFiltrosActivos,
  removeFilterByColumn,
  type AproAntFilterRule,
} from "@/src/lib/aprobacion-anticipos-filtros";
import { KpiCard } from "@/src/components/ui/KpiCard";

type AprobacionAnticiposListaProps = {
  onOpenDetalle: (no: string) => void;
  onAprobar: (nos: string[]) => void;
  onRechazar: (nos: string[]) => void;
};

export function AprobacionAnticiposLista({
  onOpenDetalle,
  onAprobar,
  onRechazar,
}: AprobacionAnticiposListaProps) {
  const {
    kpis,
    tab,
    setTab,
    tabCounts,
    seleccion,
    clearSeleccion,
    registrosActuales,
    fromIfs,
    ifsConnected,
    ifsEmail,
  } = useAprobacionAnticipos();

  const [filters, setFilters] = useState<AproAntFilterRule[]>([]);

  const filtrados = useMemo(
    () => applyAproAntFilters(registrosActuales, filters),
    [registrosActuales, filters],
  );

  const handleTab = (next: "pendientes" | "resueltas") => {
    setTab(next);
    clearSeleccion();
    if (next === "pendientes") {
      setFilters((prev) => removeFilterByColumn(prev, "estado"));
    }
  };

  return (
    <div className="view-wide max-md:pb-24">
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-[#111]">Aprobar anticipos</h1>
          <IfsConnectedChip
            surface="anticipos-approval"
            connected={ifsConnected}
            fromIfs={fromIfs}
          />
        </div>
        <p className="mt-1 text-[13px] text-[#4b5563]">
          Solicitudes de tu equipo pendientes de revisión · HMVINGCO
        </p>
        <div className="mt-3">
          <IfsStatusBanner
            surface="anticipos-approval"
            loginNext="/aprobacion-anticipos"
            connected={ifsConnected}
            fromIfs={fromIfs}
            email={ifsEmail}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Pendientes"
          value={kpis.pendientes}
          sub="Requieren acción"
          alert
        />
        <KpiCard
          label="Aprobados este mes"
          value={kpis.aprobadosMes}
          sub={kpis.montoAprobadoMesLabel}
          navy
        />
        <KpiCard
          label="Rechazados"
          value={kpis.rechazadosMes}
          sub="Este mes"
        />
        <KpiCard
          label="Monto pendiente"
          value={kpis.montoPendienteLabel}
          sub="COP total"
          smallValue
        />
      </div>

      <AprobacionAnticiposFilterBar
        registros={registrosActuales}
        filters={filters}
        onChange={setFilters}
        tab={tab}
        shown={filtrados.length}
        total={registrosActuales.length}
        actions={
          tab === "pendientes" ? (
            <BulkActionButtons
              onAprobar={() => onAprobar([...seleccion])}
              onRechazar={() => onRechazar([...seleccion])}
            />
          ) : undefined
        }
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
            <Icon name="clock" size="sm" />
            Por aprobar
            <span className="rounded-full bg-[#eef3f9] px-2 py-0.5 text-[10px] font-semibold text-navy">
              {tabCounts.pendientes}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTab("resueltas")}
            className={`mb-[-2px] flex items-center gap-2 rounded-t-md border-b-[3px] px-[22px] py-2.5 text-[13px] transition-all ${
              tab === "resueltas"
                ? "border-b-navy font-bold text-navy"
                : "border-b-transparent font-medium text-muted hover:text-navy"
            }`}
          >
            <Icon name="checkSquare" size="sm" />
            Resueltas
            <span className="rounded-full bg-[#eef3f9] px-2 py-0.5 text-[10px] font-semibold text-navy">
              {tabCounts.resueltas}
            </span>
          </button>
        </div>

        <AprobacionAnticiposTabla
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
