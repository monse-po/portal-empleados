"use client";

import { useState, type ReactNode } from "react";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";
import { Icon, type IconName } from "@/src/components/ui/Icon";

export function TableFilterSection({ children }: { children: ReactNode }) {
  return (
    <section className="sticky top-0 z-20 mb-3.5 rounded-xl border border-border bg-white px-[18px] py-3">
      {children}
    </section>
  );
}

export function TableFilterBar({
  children,
  hasActive,
  onClearAll,
}: {
  children: ReactNode;
  hasActive: boolean;
  onClearAll: () => void;
}) {
  return (
    <div className="flex items-center gap-x-3">
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
        <Icon name="filter" size="xs" />
        Filtros
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      {hasActive && (
        <button
          type="button"
          onClick={onClearAll}
          className="shrink-0 cursor-pointer border-none bg-transparent px-1 text-[12px] font-semibold text-muted hover:text-navy"
        >
          Limpiar todo
        </button>
      )}
    </div>
  );
}

export function FilterBarField({
  label,
  icon,
  active = false,
  children,
}: {
  label: string;
  icon: IconName;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex shrink-0 items-center gap-1.5 rounded-[7px] border border-transparent py-1 pl-2 pr-1 ${
        active ? "border-[#c7d9ed] bg-[#e0ebf7]" : "bg-white"
      }`}
    >
      <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted">
        <Icon name={icon} size="xs" className="text-navy" />
        {label}
      </span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

export function FilterOptionChip({
  icon,
  label,
  selected = false,
  onToggle,
  title,
}: {
  icon: IconName;
  label: string;
  selected?: boolean;
  onToggle: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onToggle}
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold transition-colors ${
        selected
          ? "bg-navy text-white"
          : "border border-border bg-white text-[#374151] hover:border-[#c7d9ed] hover:bg-[#f4f7fb]"
      }`}
    >
      <Icon name={icon} size="xs" className={selected ? "opacity-100" : "opacity-70"} />
      <span>{label}</span>
    </button>
  );
}

export type FilterDropdownOption = {
  value: string;
  label: string;
  title?: string;
  icon: IconName;
};

export function FilterBarMultiDropdown({
  options,
  selected,
  onToggle,
  placeholder = "Todos",
  compactTrigger = false,
  embedded = false,
  defaultOpen = false,
}: {
  options: FilterDropdownOption[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
  /** Valores en el trigger (sin chips sueltos) — estilo "Columna es: valor" */
  compactTrigger?: boolean;
  /** Sin borde propio — segmento horizontal del filtro */
  embedded?: boolean;
  /** Abrir el dropdown al montar (p. ej. al elegir columna) */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const selectedSet = new Set(selected);
  const active = selected.length > 0;

  const triggerLabel = (() => {
    if (!compactTrigger && active) return placeholder;
    if (!active) return placeholder;
    const first = options.find((o) => o.value === selected[0]);
    if (!first) return placeholder;
    if (selected.length === 1) return first.label;
    return `${first.label}, +${selected.length - 1}`;
  })();

  return (
    <div className="flex items-center gap-1">
      {!compactTrigger &&
        selected.map((val) => {
          const opt = options.find((o) => o.value === val);
          if (!opt) return null;
          return (
            <FilterOptionChip
              key={val}
              icon={opt.icon}
              label={opt.label}
              title={opt.title}
              selected
              onToggle={() => onToggle(val)}
            />
          );
        })}
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        portal
        menuClassName="shadow-none min-w-[220px]"
        trigger={
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`inline-flex shrink-0 cursor-pointer items-center gap-1 px-2 py-1 text-[12px] font-medium transition-colors ${
              embedded
                ? "max-w-[200px] border-none bg-transparent text-[#374151] hover:bg-[#f4f7fb]"
                : open
                  ? "rounded-[6px] border border-navy bg-navy text-white"
                  : active
                    ? "rounded-[6px] border border-[#c7d9ed] bg-white text-navy"
                    : "rounded-[6px] border border-border bg-white text-[#374151] hover:border-[#c7d9ed] hover:bg-[#f4f7fb]"
            }`}
          >
            <span className="max-w-[180px] truncate">{triggerLabel}</span>
            <DropdownChevron
              open={open}
              className={open ? "text-white" : "text-muted"}
            />
          </button>
        }
      >
        {options.map((opt) => {
          const on = selectedSet.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 text-left text-[12.5px] text-[#374151] hover:bg-[#f4f7fb]"
            >
              <Icon
                name="checkSquare"
                size="sm"
                className={on ? "text-navy" : "text-[#c2c8d0]"}
              />
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] bg-[#eef3f9] text-navy">
                <Icon name={opt.icon} size="xs" />
              </span>
              <span className="min-w-0 truncate" title={opt.title ?? opt.label}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </Dropdown>
    </div>
  );
}

export function FilterBarTrigger({
  active = false,
  isOpen = false,
  displayValue,
  placeholder = "Todos",
  leadingIcon,
  onClick,
  embedded = false,
}: {
  active?: boolean;
  isOpen?: boolean;
  displayValue?: string;
  placeholder?: string;
  leadingIcon?: IconName;
  onClick: (rect: DOMRect) => void;
  embedded?: boolean;
}) {
  const text = displayValue || placeholder;

  return (
    <button
      type="button"
      data-col-filter
      onClick={(e) => onClick(e.currentTarget.getBoundingClientRect())}
      className={`inline-flex max-w-[200px] cursor-pointer items-center gap-1 px-2 py-1 text-[12px] font-medium transition-colors ${
        embedded
          ? "border-none bg-transparent text-[#374151] hover:bg-[#f4f7fb]"
          : isOpen
            ? "rounded-[6px] border border-navy bg-navy text-white"
            : active
              ? "rounded-[6px] border border-[#c7d9ed] text-navy"
              : "rounded-[6px] border border-border bg-white text-[#374151] hover:border-[#c7d9ed] hover:bg-[#f4f7fb]"
      }`}
    >
      {leadingIcon && (
        <Icon
          name={leadingIcon}
          size="xs"
          className={isOpen ? "opacity-100" : "opacity-80"}
        />
      )}
      <span className="min-w-0 truncate">{text}</span>
      <DropdownChevron
        open={isOpen}
        className={isOpen ? "text-white" : "text-muted"}
      />
    </button>
  );
}

export function FilterBarTextInput({
  value,
  placeholder,
  onChange,
  embedded = false,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  embedded?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-7 min-w-[120px] px-2 text-[12px] focus:border-navy focus:outline-none ${
        embedded
          ? "border-none bg-transparent focus:ring-0"
          : "rounded-[6px] border border-border bg-white"
      }`}
    />
  );
}
