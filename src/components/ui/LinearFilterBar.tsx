"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import type { FilterDropdownOption } from "@/src/components/ui/TableFilterBar";

export type LinearFilterField = {
  id: string;
  label: string;
  icon: IconName;
};

export function useFilterAddState<T extends string>(resetKey?: string) {
  const [open, setOpen] = useState(false);
  const [column, setColumn] = useState<T | null>(null);

  useEffect(() => {
    setOpen(false);
    setColumn(null);
  }, [resetKey]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setColumn(null);
  };

  return {
    open,
    column,
    onOpenChange,
    pick: (id: T) => setColumn(id),
    back: () => setColumn(null),
    close: () => {
      setOpen(false);
      setColumn(null);
    },
  };
}

export function linearFechaChip(
  from: string | undefined,
  to: string | undefined,
  format: (iso: string) => string,
): ReactNode {
  const fromLbl = from ? format(from) : "";
  const toLbl = to ? format(to) : "";
  const text =
    fromLbl && toLbl
      ? `${fromLbl} – ${toLbl}`
      : fromLbl
        ? `desde ${fromLbl}`
        : toLbl
          ? `hasta ${toLbl}`
          : "";
  if (!text) return null;
  return <span className="text-[12px] font-medium text-[#111]">{text}</span>;
}

export function linearTextChip(text: string): ReactNode {
  if (!text.trim()) return null;
  return (
    <span className="max-w-[140px] truncate text-[12px] font-medium text-[#111]">
      {text}
    </span>
  );
}

export function linearChipValue(
  values: string[],
  options: FilterDropdownOption[],
): ReactNode {
  const selected = values
    .map((val) => options.find((o) => o.value === val))
    .filter(Boolean) as FilterDropdownOption[];
  if (!selected.length) return null;
  const first = selected[0];
  const extra = selected.length - 1;
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {first.renderChip ? (
        first.renderChip
      ) : (
        <span className="max-w-[140px] truncate text-[12px] font-medium text-[#111]">
          {first.label}
        </span>
      )}
      {extra > 0 ? (
        <span className="text-[11px] font-semibold text-muted">+{extra}</span>
      ) : null}
    </span>
  );
}

export function FilterChipShell({
  label,
  icon,
  operator,
  value,
  onRemove,
  fitContent = false,
  children,
}: {
  label: string;
  icon: IconName;
  operator: string;
  value: ReactNode;
  onRemove: () => void;
  fitContent?: boolean;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-full border border-[#d8dee8] bg-white">
      <span className="flex items-center gap-1.5 border-r border-[#e5e9f0] bg-[#f4f7fb] px-2.5 py-1">
        <Icon name={icon} size="xs" className="shrink-0 text-navy" />
        <span className="shrink-0 text-[12px] font-medium text-[#374151]">
          {label}
        </span>
      </span>
      <span className="flex items-center border-r border-[#e5e9f0] px-2 py-1 text-[12px] text-muted">
        {operator}
      </span>
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        portal
        fitContent={fitContent}
        menuClassName={
          fitContent
            ? "border-border p-0 shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
            : "min-w-[240px] shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
        }
        trigger={
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex min-w-0 cursor-pointer items-center gap-1 px-2.5 py-1 text-left hover:bg-[#f4f7fb]"
          >
            {value}
          </button>
        }
      >
        {children(() => setOpen(false))}
      </Dropdown>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex shrink-0 cursor-pointer items-center border-l border-[#e5e9f0] px-2 text-muted hover:bg-[#f4f7fb] hover:text-navy"
        aria-label={`Quitar filtro ${label}`}
      >
        <Icon name="x" size="xs" />
      </button>
    </div>
  );
}

export function FilterFieldPicker({
  fields,
  onPick,
  onClose,
}: {
  fields: LinearFilterField[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const filtered = fields.filter((col) =>
    col.label.toLowerCase().includes(q.trim().toLowerCase()),
  );

  useEffect(() => {
    searchRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-center gap-2 border-b border-[#f3f4f6] px-2.5 py-2">
        <Icon name="search" size="xs" className="text-[#9ca3af]" />
        <input
          ref={searchRef}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filtered[0]) {
              e.preventDefault();
              onPick(filtered[0].id);
            }
          }}
          placeholder="Filtrar por…"
          className="min-w-0 flex-1 border-0 text-[12px] outline-none"
        />
      </div>
      <div className="py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-[12px] text-muted">Sin resultados</div>
        ) : (
          filtered.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => onPick(col.id)}
              className="flex h-[34px] w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 text-left text-[13px] text-[#1F2937] hover:bg-[#F3F4F6]"
            >
              <Icon
                name={col.icon}
                size="sm"
                className="h-4 w-4 shrink-0 text-navy"
              />
              <span className="min-w-0 truncate">{col.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function FilterAddMenu({
  fields,
  stepLabel,
  fitContent = false,
  children,
}: {
  fields: LinearFilterField[];
  stepLabel?: string;
  fitContent?: boolean;
  children: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onPickField: (id: string) => void;
    onBack: () => void;
    panel: ReactNode | null;
  };
}) {
  const { open, onOpenChange, onPickField, onBack, panel } = children;

  return (
    <Dropdown
      open={open}
      onOpenChange={onOpenChange}
      portal
      fitContent={fitContent}
      menuClassName={
        fitContent
          ? "border-border p-0 shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
          : "min-w-[260px] border-[#E5E7EB] py-0 shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
      }
      trigger={
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] border border-dashed border-[#c7d9ed] bg-white px-2.5 py-1 text-[12px] font-semibold text-navy hover:border-navy hover:bg-[#f4f7fb]"
        >
          <Icon name="plus" size="xs" />
          Filtro
        </button>
      }
    >
      {panel ? (
        <div
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onBack();
            }
          }}
        >
          <button
            type="button"
            onClick={onBack}
            className="flex w-full cursor-pointer items-center gap-2 border-b border-[#f3f4f6] px-2.5 py-2 text-left text-[12px] font-medium text-navy hover:bg-[#f4f7fb]"
          >
            <Icon name="chevronLeft" size="xs" />
            {stepLabel ?? "Filtro"}
          </button>
          {panel}
        </div>
      ) : (
        <FilterFieldPicker
          fields={fields}
          onPick={onPickField}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dropdown>
  );
}

export function LinearFilterToolbar({
  hideLabel = false,
  chips,
  add,
  hasFilters,
  onClear,
  actions,
}: {
  hideLabel?: boolean;
  chips: ReactNode;
  add: ReactNode;
  hasFilters: boolean;
  onClear: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {hideLabel ? null : (
          <span className="shrink-0 text-[13px] font-medium text-[#374151]">
            Filtrar por:
          </span>
        )}
        {chips}
        {add}
        {hasFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer border-none bg-transparent px-1 text-[12px] font-semibold text-muted hover:text-navy"
          >
            Limpiar
          </button>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
