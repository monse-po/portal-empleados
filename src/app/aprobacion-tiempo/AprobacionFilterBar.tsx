"use client";

import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { DateRangePicker } from "@/src/components/ui/DateRangePicker";
import { SelectControl } from "@/src/components/ui/DropdownAffordance";
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
  FilterOptionsMenu,
  TableFilterSection,
  buildFilterMultiOptions,
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
import { proyKey, proyNombre } from "@/src/lib/aprobacion-tiempo-mock";

type AprobacionFilterBarProps = {
  registros: HojaAprobacion[];
  filters: AproFilterRule[];
  onChange: Dispatch<SetStateAction<AproFilterRule[]>>;
  tab: "pend" | "res";
  shown?: number;
  total?: number;
  embedded?: boolean;
  /** Aprobar/Rechazar en la misma franja que los filtros */
  actions?: ReactNode;
  hideColumns?: AproFilterColumn[];
};

function valueOptionIcon(column: AproFilterColumn, val: string): IconName {
  if (column === "tipo") return getTipoHoraMeta(val).icon;
  if (column === "estado") return val === "Aprobado" ? "check" : "x";
  return getFilterColumnDef(column).icon;
}

function multiOptions(
  column: "empleado" | "tipo" | "proyecto" | "subproy" | "actividad" | "estado",
  registros: HojaAprobacion[],
): FilterDropdownOption[] {
  return buildFilterMultiOptions(
    "tiempo",
    column,
    getDistinctValues(registros, column),
    (val) => ({
      label:
        column === "tipo" && TIPO_HORA[val]?.s
          ? TIPO_HORA[val].s
          : column === "proyecto"
            ? proyKey(val) || val
            : val,
      title:
        column === "tipo"
          ? TIPO_HORA[val]?.n
          : column === "proyecto"
            ? proyNombre(val) || val
            : val,
      icon: valueOptionIcon(column, val),
    }),
  );
}

function isMultiColumn(
  column: AproFilterColumn,
): column is "empleado" | "tipo" | "proyecto" | "subproy" | "actividad" | "estado" {
  return (
    column === "empleado" ||
    column === "tipo" ||
    column === "proyecto" ||
    column === "subproy" ||
    column === "actividad" ||
    column === "estado"
  );
}

function searchPlaceholderFor(column: AproFilterColumn): string {
  if (column === "proyecto") return "Buscar proyecto…";
  if (column === "subproy") return "Buscar subproyecto…";
  if (column === "actividad") return "Buscar actividad…";
  if (column === "empleado") return "Buscar empleado…";
  return "Buscar…";
}

function useColumnFilterActions(
  column: AproFilterColumn,
  onChange: Dispatch<SetStateAction<AproFilterRule[]>>,
) {
  const toggleMulti = (val: string) => {
    const col = column as
      | "empleado"
      | "tipo"
      | "proyecto"
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

function filterOperatorLabel(
  column: AproFilterColumn,
  rule?: AproFilterRule,
): string {
  if (column === "comentario") return "contiene";
  if (column === "fecha") return "entre";
  if (column === "horas" && rule?.column === "horas") {
    if (rule.op === "gte") return "≥";
    if (rule.op === "lte") return "≤";
    if (rule.op === "between") return "entre";
    return "=";
  }
  return "es";
}

function FilterValuePanel({
  column,
  registros,
  filters,
  onChange,
  onDone,
  multiple = false,
}: {
  column: AproFilterColumn;
  registros: HojaAprobacion[];
  filters: AproFilterRule[];
  onChange: Dispatch<SetStateAction<AproFilterRule[]>>;
  onDone?: () => void;
  multiple?: boolean;
}) {
  const existing = getFilterForColumn(filters, column);
  const { toggleMulti, setFecha, setHoras, setComentario } =
    useColumnFilterActions(column, onChange);

  if (isMultiColumn(column)) {
    const values =
      existing && existing.column === column ? existing.values : [];
    return (
      <FilterOptionsMenu
        options={multiOptions(column, registros)}
        selected={values}
        onToggle={toggleMulti}
        searchable={
          column === "proyecto" ||
          column === "subproy" ||
          column === "actividad" ||
          column === "empleado"
        }
        searchPlaceholder={searchPlaceholderFor(column)}
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

  if (column === "horas") {
    const h =
      existing?.column === "horas"
        ? existing
        : { op: "eq" as const, value: 8, valueTo: 8 };
    return (
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
          onChange={(e) => setHoras({ value: parseFloat(e.target.value) || 0 })}
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
    );
  }

  const text = existing?.column === "comentario" ? existing.text : "";
  return (
    <div className="p-1.5">
      <input
        autoFocus
        type="text"
        value={text}
        placeholder="Contiene…"
        onChange={(e) => setComentario(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onDone?.();
        }}
        className="h-8 w-full rounded-[6px] border border-border px-2 text-[13px] focus:border-navy focus:outline-none"
      />
    </div>
  );
}

function chipSummary(
  column: AproFilterColumn,
  rule: AproFilterRule | undefined,
  options: FilterDropdownOption[],
): ReactNode {
  if (!rule) return null;

  if (isMultiColumn(column) && rule.column === column) {
    return linearChipValue(rule.values, options);
  }

  if (rule.column === "fecha") {
    return linearFechaChip(rule.from, rule.to, isoToDmy);
  }

  if (rule.column === "horas") {
    const text =
      rule.op === "between"
        ? `${rule.value}–${rule.valueTo ?? rule.value}`
        : `${rule.op === "eq" ? "=" : rule.op === "gte" ? "≥" : "≤"} ${rule.value}`;
    return (
      <span className="text-[12px] font-medium text-[#111]">{text}</span>
    );
  }

  if (rule.column === "comentario") {
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
  column: AproFilterColumn;
  registros: HojaAprobacion[];
  filters: AproFilterRule[];
  onChange: Dispatch<SetStateAction<AproFilterRule[]>>;
  onRemove: () => void;
}) {
  const def = getFilterColumnDef(column);
  const rule = getFilterForColumn(filters, column);
  const options = isMultiColumn(column) ? multiOptions(column, registros) : [];
  return (
    <FilterChipShell
      label={def.label}
      icon={def.icon}
      operator={filterOperatorLabel(column, rule)}
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

export function AprobacionFilterBar({
  registros,
  filters,
  onChange,
  tab,
  embedded = false,
  actions,
  hideColumns = [],
}: AprobacionFilterBarProps) {
  const add = useFilterAddState<AproFilterColumn>(tab);

  const hidden = new Set(hideColumns);
  const columns = getFilterColumns(tab).filter((col) => !hidden.has(col.id));
  const activeFilters = filters.filter(isRuleComplete);
  const usedColumns = new Set(activeFilters.map((f) => f.column));
  const availableColumns = columns.filter((col) => !usedColumns.has(col.id));
  const hasFilters = hayFiltrosActivos(filters);
  const addColumn = add.column ? getFilterColumnDef(add.column) : null;

  const body = (
    <LinearFilterToolbar
      hideLabel={embedded}
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
              onPickField: (id) => add.pick(id as AproFilterColumn),
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
  );

  if (embedded) {
    return <div className="min-w-0">{body}</div>;
  }

  return <TableFilterSection sticky={false}>{body}</TableFilterSection>;
}
