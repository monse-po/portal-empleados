"use client";

import { type Dispatch, type ReactNode, type SetStateAction } from "react";
import { DateRangePicker } from "@/src/components/ui/DateRangePicker";
import { type IconName } from "@/src/components/ui/Icon";
import {
  FilterAddMenu,
  FilterChipShell,
  LinearFilterToolbar,
  linearChipValue,
  linearFechaChip,
  useFilterAddState,
} from "@/src/components/ui/LinearFilterBar";
import {
  FilterOptionsMenu,
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

function isMultiColumn(
  column: HistoricoFilterColumn,
): column is "proyecto" | "subproyecto" {
  return column === "proyecto" || column === "subproyecto";
}

function FilterValuePanel({
  column,
  registros,
  filters,
  onChange,
  onDone,
  multiple = false,
}: {
  column: HistoricoFilterColumn;
  registros: RegistroMock[];
  filters: HistoricoFilterRule[];
  onChange: Dispatch<SetStateAction<HistoricoFilterRule[]>>;
  onDone?: () => void;
  multiple?: boolean;
}) {
  const existing = getFilterForColumn(filters, column);
  const { toggleMulti, setFecha } = useColumnFilterActions(column, onChange);

  if (isMultiColumn(column)) {
    const values = existing?.column === column ? existing.values : [];
    return (
      <FilterOptionsMenu
        options={multiOptions(column, registros)}
        selected={values}
        onToggle={toggleMulti}
        searchable={column === "proyecto"}
        searchPlaceholder="Buscar proyecto…"
        multiple={multiple}
        closeOnSelect={!multiple}
        onClose={onDone}
      />
    );
  }

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

function chipSummary(
  column: HistoricoFilterColumn,
  rule: HistoricoFilterRule | undefined,
  options: FilterDropdownOption[],
): ReactNode {
  if (!rule) return null;
  if (isMultiColumn(column) && rule.column === column) {
    return linearChipValue(rule.values, options);
  }
  if (rule.column === "fecha") return linearFechaChip(rule.from, rule.to, isoToDmy);
  return null;
}

function FilterChip({
  column,
  registros,
  filters,
  onChange,
  onRemove,
}: {
  column: HistoricoFilterColumn;
  registros: RegistroMock[];
  filters: HistoricoFilterRule[];
  onChange: Dispatch<SetStateAction<HistoricoFilterRule[]>>;
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

export function HistoricoTiempoFilterBar({
  registros,
  filters,
  onChange,
}: HistoricoTiempoFilterBarProps) {
  const add = useFilterAddState<HistoricoFilterColumn>();
  const activeFilters = filters.filter(isRuleComplete);
  const usedColumns = new Set(activeFilters.map((f) => f.column));
  const availableColumns = HISTORICO_FILTER_COLUMNS.filter(
    (col) => !usedColumns.has(col.id),
  );
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
                onPickField: (id) => add.pick(id as HistoricoFilterColumn),
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
