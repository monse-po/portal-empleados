"use client";

import { type Dispatch, type ReactNode, type SetStateAction } from "react";
import { DateRangePicker } from "@/src/components/ui/DateRangePicker";
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
  type AproAntFilterColumn,
  type AproAntFilterRule,
} from "@/src/lib/aprobacion-anticipos-filtros";
import type { AnticipoAprobacion } from "@/src/lib/aprobacion-anticipos-registro";
import type { IconName } from "@/src/components/ui/Icon";

type AprobacionAnticiposFilterBarProps = {
  registros: AnticipoAprobacion[];
  filters: AproAntFilterRule[];
  onChange: Dispatch<SetStateAction<AproAntFilterRule[]>>;
  tab: "pendientes" | "resueltas";
  shown?: number;
  total?: number;
  /** Aprobar/Rechazar en la misma franja que los filtros */
  actions?: ReactNode;
};

function valueOptionIcon(column: AproAntFilterColumn, val: string): IconName {
  if (column === "tipo") return val === "Viaje" ? "plane" : "briefcase";
  if (column === "estado") return val === "Aprobado" ? "check" : "x";
  return getFilterColumnDef(column).icon;
}

function multiOptions(
  column: "empleado" | "tipo" | "proyecto" | "estado",
  registros: AnticipoAprobacion[],
): FilterDropdownOption[] {
  return buildFilterMultiOptions("anticipo", column, getDistinctValues(registros, column), (val) => ({
    label: val,
    icon: valueOptionIcon(column, val),
  }));
}

function filterOperatorLabel(column: AproAntFilterColumn): string {
  switch (column) {
    case "codigo":
    case "motivo":
      return "contiene";
    case "fecha":
      return "entre";
    default:
      return "es";
  }
}

function useColumnFilterActions(
  column: AproAntFilterColumn,
  onChange: Dispatch<SetStateAction<AproAntFilterRule[]>>,
) {
  const toggleMulti = (val: string) => {
    const col = column as "empleado" | "tipo" | "proyecto" | "estado";
    onChange((prev) => {
      const rule = getFilterForColumn(prev, column);
      const current = rule?.column === col ? rule.values : [];
      const nextValues = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val];
      if (!nextValues.length) return removeFilterByColumn(prev, column);
      const base: Extract<AproAntFilterRule, { column: typeof col }> =
        rule?.column === col
          ? rule
          : (createEmptyRule(col) as Extract<
              AproAntFilterRule,
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
      const base: Extract<AproAntFilterRule, { column: "fecha" }> =
        rule?.column === "fecha"
          ? rule
          : (createEmptyRule("fecha") as Extract<
              AproAntFilterRule,
              { column: "fecha" }
            >);
      return upsertFilterRule(prev, { ...base, from, to });
    });
  };

  const setText = (text: string) => {
    const col = column as "codigo" | "motivo";
    if (!text.trim()) {
      onChange((prev) => removeFilterByColumn(prev, column));
      return;
    }
    onChange((prev) => {
      const rule = getFilterForColumn(prev, column);
      const base: Extract<AproAntFilterRule, { column: typeof col }> =
        rule?.column === col
          ? rule
          : (createEmptyRule(col) as Extract<
              AproAntFilterRule,
              { column: typeof col }
            >);
      return upsertFilterRule(prev, { ...base, text });
    });
  };

  return { toggleMulti, setFecha, setText };
}

function isMultiColumn(
  column: AproAntFilterColumn,
): column is "empleado" | "tipo" | "proyecto" | "estado" {
  return (
    column === "empleado" ||
    column === "tipo" ||
    column === "proyecto" ||
    column === "estado"
  );
}

function FilterValuePanel({
  column,
  registros,
  filters,
  onChange,
  onDone,
  multiple = false,
}: {
  column: AproAntFilterColumn;
  registros: AnticipoAprobacion[];
  filters: AproAntFilterRule[];
  onChange: Dispatch<SetStateAction<AproAntFilterRule[]>>;
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
        searchable={column === "empleado" || column === "proyecto"}
        searchPlaceholder={
          column === "proyecto" ? "Buscar proyecto…" : "Buscar empleado…"
        }
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
    existing?.column === "codigo" || existing?.column === "motivo"
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
  column: AproAntFilterColumn,
  rule: AproAntFilterRule | undefined,
  options: FilterDropdownOption[],
): ReactNode {
  if (!rule) return null;
  if (isMultiColumn(column) && rule.column === column) {
    return linearChipValue(rule.values, options);
  }
  if (rule.column === "fecha") return linearFechaChip(rule.from, rule.to, isoToDmy);
  if (rule.column === "codigo" || rule.column === "motivo") {
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
  column: AproAntFilterColumn;
  registros: AnticipoAprobacion[];
  filters: AproAntFilterRule[];
  onChange: Dispatch<SetStateAction<AproAntFilterRule[]>>;
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

export function AprobacionAnticiposFilterBar({
  registros,
  filters,
  onChange,
  tab,
  actions,
}: AprobacionAnticiposFilterBarProps) {
  const add = useFilterAddState<AproAntFilterColumn>(tab);
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
                onPickField: (id) => add.pick(id as AproAntFilterColumn),
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
