"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/src/components/ui/Button";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";
import { dataThWithAlign } from "@/src/components/ui/DataTable";

export function isoToDmyLabel(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type ColFilterThProps = {
  label: string;
  align?: string;
  active?: boolean;
  isOpen?: boolean;
  onOpen: (rect: DOMRect) => void;
};

export function ColFilterTh({
  label,
  align = "text-left",
  active = false,
  isOpen = false,
  onOpen,
}: ColFilterThProps) {
  const wrapClass =
    align === "text-center"
      ? "flex justify-center"
      : align === "text-right"
        ? "flex justify-end"
        : "flex justify-start";

  return (
    <th className={dataThWithAlign(align)}>
      <div className={wrapClass}>
        <button
          type="button"
          data-col-filter
          onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border-none px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
            isOpen
              ? "bg-navy text-white"
              : active
                ? "bg-[#e0ebf7] text-navy"
                : "bg-transparent text-muted hover:bg-[#e9eef5] hover:text-navy"
          }`}
        >
          {label}
          <DropdownChevron
            open={isOpen}
            className={isOpen ? "text-white" : "text-muted"}
          />
        </button>
      </div>
    </th>
  );
}

type ColFilterPopoverShellProps = {
  open: boolean;
  anchor: DOMRect | null;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function ColFilterPopoverShell({
  open,
  anchor,
  title,
  onClose,
  children,
}: ColFilterPopoverShellProps) {
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      const pop = popRef.current;
      if (!pop?.contains(e.target as Node)) {
        const btn = (e.target as Element).closest?.("[data-col-filter]");
        if (btn) return;
        onClose();
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  if (!open || !anchor || typeof document === "undefined") return null;

  const left = Math.max(8, Math.min(anchor.left, window.innerWidth - 240));
  const top = anchor.bottom + 8;

  return createPortal(
    <div
      ref={popRef}
      className="fixed z-[500] min-w-[220px] max-w-[280px] rounded-[11px] border border-[#e2e8f0] bg-white p-3"
      style={{ top, left }}
    >
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        {title}
      </div>
      {children}
    </div>,
    document.body,
  );
}

type ColFilterPopoverFooterProps = {
  onClear: () => void;
  onDone: () => void;
};

export function ColFilterPopoverFooter({
  onClear,
  onDone,
}: ColFilterPopoverFooterProps) {
  return (
    <div className="mt-2 flex items-center justify-between border-t border-[#f1f5f9] pt-2">
      <button
        type="button"
        onClick={onClear}
        className="cursor-pointer border-none bg-transparent px-1 text-[12px] text-muted hover:text-navy"
      >
        Limpiar
      </button>
      <Button
        variant="primary"
        className="!px-3 !py-1.5 !text-[12px]"
        onClick={onDone}
      >
        Listo
      </Button>
    </div>
  );
}

export function ColFilterTextSearch({
  value,
  placeholder,
  onChange,
  onClear,
  onDone,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  return (
    <>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border px-2.5 py-2 text-[13px] focus:border-navy focus:outline-none"
        autoFocus
      />
      <ColFilterPopoverFooter onClear={onClear} onDone={onDone} />
    </>
  );
}

export function ColFilterDateRange({
  fechaIni,
  fechaFin,
  onChange,
  onClear,
  onDone,
}: {
  fechaIni: string;
  fechaFin: string;
  onChange: (ini: string, fin: string) => void;
  onClear: () => void;
  onDone: () => void;
}) {
  const rangeLabel =
    fechaIni || fechaFin
      ? `${isoToDmyLabel(fechaIni) || "…"} – ${isoToDmyLabel(fechaFin) || "…"}`
      : "Selecciona un rango";

  return (
    <>
      <div className="mb-3 text-center text-[12.5px] font-semibold text-navy">
        {rangeLabel}
      </div>
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold text-muted">
          Desde
          <input
            type="date"
            value={fechaIni}
            onChange={(e) => {
              const ini = e.target.value;
              onChange(
                ini,
                fechaFin && ini > fechaFin ? ini : fechaFin,
              );
            }}
            className="mt-1 w-full rounded-lg border border-border px-2.5 py-2 text-[13px] focus:border-navy focus:outline-none"
          />
        </label>
        <label className="block text-[11px] font-semibold text-muted">
          Hasta
          <input
            type="date"
            value={fechaFin}
            min={fechaIni || undefined}
            onChange={(e) => onChange(fechaIni, e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-2.5 py-2 text-[13px] focus:border-navy focus:outline-none"
          />
        </label>
      </div>
      <ColFilterPopoverFooter onClear={onClear} onDone={onDone} />
    </>
  );
}

export function ColFilterMultiSelect({
  col,
  opciones,
  selected,
  onToggle,
  search,
  labelFn,
  iconFn,
}: {
  col: string;
  opciones: string[];
  selected: string[];
  onToggle: (val: string) => void;
  search?: boolean;
  labelFn?: (val: string) => string;
  iconFn?: (val: string) => IconName;
}) {
  const [searchQ, setSearchQ] = useState("");
  const q = searchQ.toLowerCase();
  const visibles = opciones.filter(
    (o) => !q || (labelFn ? labelFn(o) : o).toLowerCase().includes(q),
  );

  return (
    <>
      {search && (
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Buscar…"
          className="mb-2 w-full rounded-lg border border-border px-2.5 py-2 text-[12.5px] focus:border-navy focus:outline-none"
        />
      )}
      <div className="max-h-[196px] overflow-y-auto">
        {visibles.length === 0 ? (
          <div className="px-2 py-2 text-[12px] text-muted">Sin opciones</div>
        ) : (
          visibles.map((val) => {
            const on = selected.includes(val);
            return (
              <button
                key={`${col}-${val}`}
                type="button"
                onClick={() => onToggle(val)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12.5px] text-[#374151] hover:bg-[#f4f7fb]"
              >
                <Icon
                  name="checkSquare"
                  size="sm"
                  className={on ? "text-navy" : "text-[#c2c8d0]"}
                />
                {iconFn && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[#eef3f9] text-navy">
                    <Icon name={iconFn(val)} size="xs" />
                  </span>
                )}
                <span className="min-w-0 truncate">
                  {labelFn ? labelFn(val) : val}
                </span>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}

export function FiltrosActivosBar({
  active,
  onClearAll,
}: {
  active: boolean;
  onClearAll: () => void;
}) {
  if (!active) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-[#fafcff] px-4 py-2 text-[12px]">
      <span className="text-muted">Filtros de columna activos</span>
      <Button
        variant="tertiary"
        className="!px-2 !py-1 text-[11px]"
        onClick={onClearAll}
      >
        Limpiar filtros
      </Button>
    </div>
  );
}
