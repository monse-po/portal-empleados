"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/src/components/ui/Card";
import { ProyectoCell } from "@/src/components/ui/DataTable";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";
import { Icon } from "@/src/components/ui/Icon";
import type { HorasProyectoAprobacion } from "@/src/lib/ifs/tiempo-approval";
import { formatHorasValor } from "@/src/lib/tiempo-schedule";

function tieneCola(p: HorasProyectoAprobacion): boolean {
  return p.pendienteIds.length > 0;
}

export function sortProyectosInbox(
  proyectos: HorasProyectoAprobacion[],
): HorasProyectoAprobacion[] {
  return [...proyectos].sort((a, b) => {
    const byCola = Number(tieneCola(b)) - Number(tieneCola(a));
    if (byCola !== 0) return byCola;
    if (b.horasPendientes !== a.horasPendientes) {
      return b.horasPendientes - a.horasPendientes;
    }
    return a.codigo.localeCompare(b.codigo, "es");
  });
}

function HorasProyecto({
  horas,
  listo,
}: {
  horas: number;
  listo?: boolean;
}) {
  return (
    <span
      className={`min-w-[2.5rem] text-right text-[12px] font-bold tabular-nums ${
        listo ? "text-green" : "text-navy"
      }`}
      title={listo ? "Sin horas por aprobar" : "Horas del proyecto"}
    >
      {formatHorasValor(horas)}h
    </span>
  );
}

function ProyectoRow({
  proyecto,
  selected,
  onSelect,
}: {
  proyecto: HorasProyectoAprobacion;
  selected: boolean;
  onSelect: (codigo: string) => void;
}) {
  const cola = tieneCola(proyecto);

  return (
    <button
      type="button"
      onClick={() => onSelect(proyecto.codigo)}
      className={`flex w-full cursor-pointer items-center gap-2.5 border-b border-[#e5e9f0] px-3.5 py-2.5 text-left last:border-b-0 ${
        selected
          ? "bg-[#c7d9ed]"
          : "bg-white hover:bg-[#fafbfc]"
      }`}
      aria-current={selected ? "true" : undefined}
    >
      <span className="min-w-0 flex-1">
        <ProyectoCell codigo={proyecto.codigo} nombre={proyecto.nombre} />
      </span>
      <HorasProyecto horas={proyecto.horasAcumuladas} listo={!cola} />
    </button>
  );
}

type AprobacionProyectosListaProps = {
  proyectos: HorasProyectoAprobacion[];
  selectedCodigo: string | null;
  onSelect: (codigo: string) => void;
  loaded: boolean;
};

export function AprobacionProyectosLista({
  proyectos,
  selectedCodigo,
  onSelect,
  loaded,
}: AprobacionProyectosListaProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const ordenados = sortProyectosInbox(proyectos);
  const seleccionado = ordenados.find((p) => p.codigo === selectedCodigo);

  const renderFilas = (closePicker = false) =>
    ordenados.map((p) => (
      <ProyectoRow
        key={p.codigo}
        proyecto={p}
        selected={p.codigo === selectedCodigo}
        onSelect={(codigo) => {
          onSelect(codigo);
          if (closePicker) setPickerOpen(false);
        }}
      />
    ));

  const lista = !loaded ? (
    <div className="space-y-2 px-3.5 py-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-[#e5e9f0]" />
      ))}
    </div>
  ) : !ordenados.length ? (
    <p className="px-3.5 py-8 text-center text-[13px] text-muted">
      Sin proyectos en la bandeja.
    </p>
  ) : (
    <div className="max-h-[min(70vh,640px)] overflow-y-auto">{renderFilas()}</div>
  );

  return (
    <>
      <div className="lg:hidden">
        <Dropdown
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          portal
          menuClassName="min-w-[min(100vw-24px,360px)] shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
          trigger={
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Proyecto
                </span>
                <span className="mt-0.5 block truncate text-[13px] font-semibold text-navy">
                  {seleccionado ? seleccionado.codigo : "Elegir proyecto…"}
                </span>
              </span>
              {seleccionado ? (
                <HorasProyecto
                  horas={seleccionado.horasAcumuladas}
                  listo={!tieneCola(seleccionado)}
                />
              ) : null}
              <DropdownChevron open={pickerOpen} />
            </button>
          }
        >
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {renderFilas(true)}
          </div>
        </Dropdown>
      </div>

      <Card className="mb-0 hidden overflow-hidden p-0 lg:block">
        <CardHeader className="px-3.5 py-3">
          <span className="flex items-center gap-2">
            <Icon name="folderOpen" size="sm" />
            Proyectos
          </span>
        </CardHeader>
        {lista}
      </Card>
    </>
  );
}
