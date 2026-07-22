"use client";

import { useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { BulkSelectionBar } from "@/src/components/ui/BulkSelectionBar";
import { Icon } from "@/src/components/ui/Icon";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import { AprobacionFilterBar } from "@/src/app/aprobacion-tiempo/AprobacionFilterBar";
import { useAprobacion } from "@/src/app/aprobacion-tiempo/AprobacionContext";
import {
  AprobacionProyMeta,
  AprobacionTabla,
} from "@/src/app/aprobacion-tiempo/AprobacionTabla";
import {
  applyAproFilters,
  hayFiltrosActivos,
  removeFilterByColumn,
  type AproFilterRule,
} from "@/src/lib/aprobacion-filtros";

function KpiCard({
  label,
  value,
  sub,
  alert,
  navy,
}: {
  label: string;
  value: string | number;
  sub: string;
  alert?: boolean;
  navy?: boolean;
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
        className={`text-[28px] font-extrabold leading-none ${alert ? "text-[#b45309]" : "text-navy"}`}
      >
        {value}
      </div>
      <div className={`mt-1.5 text-[11px] ${navy ? "text-navy/70" : "text-muted"}`}>
        {sub}
      </div>
    </div>
  );
}

type AprobacionListaProps = {
  onOpenDetalle: (no: string) => void;
  onRechazar: (nos: string[]) => void;
  onAprobar: (nos: string[]) => void;
};

export function AprobacionLista({
  onOpenDetalle,
  onRechazar,
  onAprobar,
}: AprobacionListaProps) {
  const {
    kpis,
    proyectos,
    proySel,
    setProySel,
    tab,
    setTab,
    tabCounts,
    seleccion,
    clearSeleccion,
    registrosActuales,
  } = useAprobacion();

  const [filters, setFilters] = useState<AproFilterRule[]>([]);

  const filtrados = useMemo(
    () => applyAproFilters(registrosActuales, filters),
    [registrosActuales, filters],
  );

  const handleTab = (next: "pend" | "res") => {
    setTab(next);
    clearSeleccion();
    if (next === "pend") {
      setFilters((prev) => removeFilterByColumn(prev, "estado"));
    }
  };

  const handleProyChange = (cod: string) => {
    setProySel(cod);
    setFilters([]);
  };

  return (
    <div className="view-wide">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#111]">
          Aprobación de Hoja de Tiempo
        </h1>
        <p className="mt-1 text-[13px] text-[#4b5563]">
          Registros de tu equipo pendientes de revisión · HMVINGCO
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
          label="Aprobadas este mes"
          value={kpis.aprobadas}
          sub={`${kpis.horasAprobadas}h aprobadas`}
          navy
        />
        <KpiCard
          label="Rechazadas"
          value={kpis.rechazadas}
          sub="Este mes"
        />
        <KpiCard
          label="Horas pendientes"
          value={`${kpis.horasPendientes}h`}
          sub="Por aprobar"
        />
      </div>

      <div className="mb-3.5 rounded-xl border border-border bg-white px-[18px] py-3">
        <p className="mb-2.5 text-[12px] leading-snug text-[#6b7280]">
          Selecciona el proyecto que quieres revisar; abajo verás las horas de
          tu equipo.
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <Icon name="folderOpen" size="sm" className="shrink-0 text-navy" />
            <span className="shrink-0 text-[12px] font-semibold text-muted">
              Proyecto
            </span>
            <SearchableSelect
              value={proySel}
              onChange={handleProyChange}
              options={proyectos.map((p) => ({
                value: p.cod,
                label: `${p.cod} · ${p.nombre}`,
              }))}
              placeholder="Selecciona un proyecto…"
              searchPlaceholder="Buscar proyecto…"
              wrapperClassName="min-w-[220px]"
            />
          </div>
          {proySel ? (
            <AprobacionProyMeta
              shown={filtrados.length}
              total={registrosActuales.length}
              hasFilters={hayFiltrosActivos(filters)}
            />
          ) : null}
        </div>
      </div>

      {tab === "pend" && seleccion.size > 0 && (
        <BulkSelectionBar
          className="mb-3.5"
          count={seleccion.size}
          onAprobar={() => onAprobar([...seleccion])}
          onRechazar={() => onRechazar([...seleccion])}
        />
      )}

      <AprobacionFilterBar
        registros={registrosActuales}
        filters={filters}
        onChange={setFilters}
        tab={tab}
        disabled={!proySel}
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

        <AprobacionTabla
          key={`${proySel}-${tab}`}
          registros={filtrados}
          totalBase={registrosActuales.length}
          hasFilters={hayFiltrosActivos(filters)}
          onOpenDetalle={onOpenDetalle}
          onRechazar={onRechazar}
          onAprobar={onAprobar}
        />
      </Card>
    </div>
  );
}
