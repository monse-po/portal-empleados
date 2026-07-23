"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { DateRangePicker } from "@/src/components/ui/DateRangePicker";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { SelectControl } from "@/src/components/ui/DropdownAffordance";
import { FilterChainRow } from "@/src/components/ui/FilterChainRow";
import { Icon } from "@/src/components/ui/Icon";
import {
  buildFilterMultiOptions,
  FilterBarMultiDropdown,
  FilterBarTextInput,
  FilterBarTrigger,
  TableFilterSection,
  type FilterDropdownOption,
} from "@/src/components/ui/TableFilterBar";
import {
  createEmptyRule,
  getDistinctValues,
  getFilterColumnDef,
  getFilterColumns,
  getFilterForColumn,
  hayFiltrosActivos,
  isRuleComplete,
  isoToDmy,
  newFilterId,
  removeFilterByColumn,
  upsertFilterRule,
  type AproFilterColumn,
  type AproFilterRule,
  type HorasFilterOp,
} from "@/src/lib/aprobacion-filtros";
import { getTipoHoraMeta, TIPO_HORA } from "@/src/lib/mi-tiempo-mock";
import type { IconName } from "@/src/components/ui/Icon";
import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";

type AprobacionFilterBarProps = {
  registros: HojaAprobacion[];
  filters: AproFilterRule[];
  onChange: Dispatch<SetStateAction<AproFilterRule[]>>;
  tab: "pend" | "res";
  disabled?: boolean;
  embedded?: boolean;
};

function valueOptionIcon(column: AproFilterColumn, val: string): IconName {
  if (column === "tipo") return getTipoHoraMeta(val).icon;
  if (column === "estado") return val === "Aprobado" ? "check" : "x";
  return getFilterColumnDef(column).icon;
}

function multiOptions(
  column: "empleado" | "tipo" | "subproy" | "actividad" | "estado",
  registros: HojaAprobacion[],
): FilterDropdownOption[] {
  return buildFilterMultiOptions("tiempo", column, getDistinctValues(registros, column), (val) => ({
    label: column === "tipo" && TIPO_HORA[val]?.s ? TIPO_HORA[val].s : val,
    title: column === "tipo" ? TIPO_HORA[val]?.n : val,
    icon: valueOptionIcon(column, val),
  }));
}

function filterOperatorLabel(column: AproFilterColumn): string {
  switch (column) {
    case "comentario":
      return "contiene";
    case "fecha":
      return "entre";
    default:
      return "es";
  }
}

function useColumnFilterActions(
  column: AproFilterColumn,
  onChange: Dispatch<SetStateAction<AproFilterRule[]>>,
) {
  const toggleMulti = (val: string) => {
    const col = column as
      | "empleado"
      | "tipo"
      | "subproy"
      | "actividad"
      | "estado";
    onChange((prev) => {
      const rule = getFilterForColumn(prev, column);
      const current = rule?.column === col ? rule.values : [];
      const nextValues = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val];
      if (!nextValues.length) return removeFilterByColumn(prev, column);
      const base: Extract<AproFilterRule, { column: typeof col }> =
        rule?.column === col
          ? rule
          : (createEmptyRule(col) as Extract<
              AproFilterRule,
              { column: typeof col }
            >);
      return upsertFilterRule(prev, { ...base, values: nextValues });
    });
  };

  const setFecha = (from?: string, to?: string) => {
    if (!from && !to) {
      onChange((prev) => removeFilterByColumn(prev, column));
      return;
    }
    onChange((prev) => {
      const rule = getFilterForColumn(prev, column);
      const base: Extract<AproFilterRule, { column: "fecha" }> =
        rule?.column === "fecha"
          ? rule
          : (createEmptyRule("fecha") as Extract<
              AproFilterRule,
              { column: "fecha" }
            >);
      return upsertFilterRule(prev, { ...base, from, to });
    });
  };

  const setHoras = (patch: {
    op?: HorasFilterOp;
    value?: number;
    valueTo?: number;
  }) => {
    onChange((prev) => {
      const rule = getFilterForColumn(prev, column);
      const base: Extract<AproFilterRule, { column: "horas" }> =
        rule?.column === "horas"
          ? rule
          : { id: newFilterId(), column: "horas", op: "eq", value: 8 };
      return upsertFilterRule(prev, { ...base, ...patch });
    });
  };

  const setComentario = (text: string) => {
    if (!text.trim()) {
      onChange((prev) => removeFilterByColumn(prev, column));
      return;
    }
    onChange((prev) => {
      const rule = getFilterForColumn(prev, column);
      const base: Extract<AproFilterRule, { column: "comentario" }> =
        rule?.column === "comentario"
          ? rule
          : (createEmptyRule("comentario") as Extract<
              AproFilterRule,
              { column: "comentario" }
            >);
      return upsertFilterRule(prev, { ...base, text });
    });
  };

  return { toggleMulti, setFecha, setHoras, setComentario };
}

