"use client";

import { type Dispatch, type ReactNode, type SetStateAction } from "react";
import { SelectControl } from "@/src/components/ui/DropdownAffordance";
import {
  FilterAddMenu,
  FilterChipShell,
  LinearFilterToolbar,
  linearChipValue,
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
  getDistinctActividades,
  getDistinctEmpleadoNombres,
  getDistinctProyectoCodigos,
  getFilterColumnDef,
  getFilterColumns,
  getFilterForColumn,
  hayFiltrosActivos,
  horasOpLabel,
  isRuleComplete,
  removeFilterByColumn,
  upsertFilterRule,
  type AproProyFilterColumn,
  type AproProyFilterLevel,
  type AproProyFilterRule,
  type HorasFilterOp,
} from "@/src/lib/aprobacion-proyectos-filtros";
import type {
  HorasEmpleadoAprobacion,
  HorasProyectoAprobacion,
} from "@/src/lib/ifs/tiempo-approval";

type AprobacionProyectosFilterBarProps = {
  level: AproProyFilterLevel;
  proyectos: HorasProyectoAprobacion[];
  empleados: HorasEmpleadoAprobacion[];
  filters: AproProyFilterRule[];
  onChange: Dispatch<SetStateAction<AproProyFilterRule[]>>;
  shown?: number;
  total?: number;
  actions?: ReactNode;
  embedded?: boolean;
};

function isMultiColumn(
  column: AproProyFilterColumn,
): column is "proyecto" | "empleado" | "actividad" {
  return (
    column === "proyecto" || column === "empleado" || column === "actividad"
  );
}

function isHorasColumn(
  column: AproProyFilterColumn,
): column is "porAprobar" | "acumulado" {
  return column === "porAprobar" || column === "acumulado";
}

function filterOperatorLabel(
  column: AproProyFilterColumn,
  filters: AproProyFilterRule[],
): string {
  if (column === "nombre" || column === "cedula") return "contiene";
  if (isHorasColumn(column)) {
    const rule = getFilterForColumn(filters, column);
    if (rule?.column === "porAprobar" || rule?.column === "acumulado") {
      return horasOpLabel(rule.op);
    }
    return "≥";
  }
  return "es";
}

function multiOptions(
  column: "proyecto" | "empleado" | "actividad",
  proyectos: HorasProyectoAprobacion[],
  empleados: HorasEmpleadoAprobacion[],
): FilterDropdownOption[] {
  const rawValues =
    column === "proyecto"
      ? getDistinctProyectoCodigos(proyectos)
      : column === "actividad"
        ? getDistinctActividades(empleados)
        : getDistinctEmpleadoNombres(empleados);
  return buildFilterMultiOptions("tiempo", column, rawValues, (val) => ({
    label: val,
    icon:
      column === "proyecto"
        ? "folderOpen"
        : column === "actividad"
          ? "flag"
          : "user",
  }));
}

