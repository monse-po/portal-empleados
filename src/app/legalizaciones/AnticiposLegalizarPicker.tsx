"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/src/components/ui/Icon";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";
import type { AnticipoLegalizable } from "@/src/lib/legalizaciones-mock";
import { formatMonto } from "@/src/lib/mis-anticipos-mock";

type AnticiposLegalizarPickerProps = {
  anticipos: AnticipoLegalizable[];
  value: string;
  onChange: (no: string) => void;
};

function AnticipoOption({
  anticipo,
  selected,
  onSelect,
}: {
  anticipo: AnticipoLegalizable;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2 text-left hover:bg-[#f5f7fa] ${
        selected ? "bg-[#eef3f9]" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] font-bold text-navy">
          {anticipo.no}
        </span>
        <span className="shrink-0 text-[12.5px] font-semibold text-[#374151]">
          {formatMonto(anticipo.monto, anticipo.div)}
        </span>
      </div>
      <span
        className="truncate text-[11.5px] text-[#6b7280]"
        title={`${anticipo.proy} · ${anticipo.proyN}`}
      >
        {anticipo.proy} · {anticipo.proyN}
      </span>
      <span className="text-[11px] text-muted">
        Pagado {anticipo.fechaPago ?? "—"}
      </span>
    </button>
  );
}

export function AnticiposLegalizarPicker({
  anticipos,
  value,
  onChange,
}: AnticiposLegalizarPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => anticipos.find((a) => a.no === value) ?? null,
    [anticipos, value],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return anticipos;
    return anticipos.filter(
      (a) =>
        a.no.toLowerCase().includes(query) ||
        a.proy.toLowerCase().includes(query) ||
        a.proyN.toLowerCase().includes(query) ||
        (a.fechaPago?.toLowerCase().includes(query) ?? false),
    );
  }, [anticipos, q]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!anticipos.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#c7d9ed] bg-[#f8fafc] px-4 py-6 text-center text-[13px] text-muted">
        <Icon name="wallet" size="lg" className="mx-auto mb-2 opacity-30" />
        No tienes anticipos pagados por Tesorería pendientes de legalizar.
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`ant-field-input flex w-full cursor-pointer items-center justify-between gap-2 px-2.5 text-left ${
          selected ? "border-navy bg-[#eef3f9]" : "bg-white hover:border-[#c7d2e0]"
        }`}
      >
        {selected ? (
          <span className="flex min-w-0 items-baseline gap-1 truncate">
            <span className="shrink-0 font-mono text-[11px] font-bold text-navy">
              {selected.no}
            </span>
            <span className="truncate text-[13px] text-[#374151]">
              {formatMonto(selected.monto, selected.div)} · {selected.proy}
            </span>
          </span>
        ) : (
          <span className="text-muted">Seleccionar anticipo pagado…</span>
        )}
        <DropdownChevron open={open} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+3px)] z-[200] overflow-hidden rounded-lg border border-border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
          {anticipos.length > 4 ? (
            <div className="flex items-center gap-2 border-b border-[#f3f4f6] px-2.5 py-2">
              <Icon name="search" size="xs" className="shrink-0 text-[#9ca3af]" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] outline-none"
                autoFocus
              />
            </div>
          ) : null}
          <div className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-[12px] text-muted">Sin resultados</div>
            ) : (
              filtered.map((a) => (
                <AnticipoOption
                  key={a.no}
                  anticipo={a}
                  selected={value === a.no}
                  onSelect={() => {
                    onChange(a.no);
                    setOpen(false);
                    setQ("");
                  }}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
