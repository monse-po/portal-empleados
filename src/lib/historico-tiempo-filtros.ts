import { format, parse } from "date-fns";
import type { IconName } from "@/src/components/ui/Icon";
import type { RegistroMock } from "@/src/lib/tiempo-registro";
import { getProyectoListaParts } from "@/src/lib/tiempo-bridge";

export type HistoricoFilterColumn = "proyecto" | "fecha" | "subproyecto";

export type HistoricoFilterRule =
  | {
      id: string;
      column: "fecha";
      from?: string;
      to?: string;
    }
  | {
      id: string;
      column: "proyecto" | "subproyecto";
      values: string[];
    };

export type HistoricoFilterColumnDef = {
  id: HistoricoFilterColumn;
  label: string;
  icon: IconName;
};

export const HISTORICO_FILTER_COLUMNS: HistoricoFilterColumnDef[] = [
  { id: "proyecto", label: "Proyecto", icon: "folderOpen" },
  { id: "subproyecto", label: "Subproyecto", icon: "flag" },
  { id: "fecha", label: "Periodo", icon: "calendar" },
];

export function getFilterColumnDef(
  column: HistoricoFilterColumn,
): HistoricoFilterColumnDef {
  return (
    HISTORICO_FILTER_COLUMNS.find((c) => c.id === column) ?? {
      id: column,
      label: column,
      icon: "filter",
    }
  );
}

export function newFilterId(): string {
  return `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isoToDmy(iso: string): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return format(d, "dd/MM/yyyy");
}

function getFieldValue(r: RegistroMock, col: HistoricoFilterColumn): string {
  switch (col) {
    case "proyecto":
      return r.proy;
    case "fecha":
      return r.fecha;
    case "subproyecto":
      return r.subproy ?? "";
    default:
      return "";
  }
}

export function getDistinctValues(
  registros: RegistroMock[],
  col: "proyecto" | "subproyecto",
): string[] {
  const set = new Set<string>();
  registros.forEach((r) => {
    const v = getFieldValue(r, col);
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export function proyectoFilterLabel(proyId: string): string {
  return getProyectoListaParts(proyId).codigo;
}

export function proyectoFilterTitle(proyId: string): string {
  return getProyectoListaParts(proyId).nombreFull;
}

function matchRule(r: RegistroMock, rule: HistoricoFilterRule): boolean {
  switch (rule.column) {
    case "fecha": {
      const dKey = r.fecha;
      if (rule.from && dKey < rule.from) return false;
      if (rule.to && dKey > rule.to) return false;
      return true;
    }
    case "proyecto":
    case "subproyecto": {
      if (!rule.values.length) return true;
      return rule.values.includes(getFieldValue(r, rule.column));
    }
    default:
      return true;
  }
}

export function applyHistoricoFilters(
  registros: RegistroMock[],
  rules: HistoricoFilterRule[],
): RegistroMock[] {
  const active = rules.filter(isRuleComplete);
  if (!active.length) return registros;
  return registros.filter((r) => active.every((rule) => matchRule(r, rule)));
}

export function hayFiltrosActivos(rules: HistoricoFilterRule[]): boolean {
  return rules.some(isRuleComplete);
}

export function upsertFilterRule(
  rules: HistoricoFilterRule[],
  rule: HistoricoFilterRule,
): HistoricoFilterRule[] {
  const idx = rules.findIndex((r) => r.column === rule.column);
  if (idx >= 0) {
    return rules.map((r, i) => (i === idx ? rule : r));
  }
  return [...rules, rule];
}

export function removeFilterByColumn(
  rules: HistoricoFilterRule[],
  column: HistoricoFilterColumn,
): HistoricoFilterRule[] {
  return rules.filter((r) => r.column !== column);
}

export function getFilterForColumn(
  rules: HistoricoFilterRule[],
  column: HistoricoFilterColumn,
): HistoricoFilterRule | undefined {
  return rules.find((r) => r.column === column);
}

/** Un solo proyecto seleccionado en filtro — para mostrar total del proyecto. */
export function getSingleProyectoFilterId(
  rules: HistoricoFilterRule[],
): string | null {
  const rule = getFilterForColumn(rules, "proyecto");
  if (rule?.column === "proyecto" && rule.values.length === 1) {
    return rule.values[0] ?? null;
  }
  return null;
}

export function isRuleComplete(rule: HistoricoFilterRule): boolean {
  switch (rule.column) {
    case "fecha":
      return Boolean(rule.from || rule.to);
    case "proyecto":
    case "subproyecto":
      return rule.values.length > 0;
    default:
      return false;
  }
}

export function createEmptyRule(column: HistoricoFilterColumn): HistoricoFilterRule {
  switch (column) {
    case "fecha":
      return { id: newFilterId(), column: "fecha" };
    case "proyecto":
    case "subproyecto":
      return { id: newFilterId(), column, values: [] };
  }
}
