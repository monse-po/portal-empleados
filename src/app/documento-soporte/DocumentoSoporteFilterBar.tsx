"use client";

import { type Dispatch, type ReactNode, type SetStateAction } from "react";
import { DateRangePicker } from "@/src/components/ui/DateRangePicker";
import type { IconName } from "@/src/components/ui/Icon";
import {
  FilterAddMenu,
  FilterChipShell,
  LinearFilterToolbar,
  linearChipValue,
  linearFechaChip,
  linearTextChip,
  useFilterAddState,
} from "@/src/components/ui/LinearFilterBar";
import {
  buildFilterMultiOptions,
  FilterOptionsMenu,
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
  removeFilterByColumn,
  upsertFilterRule,
  type DocumentoSoporteFilterColumn,
  type DocumentoSoporteFilterRule,
} from "@/src/lib/documento-soporte-filtros";
import type {
  DocumentoSoporte,
  DocumentoSoporteTab,
} from "@/src/lib/documento-soporte-mock";

type DocumentoSoporteFilterBarProps = {
  registros: DocumentoSoporte[];
  filters: DocumentoSoporteFilterRule[];
  onChange: Dispatch<SetStateAction<DocumentoSoporteFilterRule[]>>;
  tab: DocumentoSoporteTab;
  shown?: number;
  total?: number;
};

function valueOptionIcon(
  column: DocumentoSoporteFilterColumn,
  val: string,
): IconName {
  if (column === "estado") {
    if (val === "Aprobado") return "check";
    if (val === "Rechazado") return "x";
    if (val === "Cancelado" || val === "Anulado") return "ban";
    if (val === "Lanzado") return "send";
    return "clock";
  }
  return getFilterColumnDef(column).icon;
}

function multiOptions(
  column: "estado",
  registros: DocumentoSoporte[],
): FilterDropdownOption[] {
  return buildFilterMultiOptions(
    "documento-soporte",
    column,
    getDistinctValues(registros, column),
    (val) => ({
      label: val,
      icon: valueOptionIcon(column, val),
    }),
  );
}

function filterOperatorLabel(column: DocumentoSoporteFilterColumn): string {
  switch (column) {
    case "codigo":
    case "nif":
    case "documento":
    case "concepto":
      return "contiene";
    case "fecha":
      return "entre";
    default:
      return "es";
  }
}

function useColumnFilterActions(
  column: DocumentoSoporteFilterColumn,
  onChange: Dispatch<SetStateAction<DocumentoSoporteFilterRule[]>>,
) {
  const toggleMulti = (val: string) => {
    onChange((prev) => {
      const rule = getFilterForColumn(prev, "estado");
      const current = rule?.column === "estado" ? rule.values : [];
      const nextValues = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val];
      if (!nextValues.length) return removeFilterByColumn(prev, "estado");
      const base: Extract<DocumentoSoporteFilterRule, { column: "estado" }> =
        rule?.column === "estado"
          ? rule
          : (createEmptyRule("estado") as Extract<
              DocumentoSoporteFilterRule,
              { column: "estado" }
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
      const base: Extract<DocumentoSoporteFilterRule, { column: "fecha" }> =
        rule?.column === "fecha"
          ? rule
          : (createEmptyRule("fecha") as Extract<
              DocumentoSoporteFilterRule,
              { column: "fecha" }
            >);
      return upsertFilterRule(prev, { ...base, from, to });
    });
  };

  const setText = (text: string) => {
    const col = column as "codigo" | "nif" | "documento" | "concepto";
    if (!text.trim()) {
      onChange((prev) => removeFilterByColumn(prev, column));
      return;
    }
    onChange((prev) => {
      const rule = getFilterForColumn(prev, column);
      const base: Extract<DocumentoSoporteFilterRule, { column: typeof col }> =
        rule?.column === col
          ? rule
          : (createEmptyRule(col) as Extract<
              DocumentoSoporteFilterRule,
              { column: typeof col }
            >);
      return upsertFilterRule(prev, { ...base, text });
    });
  };

  return { toggleMulti, setFecha, setText };
}

function isMultiColumn(
  column: DocumentoSoporteFilterColumn,
): column is "estado" {
  return column === "estado";
}