function ColumnBarControl({
  column,
  registros,
  filters,
  onChange,
  autoOpen = false,
}: {
  column: AproFilterColumn;
  registros: HojaAprobacion[];
  filters: AproFilterRule[];
  onChange: Dispatch<SetStateAction<AproFilterRule[]>>;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const existing = getFilterForColumn(filters, column);
  const { toggleMulti, setFecha, setHoras, setComentario } =
    useColumnFilterActions(column, onChange);

  if (
    column === "empleado" ||
    column === "tipo" ||
    column === "subproy" ||
    column === "actividad" ||
    column === "estado"
  ) {
    const values =
      existing &&
      (existing.column === "empleado" ||
        existing.column === "tipo" ||
        existing.column === "subproy" ||
        existing.column === "actividad" ||
        existing.column === "estado")
        ? existing.values
        : [];
    return (
      <FilterBarMultiDropdown
        options={multiOptions(column, registros)}
        selected={values}
        onToggle={toggleMulti}
        placeholder="elegir…"
        embedded
        defaultOpen={autoOpen}
        searchable={
          column === "subproy" ||
          column === "actividad" ||
          column === "empleado"
        }
        searchPlaceholder={
          column === "subproy"
            ? "Buscar subproyecto…"
            : column === "actividad"
              ? "Buscar actividad…"
              : "Buscar empleado…"
        }
      />
    );
  }

  if (column === "fecha") {
    const f = existing?.column === "fecha" ? existing : undefined;
    const from = f?.from ? isoToDmy(f.from) : "";
    const to = f?.to ? isoToDmy(f.to) : "";
    const display =
      from && to
        ? `${from} – ${to}`
        : from
          ? `desde ${from}`
          : to
            ? `hasta ${to}`
            : undefined;
    return (
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        portal
        fitContent
        menuClassName="w-[252px] overflow-hidden border-border p-0 shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
        trigger={
          <FilterBarTrigger
            active={!!display}
            isOpen={open}
            displayValue={display}
            placeholder="elegir…"
            embedded
            onClick={() => setOpen((o) => !o)}
          />
        }
      >
        <DateRangePicker
          from={f?.from}
          to={f?.to}
          onChange={setFecha}
          onRangeComplete={() => setOpen(false)}
          compact
        />
      </Dropdown>
    );
  }

  if (column === "horas") {
    const h =
      existing?.column === "horas"
        ? existing
        : { op: "eq" as const, value: 8, valueTo: 8 };
    const display =
      existing?.column === "horas"
        ? h.op === "between"
          ? `${h.value}–${h.valueTo ?? h.value}`
          : `${h.op === "eq" ? "=" : h.op === "gte" ? "≥" : "≤"} ${h.value}`
        : undefined;
    return (
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        portal
        menuClassName="shadow-none min-w-[200px]"
        trigger={
          <FilterBarTrigger
            active={!!display}
            isOpen={open}
            displayValue={display}
            placeholder="elegir…"
            embedded
            onClick={() => setOpen((o) => !o)}
          />
        }
      >
        <div className="space-y-2 p-1">
          <SelectControl
            value={h.op}
            onChange={(e) => setHoras({ op: e.target.value as HorasFilterOp })}
            className="h-8 cursor-pointer rounded-[6px] border border-border bg-white px-2 text-[13px] focus:border-navy focus:outline-none"
          >
            <option value="eq">=</option>
            <option value="gte">≥</option>
            <option value="lte">≤</option>
            <option value="between">entre</option>
          </SelectControl>
          <input
            type="number"
            min={0}
            step={0.5}
            value={h.value}
            onChange={(e) =>
              setHoras({ value: parseFloat(e.target.value) || 0 })
            }
            className="h-8 w-full rounded-[6px] border border-border px-2 text-[13px] focus:border-navy focus:outline-none"
          />
          {h.op === "between" && (
            <input
              type="number"
              min={0}
              step={0.5}
              value={h.valueTo ?? h.value}
              onChange={(e) =>
                setHoras({ valueTo: parseFloat(e.target.value) || 0 })
              }
              className="h-8 w-full rounded-[6px] border border-border px-2 text-[13px] focus:border-navy focus:outline-none"
              placeholder="Hasta"
            />
          )}
        </div>
      </Dropdown>
    );
  }

  const text = existing?.column === "comentario" ? existing.text : "";
  return (
    <FilterBarTextInput
      value={text}
      placeholder="texto…"
      onChange={setComentario}
      embedded
    />
  );
}

const QUICK_FILTER_COLUMNS: AproFilterColumn[] = ["empleado", "fecha", "subproy"];

function getScrollContainer(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector("main.overflow-y-auto");
}

function preserveScroll(action: () => void) {
  const scrollEl = getScrollContainer();
  const scrollTop = scrollEl?.scrollTop ?? window.scrollY;
  action();
  requestAnimationFrame(() => {
    if (scrollEl) scrollEl.scrollTop = scrollTop;
    else window.scrollTo({ top: scrollTop, behavior: "auto" });
  });
}

export function AprobacionFilterBar({
  registros,
  filters,
  onChange,
  tab,
  disabled = false,
  embedded = false,
}: AprobacionFilterBarProps) {
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [barColumns, setBarColumns] = useState<AproFilterColumn[]>([]);
  const [autoOpenColumn, setAutoOpenColumn] = useState<AproFilterColumn | null>(
    null,
  );

  const columns = getFilterColumns(tab);
  const usedColumns = new Set(
    filters.filter(isRuleComplete).map((f) => f.column),
  );

  const pickColumn = (col: AproFilterColumn) => {
    preserveScroll(() => {
      setColumnMenuOpen(false);
      setBarColumns((prev) => (prev.includes(col) ? prev : [...prev, col]));
      setAutoOpenColumn(col);
    });
  };

  const removeBarColumn = (col: AproFilterColumn) => {
    setBarColumns((prev) => prev.filter((c) => c !== col));
    onChange((prev) => removeFilterByColumn(prev, col));
    if (autoOpenColumn === col) setAutoOpenColumn(null);
  };

  const clearAll = () => {
    setBarColumns([]);
    onChange([]);
    setAutoOpenColumn(null);
  };

  return (
    <TableFilterSection embedded={embedded} sticky={false}>
      <div className={`space-y-2.5 ${disabled ? "pointer-events-none opacity-45" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            <Icon name="filter" size="xs" />
            Filtros
          </span>

          {barColumns.map((col) => {
            const def = getFilterColumnDef(col);
            const active =
              !!getFilterForColumn(filters, col) && usedColumns.has(col);
            return (
              <FilterChainRow
                key={col}
                label={def.label}
                icon={def.icon}
                operator={filterOperatorLabel(col)}
                active={active || !!getFilterForColumn(filters, col)}
                onRemove={() => removeBarColumn(col)}
              >
                <ColumnBarControl
                  column={col}
                  registros={registros}
                  filters={filters}
                  onChange={onChange}
                  autoOpen={autoOpenColumn === col}
                />
              </FilterChainRow>
            );
          })}

          {!disabled && barColumns.length === 0 ? (
            <>
              {QUICK_FILTER_COLUMNS.filter((col) =>
                columns.some((c) => c.id === col),
              ).map((col) => {
                const def = getFilterColumnDef(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => pickColumn(col)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-[6px] border border-[#e5e9f0] bg-white px-2.5 py-1 text-[12px] font-medium text-[#374151] hover:border-navy hover:bg-[#f4f7fb]"
                  >
                    <Icon name={def.icon} size="xs" className="text-navy" />
                    {def.label}
                  </button>
                );
              })}
              <span className="text-[12px] text-muted">o</span>
            </>
          ) : null}

          <Dropdown
            open={columnMenuOpen}
            onOpenChange={setColumnMenuOpen}
            portal
            menuClassName="shadow-[0_4px_16px_rgba(0,0,0,0.10)] min-w-[220px] border-[#E5E7EB] py-1"
            trigger={
              <button
                type="button"
                onClick={() => setColumnMenuOpen((o) => !o)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-[6px] border border-dashed border-[#c7d9ed] bg-white px-2.5 py-1 text-[12px] font-semibold text-navy hover:border-navy hover:bg-[#f4f7fb]"
              >
                <Icon name="plus" size="xs" />
                {barColumns.length === 0 ? "Más filtros" : "Agregar filtro"}
              </button>
            }
          >
            <div className="py-0">
              {columns.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => pickColumn(col.id)}
                  className="flex h-[34px] w-full cursor-pointer items-center gap-2.5 rounded-[6px] px-2.5 text-left text-[14px] font-normal text-[#1F2937] hover:bg-[#F3F4F6]"
                >
                  <Icon
                    name={col.icon}
                    size="sm"
                    className="h-4 w-4 shrink-0 text-navy"
                  />
                  <span className="min-w-0 truncate">{col.label}</span>
                </button>
              ))}
            </div>
          </Dropdown>

          {hayFiltrosActivos(filters) && (
            <button
              type="button"
              onClick={clearAll}
              className="cursor-pointer border-none bg-transparent px-1 text-[12px] font-semibold text-muted hover:text-navy"
            >
              Limpiar todo
            </button>
          )}
        </div>
      </div>
    </TableFilterSection>
  );
}
