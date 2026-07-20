"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/src/components/ui/Icon";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";
import type { LovItem } from "@/src/lib/mis-anticipos-mock";

type LovPickerProps = {
  value: LovItem | null;
  onChange: (item: LovItem | null) => void;
  items: LovItem[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  valueLabel?: (item: LovItem) => string;
};

export function LovPicker({
  value,
  onChange,
  items,
  placeholder,
  searchPlaceholder = "Buscar...",
  disabled = false,
  error = false,
  valueLabel,
}: LovPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (it) =>
        it.id.toLowerCase().includes(query) ||
        it.nombre.toLowerCase().includes(query) ||
        it.sub.toLowerCase().includes(query),
    );
  }, [items, q]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex h-9 w-full cursor-pointer items-center justify-between rounded-[5px] border px-2.5 text-left text-[13px] transition-colors ${
          error
            ? "border-red"
            : value
              ? "border-navy bg-[#eef3f9]"
              : "border-border bg-white hover:border-[#c7d2e0]"
        } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
      >
        <span className={value ? "font-medium text-navy" : "text-muted"}>
          {value
            ? (valueLabel?.(value) ?? `${value.id} · ${value.nombre}`)
            : placeholder}
        </span>
        <DropdownChevron />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+3px)] z-[200] overflow-hidden rounded-lg border border-border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
          <div className="flex items-center gap-2 border-b border-[#f3f4f6] px-2.5 py-2">
            <Icon name="search" size="xs" className="text-[#9ca3af]" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 border-0 text-[12.5px] outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-[12px] text-muted">Sin resultados</div>
            ) : (
              filtered.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    onChange(it);
                    setOpen(false);
                    setQ("");
                  }}
                  className={`flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2 text-left hover:bg-[#f5f7fa] ${
                    value?.id === it.id ? "bg-[#eef3f9]" : ""
                  }`}
                >
                  <span className="font-mono text-[11px] font-bold text-navy">
                    {it.id}
                  </span>
                  <span className="text-[12.5px] font-medium text-[#374151]">
                    {it.nombre}
                  </span>
                  <span className="text-[11px] text-[#9ca3af]">{it.sub}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
