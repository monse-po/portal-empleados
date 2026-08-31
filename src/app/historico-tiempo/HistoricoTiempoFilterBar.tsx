"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { DateRangePicker } from "@/src/components/ui/DateRangePicker";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { FilterChainRow } from "@/src/components/ui/FilterChainRow";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import {
  FilterBarMultiDropdown,
  FilterBarTrigger,
  TableFilterSection,
  type FilterDropdownOption,
} from "@/src/components/ui/TableFilterBar";
import {
  createEmptyRule,
  getDistinctValues,
  getFilterColumnDef,
  HISTORICO_FILTER_COLUMNS,
  getFilterForColumn,
  hayFiltrosActivos,
  isRuleComplete,
  isoToDmy,
  proyectoFilterLabel,
  proyectoFilterTitle,
  removeFilterByColumn,
  upsertFilterRule,
  type HistoricoFilterColumn,
  type HistoricoFilterRule,
} from "@/src/lib/historico-tiempo-filtros";
import type { RegistroMock } from "@/src/lib/mi-tiempo-mock";

type HistoricoTiempoFilterBarProps = {
  registros: RegistroMock[];
  filters: HistoricoFilterRule[];
  onChange: Dispatch<SetStateAction<HistoricoFilterRule[]>>;
  shown?: number;
  total?: number;
};

function filterOperatorLabel(column: HistoricoFilterColumn): string {
  if (column === "fecha") return "entre";
  return "es";
}

function multiOptions(
  column: "proyecto" | "subproyecto",
  registros: RegistroMock[],
): FilterDropdownOption[] {
  if (column === "proyecto") {
    return getDistinctValues(registros, "proyecto").map((proyId) => ({
      value: proyId,
      label: proyectoFilterTitle(proyId),
      title: `${proyectoFilterLabel(proyId)} · ${proyectoFilterTitle(proyId)}`,
      icon: "folderOpen" as IconName,
    }));
  }

  return getDistinctValues(registros, column).map((val) => ({
    value: val,
    label: val,
    icon: "flag" as IconName,
  }));
}

function useColumnFilterActions(
  column: HistoricoFilterColumn,
  onChange: Dispatch<SetStateAction<HistoricoFilterRule[]>>,
) {
  const toggleMulti = (val: string) => {
    const col = column as "proyecto" | "subproyecto";
    onChange((prev) => {
      const rule = getFilterForColumn(prev, column);
      const current = rule?.column === col ? rule.values : [];
      const nextValues = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val];
      if (!nextValues.length) return removeFilterByColumn(prev, column);
      const base: Extract<HistoricoFilterRule, { column: typeof col }> =
        rule?.column === col
          ? rule
          : (createEmptyRule(col) as Extract<
              HistoricoFilterRule,
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
      const base: Extract<HistoricoFilterRule, { column: "fecha" }> =
        rule?.column === "fecha"
          ? rule
          : (createEmptyRule("fecha") as Extract<
              HistoricoFilterRule,
              { column: "fecha" }
            >);
      return upsertFilterRule(prev, { ...base, from, to });
    });
  };

  return { toggleMulti, setFecha };
}

function ColumnBarControl({
  column,
  registros,
  filters,
  onChange,
  autoOpen = false,
}: {
  column: HistoricoFilterColumn;
  registros: RegistroMock[];
  filters: HistoricoFilterRule[];
  onChange: Dispatch<SetStateAction<HistoricoFilterRule[]>>;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const existing = getFilterForColumn(filters, column);
  const { toggleMulti, setFecha } = useColumnFilterActions(column, onChange);

  if (column === "proyecto" || column === "subproyecto") {
    const values =
      existing &&
      (existing.column === "proyecto" || existing.column === "subproyecto")
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
        searchable={column === "proyecto"}
        searchPlaceholder="Buscar proyecto…"
      />
    );
  }

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

export function HistoricoTiempoFilterBar({
  registros,
  filters,
  onChange,
  shown,
  total,
}: HistoricoTiempoFilterBarProps) {
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [barColumns, setBarColumns] = useState<HistoricoFilterColumn[]>([]);
  const [autoOpenColumn, setAutoOpenColumn] =
    useState<HistoricoFilterColumn | null>(null);

  const usedColumns = new Set(
    filters.filter(isRuleComplete).map((f) => f.column),
  );
  const hasFilters = hayFiltrosActivos(filters);
  const availableColumns = HISTORICO_FILTER_COLUMNS.filter(
    (col) => !barColumns.includes(col.id),
  );

  const pickColumn = (col: HistoricoFilterColumn) => {
    setColumnMenuOpen(false);
    setBarColumns((prev) => (prev.includes(col) ? prev : [...prev, col]));
    setAutoOpenColumn(col);
  };

  const removeBarColumn = (col: HistoricoFilterColumn) => {
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
    <TableFilterSection>
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-[13px] font-medium text-[#374151]">
          Filtrar por:
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

        {availableColumns.length > 0 ? (
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
              Filtros
            </button>
          }
        >
          <div className="py-0">
            {availableColumns.map((col) => (
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
        ) : null}

        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="cursor-pointer border-none bg-transparent px-1 text-[12px] font-semibold text-muted hover:text-navy"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {hasFilters && shown !== undefined && total !== undefined && (
        <p className="mt-2 text-[12px] text-muted">
          Mostrando <b className="text-navy">{shown}</b> de{" "}
          <b className="text-navy">{total}</b>
        </p>
      )}
    </TableFilterSection>
  );
}