function FilterValuePanel({
  column,
  registros,
  filters,
  onChange,
  onDone,
  multiple = false,
}: {
  column: DocumentoSoporteFilterColumn;
  registros: DocumentoSoporte[];
  filters: DocumentoSoporteFilterRule[];
  onChange: Dispatch<SetStateAction<DocumentoSoporteFilterRule[]>>;
  onDone?: () => void;
  multiple?: boolean;
}) {
  const existing = getFilterForColumn(filters, column);
  const { toggleMulti, setFecha, setText } = useColumnFilterActions(
    column,
    onChange,
  );

  if (isMultiColumn(column)) {
    const values = existing?.column === "estado" ? existing.values : [];
    return (
      <FilterOptionsMenu
        options={multiOptions("estado", registros)}
        selected={values}
        onToggle={toggleMulti}
        multiple={multiple}
        closeOnSelect={!multiple}
        onClose={onDone}
      />
    );
  }

  if (column === "fecha") {
    const f = existing?.column === "fecha" ? existing : undefined;
    return (
      <DateRangePicker
        from={f?.from}
        to={f?.to}
        onChange={setFecha}
        onRangeComplete={onDone}
        compact
      />
    );
  }

  const text =
    existing?.column === "codigo" ||
    existing?.column === "nif" ||
    existing?.column === "documento" ||
    existing?.column === "concepto"
      ? existing.text
      : "";
  return (
    <div className="p-1.5">
      <input
        autoFocus
        type="text"
        value={text}
        placeholder="Contiene…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onDone?.();
        }}
        className="h-8 w-full rounded-[6px] border border-border px-2 text-[13px] focus:border-navy focus:outline-none"
      />
    </div>
  );
}

function chipSummary(
  column: DocumentoSoporteFilterColumn,
  rule: DocumentoSoporteFilterRule | undefined,
  options: FilterDropdownOption[],
): ReactNode {
  if (!rule) return null;
  if (isMultiColumn(column) && rule.column === column) {
    return linearChipValue(rule.values, options);
  }
  if (rule.column === "fecha") return linearFechaChip(rule.from, rule.to, isoToDmy);
  if (
    rule.column === "codigo" ||
    rule.column === "nif" ||
    rule.column === "documento" ||
    rule.column === "concepto"
  ) {
    return linearTextChip(rule.text);
  }
  return null;
}

function FilterChip({
  column,
  registros,
  filters,
  onChange,
  onRemove,
}: {
  column: DocumentoSoporteFilterColumn;
  registros: DocumentoSoporte[];
  filters: DocumentoSoporteFilterRule[];
  onChange: Dispatch<SetStateAction<DocumentoSoporteFilterRule[]>>;
  onRemove: () => void;
}) {
  const def = getFilterColumnDef(column);
  const rule = getFilterForColumn(filters, column);
  const options = isMultiColumn(column) ? multiOptions(column, registros) : [];
  return (
    <FilterChipShell
      label={def.label}
      icon={def.icon}
      operator={filterOperatorLabel(column)}
      value={chipSummary(column, rule, options)}
      onRemove={onRemove}
      fitContent={column === "fecha"}
    >
      {(close) => (
        <FilterValuePanel
          column={column}
          registros={registros}
          filters={filters}
          onChange={onChange}
          onDone={close}
          multiple={isMultiColumn(column)}
        />
      )}
    </FilterChipShell>
  );
}

export function DocumentoSoporteFilterBar({
  registros,
  filters,
  onChange,
  tab,
}: DocumentoSoporteFilterBarProps) {
  const add = useFilterAddState<DocumentoSoporteFilterColumn>(tab);
  const columns = getFilterColumns(tab);
  const activeFilters = filters.filter(isRuleComplete);
  const usedColumns = new Set(activeFilters.map((f) => f.column));
  const availableColumns = columns.filter((col) => !usedColumns.has(col.id));
  const hasFilters = hayFiltrosActivos(filters);
  const addColumn = add.column ? getFilterColumnDef(add.column) : null;

  return (
    <TableFilterSection>
      <LinearFilterToolbar
        chips={activeFilters.map((rule) => (
          <FilterChip
            key={rule.column}
            column={rule.column}
            registros={registros}
            filters={filters}
            onChange={onChange}
            onRemove={() =>
              onChange((prev) => removeFilterByColumn(prev, rule.column))
            }
          />
        ))}
        add={
          availableColumns.length > 0 ? (
            <FilterAddMenu
              fields={availableColumns}
              stepLabel={addColumn?.label}
              fitContent={add.column === "fecha"}
            >
              {{
                open: add.open,
                onOpenChange: add.onOpenChange,
                onPickField: (id) => add.pick(id as DocumentoSoporteFilterColumn),
                onBack: add.back,
                panel: add.column ? (
                  <FilterValuePanel
                    column={add.column}
                    registros={registros}
                    filters={filters}
                    onChange={onChange}
                    onDone={add.close}
                    multiple={false}
                  />
                ) : null,
              }}
            </FilterAddMenu>
          ) : null
        }
        hasFilters={hasFilters}
        onClear={() => {
          onChange([]);
          add.close();
        }}
      />
    </TableFilterSection>
  );
}