function FilterValuePanel({
  column,
  proyectos,
  empleados,
  filters,
  onChange,
  onDone,
  multiple = false,
}: {
  column: AproProyFilterColumn;
  proyectos: HorasProyectoAprobacion[];
  empleados: HorasEmpleadoAprobacion[];
  filters: AproProyFilterRule[];
  onChange: Dispatch<SetStateAction<AproProyFilterRule[]>>;
  onDone?: () => void;
  multiple?: boolean;
}) {
  const existing = getFilterForColumn(filters, column);

  if (isMultiColumn(column)) {
    const values =
      existing && existing.column === column && "values" in existing
        ? existing.values
        : [];
    return (
      <FilterOptionsMenu
        options={multiOptions(column, proyectos, empleados)}
        selected={values}
        onToggle={(val) => {
          onChange((prev) => {
            const rule = getFilterForColumn(prev, column);
            const current =
              rule?.column === column && "values" in rule ? rule.values : [];
            const nextValues = current.includes(val)
              ? current.filter((v) => v !== val)
              : [...current, val];
            if (!nextValues.length) return removeFilterByColumn(prev, column);
            const base =
              rule?.column === column ? rule : createEmptyRule(column);
            return upsertFilterRule(prev, {
              ...base,
              column,
              values: nextValues,
            } as AproProyFilterRule);
          });
        }}
        searchable
        searchPlaceholder={
          column === "proyecto"
            ? "Buscar proyecto…"
            : column === "actividad"
              ? "Buscar actividad…"
              : "Buscar empleado…"
        }
        multiple={multiple}
        closeOnSelect={!multiple}
        onClose={onDone}
      />
    );
  }

  if (isHorasColumn(column)) {
    const h =
      existing?.column === "porAprobar" || existing?.column === "acumulado"
        ? existing
        : { op: "gte" as HorasFilterOp, value: Number.NaN, valueTo: Number.NaN };
    const patch = (
      next: Partial<
        Extract<AproProyFilterRule, { column: "porAprobar" | "acumulado" }>
      >,
    ) => {
      onChange((prev) => {
        const rule = getFilterForColumn(prev, column);
        const base = rule?.column === column ? rule : createEmptyRule(column);
        return upsertFilterRule(prev, {
          ...base,
          column,
          ...next,
        } as AproProyFilterRule);
      });
    };

    return (
      <div className="space-y-2 p-1">
        <SelectControl
          value={h.op}
          onChange={(e) => patch({ op: e.target.value as HorasFilterOp })}
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
          value={Number.isNaN(h.value) ? "" : h.value}
          onChange={(e) => {
            const raw = e.target.value;
            patch({ value: raw === "" ? Number.NaN : parseFloat(raw) });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onDone?.();
          }}
          className="h-8 w-full rounded-[6px] border border-border px-2 text-[13px] focus:border-navy focus:outline-none"
          placeholder="horas…"
        />
        {h.op === "between" && (
          <input
            type="number"
            min={0}
            step={0.5}
            value={
              h.valueTo === undefined || Number.isNaN(h.valueTo) ? "" : h.valueTo
            }
            onChange={(e) => {
              const raw = e.target.value;
              patch({
                valueTo: raw === "" ? Number.NaN : parseFloat(raw),
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onDone?.();
            }}
            className="h-8 w-full rounded-[6px] border border-border px-2 text-[13px] focus:border-navy focus:outline-none"
            placeholder="Hasta"
          />
        )}
      </div>
    );
  }

  const text =
    existing?.column === "nombre" || existing?.column === "cedula"
      ? existing.text
      : "";
  return (
    <div className="p-1.5">
      <input
        autoFocus
        type="text"
        value={text}
        placeholder={column === "cedula" ? "Cédula…" : "Contiene…"}
        onChange={(e) => {
          const next = e.target.value;
          onChange((prev) => {
            if (!next.trim()) return removeFilterByColumn(prev, column);
            const rule = getFilterForColumn(prev, column);
            const base = rule?.column === column ? rule : createEmptyRule(column);
            return upsertFilterRule(prev, {
              ...base,
              column,
              text: next,
            } as AproProyFilterRule);
          });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onDone?.();
        }}
        className="h-8 w-full rounded-[6px] border border-border px-2 text-[13px] focus:border-navy focus:outline-none"
      />
    </div>
  );
}

function chipSummary(
  column: AproProyFilterColumn,
  rule: AproProyFilterRule | undefined,
  options: FilterDropdownOption[],
): ReactNode {
  if (!rule) return null;
  if (isMultiColumn(column) && rule.column === column) {
    return linearChipValue(rule.values, options);
  }
  if (
    (rule.column === "porAprobar" || rule.column === "acumulado") &&
    isRuleComplete(rule)
  ) {
    const text =
      rule.op === "between"
        ? `${rule.value}–${rule.valueTo ?? rule.value}`
        : String(rule.value);
    return <span className="text-[12px] font-medium text-[#111]">{text}</span>;
  }
  if (rule.column === "nombre" || rule.column === "cedula") {
    return linearTextChip(rule.text);
  }
  return null;
}

function FilterChip({
  column,
  proyectos,
  empleados,
  filters,
  onChange,
  onRemove,
}: {
  column: AproProyFilterColumn;
  proyectos: HorasProyectoAprobacion[];
  empleados: HorasEmpleadoAprobacion[];
  filters: AproProyFilterRule[];
  onChange: Dispatch<SetStateAction<AproProyFilterRule[]>>;
  onRemove: () => void;
}) {
  const def = getFilterColumnDef(column);
  const rule = getFilterForColumn(filters, column);
  const options = isMultiColumn(column)
    ? multiOptions(column, proyectos, empleados)
    : [];
  return (
    <FilterChipShell
      label={def.label}
      icon={def.icon}
      operator={filterOperatorLabel(column, filters)}
      value={chipSummary(column, rule, options)}
      onRemove={onRemove}
    >
      {(close) => (
        <FilterValuePanel
          column={column}
          proyectos={proyectos}
          empleados={empleados}
          filters={filters}
          onChange={onChange}
          onDone={close}
          multiple={isMultiColumn(column)}
        />
      )}
    </FilterChipShell>
  );
}

export function AprobacionProyectosFilterBar({
  level,
  proyectos,
  empleados,
  filters,
  onChange,
  actions,
  embedded = false,
}: AprobacionProyectosFilterBarProps) {
  const add = useFilterAddState<AproProyFilterColumn>(level);
  const columns = getFilterColumns(level);
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
          proyectos={proyectos}
          empleados={empleados}
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
          >
            {{
              open: add.open,
              onOpenChange: add.onOpenChange,
              onPickField: (id) => add.pick(id as AproProyFilterColumn),
              onBack: add.back,
              panel: add.column ? (
                <FilterValuePanel
                  column={add.column}
                  proyectos={proyectos}
                  empleados={empleados}
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

  return (
    <TableFilterSection sticky={false} embedded={embedded}>
      {body}
    </TableFilterSection>
  );
}
