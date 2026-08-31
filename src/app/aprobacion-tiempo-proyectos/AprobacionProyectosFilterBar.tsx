"use client";

import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { FilterChainRow } from "@/src/components/ui/FilterChainRow";
import { Icon } from "@/src/components/ui/Icon";
import { SelectControl } from "@/src/components/ui/DropdownAffordance";
import {
  buildFilterMultiOptions,
  FilterBarMultiDropdown,
  FilterBarTextInput,
  FilterBarTrigger,
  TableFilterSection,
} from "@/src/components/ui/TableFilterBar";
import {
  createEmptyRule,
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
};

function filterOperatorLabel(
  column: AproProyFilterColumn,
  filters: AproProyFilterRule[],
): string {
  if (column === "nombre" || column === "cedula") return "contiene";
  if (column === "porAprobar" || column === "acumulado") {
    const rule = getFilterForColumn(filters, column);
    if (rule?.column === "porAprobar" || rule?.column === "acumulado") {
      return horasOpLabel(rule.op);
    }
    return "≥";
  }
  return "es";
}

function ColumnBarControl({
  column,
  proyectos,
  empleados,
  filters,
  onChange,
  autoOpen = false,
}: {
  column: AproProyFilterColumn;
  proyectos: HorasProyectoAprobacion[];
  empleados: HorasEmpleadoAprobacion[];
  filters: AproProyFilterRule[];
  onChange: Dispatch<SetStateAction<AproProyFilterRule[]>>;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const existing = getFilterForColumn(filters, column);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  if (column === "proyecto" || column === "empleado") {
    const values =
      existing &&
      (existing.column === "proyecto" || existing.column === "empleado")
        ? existing.values
        : [];
    const rawValues =
      column === "proyecto"
        ? getDistinctProyectoCodigos(proyectos)
        : getDistinctEmpleadoNombres(empleados);
    const options = buildFilterMultiOptions("tiempo", column, rawValues, (val) => ({
      label: val,
      icon: column === "proyecto" ? "folderOpen" : "user",
    }));

    return (
      <FilterBarMultiDropdown
        options={options}
        selected={values}
        onToggle={(val) => {
          onChange((prev) => {
            const rule = getFilterForColumn(prev, column);
            const current =
              rule?.column === column && "values" in rule ? rule.values : [];
            const nextValues = current.includes(val)
              ? current.filter((v) => v !== val)
              : [...current, val];
            if (!nextValues.length) {
              return removeFilterByColumn(prev, column);
            }
            const base =
              rule?.column === column ? rule : createEmptyRule(column);
            return upsertFilterRule(prev, {
              ...base,
              column,
              values: nextValues,
            } as AproProyFilterRule);
          });
        }}
        placeholder="elegir…"
        embedded
        defaultOpen={autoOpen}
        searchable
        searchPlaceholder={
          column === "proyecto" ? "Buscar proyecto…" : "Buscar empleado…"
        }
      />
    );
  }

  if (column === "porAprobar" || column === "acumulado") {
    const h =
      existing?.column === "porAprobar" || existing?.column === "acumulado"
        ? existing
        : { op: "gte" as HorasFilterOp, value: Number.NaN, valueTo: Number.NaN };
    const display =
      existing &&
      (existing.column === "porAprobar" || existing.column === "acumulado") &&
      isRuleComplete(existing)
        ? existing.op === "between"
          ? `${existing.value}–${existing.valueTo ?? existing.value}`
          : `${existing.value}`
        : undefined;

    const patch = (
      next: Partial<
        Extract<AproProyFilterRule, { column: "porAprobar" | "acumulado" }>
      >,
    ) => {
      onChange((prev) => {
        const rule = getFilterForColumn(prev, column);
        const base =
          rule?.column === column ? rule : createEmptyRule(column);
        return upsertFilterRule(prev, {
          ...base,
          column,
          ...next,
        } as AproProyFilterRule);
      });
    };

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
            className="h-8 w-full rounded-[6px] border border-border px-2 text-[13px] focus:border-navy focus:outline-none"
            placeholder="horas…"
          />
          {h.op === "between" && (
            <input
              type="number"
              min={0}
              step={0.5}
              value={
                h.valueTo === undefined || Number.isNaN(h.valueTo)
                  ? ""
                  : h.valueTo
              }
              onChange={(e) => {
                const raw = e.target.value;
                patch({
                  valueTo: raw === "" ? Number.NaN : parseFloat(raw),
                });
              }}
              className="h-8 w-full rounded-[6px] border border-border px-2 text-[13px] focus:border-navy focus:outline-none"
              placeholder="Hasta"
            />
          )}
        </div>
      </Dropdown>
    );
  }

  const text =
    existing?.column === "nombre" || existing?.column === "cedula"
      ? existing.text
      : "";

  return (
    <FilterBarTextInput
      value={text}
      placeholder={column === "cedula" ? "cédula…" : "texto…"}
      onChange={(next) => {
        onChange((prev) => {
          if (!next.trim()) return removeFilterByColumn(prev, column);
          const rule = getFilterForColumn(prev, column);
          const base =
            rule?.column === column ? rule : createEmptyRule(column);
          return upsertFilterRule(prev, {
            ...base,
            column,
            text: next,
          } as AproProyFilterRule);
        });
      }}
      embedded
    />
  );
}

export function AprobacionProyectosFilterBar({
  level,
  proyectos,
  empleados,
  filters,
  onChange,
  shown,
  total,
  actions,
}: AprobacionProyectosFilterBarProps) {
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [barColumns, setBarColumns] = useState<AproProyFilterColumn[]>([]);
  const [autoOpenColumn, setAutoOpenColumn] =
    useState<AproProyFilterColumn | null>(null);

  useEffect(() => {
    setBarColumns([]);
    setAutoOpenColumn(null);
    setColumnMenuOpen(false);
  }, [level]);

  const columns = getFilterColumns(level);
  const usedColumns = new Set(
    filters.filter(isRuleComplete).map((f) => f.column),
  );
  const hasFilters = hayFiltrosActivos(filters);

  const pickColumn = (col: AproProyFilterColumn) => {
    setColumnMenuOpen(false);
    setBarColumns((prev) => (prev.includes(col) ? prev : [...prev, col]));
    setAutoOpenColumn(col);
  };

  const removeBarColumn = (col: AproProyFilterColumn) => {
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
    <TableFilterSection sticky={false}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
                operator={filterOperatorLabel(col, filters)}
                active={active || !!getFilterForColumn(filters, col)}
                onRemove={() => removeBarColumn(col)}
              >
                <ColumnBarControl
                  column={col}
                  proyectos={proyectos}
                  empleados={empleados}
                  filters={filters}
                  onChange={onChange}
                  autoOpen={autoOpenColumn === col}
                />
              </FilterChainRow>
            );
          })}

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
        {actions ? <div className="shrink-0">{actions}</div> : null}
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
