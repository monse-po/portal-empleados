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
  type AproLegFilterColumn,
  type AproLegFilterRule,
} from "@/src/lib/aprobacion-legalizaciones-filtros";
import type { LegalizacionApro } from "@/src/lib/aprobacion-legalizaciones-mock";

type AprobacionLegalizacionesFilterBarProps = {
  registros: LegalizacionApro[];
  filters: AproLegFilterRule[];
  onChange: Dispatch<SetStateAction<AproLegFilterRule[]>>;
  tab: "pend" | "res";
  shown?: number;
  total?: number;
  /** Aprobar/Rechazar en la misma franja que los filtros */
  actions?: ReactNode;
};

function valueOptionIcon(column: AproLegFilterColumn, val: string): IconName {
  if (column === "tipo") {
    if (val.includes("anticipo")) return "wallet";
    if (val.includes("Tarjeta")) return "briefcase";
    return "folderOpen";
  }
  if (column === "estado") return val === "Aprobado" ? "check" : "x";
  return getFilterColumnDef(column).icon;
}

function multiOptions(
  column: "empleado" | "tipo" | "estado",
  registros: LegalizacionApro[],
): FilterDropdownOption[] {
  return buildFilterMultiOptions(
    "legalizacion",
    column,
    getDistinctValues(registros, column),
    (val) => ({
      label: val,
      icon: valueOptionIcon(column, val),
    }),
  );
}

function filterOperatorLabel(column: AproLegFilterColumn): string {
  switch (column) {
    case "codigo":
    case "concepto":
    case "motivo":
      return "contiene";
    case "fecha":
      return "entre";
    default:
      return "es";
  }
}

function useColumnFilterActions(
  column: AproLegFilterColumn,
  onChange: Dispatch<SetStateAction<AproLegFilterRule[]>>,
) {
  const toggleMulti = (val: string) => {
    const col = column as "empleado" | "tipo" | "estado";
    onChange((prev) => {
      const rule = getFilterForColumn(prev, column);
      const current = rule?.column === col ? rule.values : [];
      const nextValues = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val];
      if (!nextValues.length) return removeFilterByColumn(prev, column);
      const base: Extract<AproLegFilterRule, { column: typeof col }> =
        rule?.column === col
          ? rule
          : (createEmptyRule(col) as Extract<
              AproLegFilterRule,
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
      const base: Extract<AproLegFilterRule, { column: "fecha" }> =
        rule?.column === "fecha"
          ? rule
          : (createEmptyRule("fecha") as Extract<
              AproLegFilterRule,
              { column: "fecha" }
            >);
      return upsertFilterRule(prev, { ...base, from, to });
    });
  };

  const setText = (text: string) => {
    const col = column as "codigo" | "concepto" | "motivo";
    if (!text.trim()) {
      onChange((prev) => removeFilterByColumn(prev, column));
      return;
    }
    onChange((prev) => {
      const rule = getFilterForColumn(prev, column);
      const base: Extract<AproLegFilterRule, { column: typeof col }> =
        rule?.column === col
          ? rule
          : (createEmptyRule(col) as Extract<
              AproLegFilterRule,
              { column: typeof col }
            >);
      return upsertFilterRule(prev, { ...base, text });
    });
  };

  return { toggleMulti, setFecha, setText };
}

function isMultiColumn(
  column: AproLegFilterColumn,
): column is "empleado" | "tipo" | "estado" {
  return column === "empleado" || column === "tipo" || column === "estado";
}

function FilterValuePanel({
  column,
  registros,
  filters,
  onChange,
  onDone,
  multiple = false,
}: {
  column: AproLegFilterColumn;
  registros: LegalizacionApro[];
  filters: AproLegFilterRule[];
  onChange: Dispatch<SetStateAction<AproLegFilterRule[]>>;
  onDone?: () => void;
  multiple?: boolean;
}) {
  const existing = getFilterForColumn(filters, column);
  const { toggleMulti, setFecha, setText } = useColumnFilterActions(
    column,
    onChange,
  );

  if (isMultiColumn(column)) {
    const values = existing?.column === column ? existing.values : [];
    return (
      <FilterOptionsMenu
        options={multiOptions(column, registros)}
        selected={values}
        onToggle={toggleMulti}
        searchable={column === "empleado"}
        searchPlaceholder="Buscar empleado…"
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
    existing?.column === "concepto" ||
    existing?.column === "motivo"
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
  column: AproLegFilterColumn,
  rule: AproLegFilterRule | undefined,
  options: FilterDropdownOption[],
): ReactNode {
  if (!rule) return null;
  if (isMultiColumn(column) && rule.column === column) {
    return linearChipValue(rule.values, options);
  }
  if (rule.column === "fecha") return linearFechaChip(rule.from, rule.to, isoToDmy);
  if (
    rule.column === "codigo" ||
    rule.column === "concepto" ||
    rule.column === "motivo"
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
  column: AproLegFilterColumn;
  registros: LegalizacionApro[];
  filters: AproLegFilterRule[];
  onChange: Dispatch<SetStateAction<AproLegFilterRule[]>>;
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

export function AprobacionLegalizacionesFilterBar({
  registros,
  filters,
  onChange,
  tab,
  actions,
}: AprobacionLegalizacionesFilterBarProps) {
  const add = useFilterAddState<AproLegFilterColumn>(tab);
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
                onPickField: (id) => add.pick(id as AproLegFilterColumn),
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
        actions={actions}
      />
    </TableFilterSection>
  );
}
