"use client";

import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { FloatingActions } from "@/src/components/ui/FloatingActions";
import { Icon } from "@/src/components/ui/Icon";
import {
  IfsConnectedChip,
  IfsStatusBanner,
} from "@/src/components/layout/IfsStatusBanner";
import { DocumentoSoporteFilterBar } from "@/src/app/documento-soporte/DocumentoSoporteFilterBar";
import { useDocumentoSoporte } from "@/src/app/documento-soporte/DocumentoSoporteContext";
import { DocumentoSoporteTabla } from "@/src/app/documento-soporte/DocumentoSoporteTabla";
import {
  applyDocumentoSoporteFilters,
  hayFiltrosActivos,
  removeFilterByColumn,
  type DocumentoSoporteFilterRule,
} from "@/src/lib/documento-soporte-filtros";
import { ESTADOS_POR_TAB } from "@/src/lib/documento-soporte-mock";

type DocumentoSoporteListaProps = {
  onOpenDetalle: (no: string) => void;
  onNuevo: () => void;
};

export function DocumentoSoporteLista({
  onOpenDetalle,
  onNuevo,
}: DocumentoSoporteListaProps) {
  const { tab, setTab, tabCounts, registrosActuales, fromIfs, ifsConnected, ifsEmail } =
    useDocumentoSoporte();
  const [filters, setFilters] = useState<DocumentoSoporteFilterRule[]>([]);

  const filtrados = useMemo(
    () => applyDocumentoSoporteFilters(registrosActuales, filters),
    [registrosActuales, filters],
  );

  const handleTab = (next: "pendientes" | "historial") => {
    setTab(next);
    const allowed = new Set<string>(ESTADOS_POR_TAB[next]);
    setFilters((prev) => {
      const estado = prev.find((r) => r.column === "estado");
      if (!estado || estado.column !== "estado") return prev;
      const nextValues = estado.values.filter((v) => allowed.has(v));
      if (!nextValues.length) return removeFilterByColumn(prev, "estado");
      return prev.map((r) =>
        r.column === "estado" ? { ...r, values: nextValues } : r,
      );
    });
  };

  return (
    <div className="view-wide max-md:pb-24">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[#111]">Mis DSE</h1>
            <IfsConnectedChip
              surface="dse"
              connected={ifsConnected}
              fromIfs={fromIfs}
            />
          </div>
          <p className="mt-1 text-[13px] text-[#4b5563]">
            Solicita y consulta tus documentos de soporte
          </p>
        </div>
        <FloatingActions>
          <Button variant="primary" onClick={onNuevo}>
            <Icon name="plus" size="xs" />
            Nuevo DSE
          </Button>
        </FloatingActions>
      </div>

      <IfsStatusBanner
        surface="dse"
        loginNext="/documento-soporte"
        connected={ifsConnected}
        fromIfs={fromIfs}
        email={ifsEmail}
      />

      <DocumentoSoporteFilterBar
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

        <DocumentoSoporteTabla
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
