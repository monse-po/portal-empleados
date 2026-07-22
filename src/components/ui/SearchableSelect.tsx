"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/src/components/ui/Icon";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";

export type SearchableSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** Estilos del trigger (p. ej. ant-field-input). */
  className?: string;
  /** Layout del contenedor (p. ej. min-w-[220px]). */
  wrapperClassName?: string;
  emptyMessage?: string;
};

export function optionsFromStrings(items: readonly string[]): SearchableSelectOption[] {
  return items.map((item) => ({ value: item, label: item }));
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Buscar...",
  disabled = false,
  error = false,
  className = "",
  wrapperClassName = "",
  emptyMessage = "Sin resultados",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return options;
    return options.filter((opt) => {
      const haystack = [opt.value, opt.label, opt.hint ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const triggerClass = className
    ? [
        "flex w-full cursor-pointer items-center justify-between gap-2 text-left text-[13px] transition-colors",
        className,
        selected ? "border-navy bg-[#eef3f9]" : "bg-white hover:border-[#c7d2e0]",
        error ? "!border-red" : "",
        disabled ? "cursor-not-allowed opacity-55" : "",
      ]
        .filter(Boolean)
        .join(" ")
    : [
        "flex h-9 w-full cursor-pointer items-center justify-between rounded-[5px] border px-2.5 text-left text-[13px] transition-colors",
        error
          ? "border-red"
          : selected
            ? "border-navy bg-[#eef3f9]"
            : "border-border bg-white hover:border-[#c7d2e0]",
        disabled ? "cursor-not-allowed opacity-55" : "",
      ].join(" ");

  return (
    <div
      ref={wrapRef}
      className={`relative w-full ${wrapperClassName}`.trim()}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={triggerClass}
      >
        <span
          className={`min-w-0 truncate ${selected ? "font-medium text-navy" : "text-muted"}`}
        >
          {selected?.label ?? placeholder}
        </span>
        <DropdownChevron />
      </button>

      {open && !disabled ? (
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
              <div className="px-3 py-3 text-[12px] text-muted">{emptyMessage}</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQ("");
                  }}
                  className={`flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2 text-left hover:bg-[#f5f7fa] ${
                    value === opt.value ? "bg-[#eef3f9]" : ""
                  }`}
                >
                  <span className="text-[12.5px] font-medium text-[#374151]">
                    {opt.label}
                  </span>
                  {opt.hint ? (
                    <span className="text-[11px] text-[#9ca3af]">{opt.hint}</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
