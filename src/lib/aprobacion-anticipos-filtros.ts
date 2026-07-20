import { format, parse } from "date-fns";
import type { IconName } from "@/src/components/ui/Icon";
import { dmyToSortKey } from "@/src/lib/tiempo-bridge";
import type { AnticipoAprobacion } from "@/src/lib/aprobacion-anticipos-mock";

export type AproAntFilterColumn =
  | "codigo"
  | "fecha"
  | "empleado"
  | "tipo"
  | "proyecto"
  | "motivo"
  | "estado";

export type AproAntFilterRule =
  | {
      id: string;
      column: "codigo" | "motivo";
      text: string;
    }
  | {
      id: string;
      column: "fecha";
      from?: string;
      to?: string;
    }
  | {
      id: string;
      column: "empleado" | "tipo" | "proyecto" | "estado";
      values: string[];
    };

export type AproAntFilterColumnDef = {
  id: AproAntFilterColumn;
  label: string;
  icon: IconName;
};

export const APRO_ANT_FILTER_COLUMNS_BASE: AproAntFilterColumnDef[] = [
  { id: "codigo", label: "Código", icon: "copy" },
  { id: "fecha", label: "Solicitado", icon: "calendar" },
  { id: "empleado", label: "Empleado", icon: "user" },
  { id: "tipo", label: "Tipo", icon: "briefcase" },
  { id: "proyecto", label: "Proyecto", icon: "folderOpen" },
  { id: "motivo", label: "Motivo", icon: "pencil" },
];

export const APRO_ANT_FILTER_COLUMN_ESTADO: AproAntFilterColumnDef = {
  id: "estado",
  label: "Estado",
  icon: "checkSquare",
};

export function getFilterColumns(
  tab: "pendientes" | "resueltas",
): AproAntFilterColumnDef[] {
  if (tab === "resueltas") {
    return [...APRO_ANT_FILTER_COLUMNS_BASE, APRO_ANT_FILTER_COLUMN_ESTADO];
  }
  return APRO_ANT_FILTER_COLUMNS_BASE;
}

export function getFilterColumnDef(
  column: AproAntFilterColumn,
): AproAntFilterColumnDef {
  const all = [...APRO_ANT_FILTER_COLUMNS_BASE, APRO_ANT_FILTER_COLUMN_ESTADO];
  return (
    all.find((c) => c.id === column) ?? {
      id: column,
      label: column,
      icon: "filter",
    }
  );
}

export function newFilterId(): string {
  return `fa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isoToDmy(iso: string): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return format(d, "dd/MM/yyyy");
}

function getFieldValue(
  s: AnticipoAprobacion,
  col: AproAntFilterColumn,
): string {
  switch (col) {
    case "codigo":
      return s.no;
    case "fecha":
      return s.fecha;
    case "empleado":
      return s.solicitante || s.nombre || "";
    case "tipo":
      return s.tipo;
    case "proyecto":
      return s.proy;
    case "motivo":
      return s.motivo;
    case "estado":
      return s.estadoApro || "";
    default:
      return "";
  }
}

export function getDistinctValues(
  registros: AnticipoAprobacion[],
  col: "empleado" | "tipo" | "proyecto" | "estado",
): string[] {
  const set = new Set<string>();
  registros.forEach((s) => {
    const v = getFieldValue(s, col);
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function matchRule(s: AnticipoAprobacion, rule: AproAntFilterRule): boolean {
  switch (rule.column) {
    case "fecha": {
      const dKey = dmyToSortKey(s.fecha);
      const fromKey = rule.from ? dmyToSortKey(isoToDmy(rule.from)) : null;
      const toKey = rule.to ? dmyToSortKey(isoToDmy(rule.to)) : null;
      if (fromKey !== null && dKey < fromKey) return false;
      if (toKey !== null && dKey > toKey) return false;
      return true;
    }
    case "empleado":
    case "tipo":
    case "proyecto":
    case "estado": {
      if (!rule.values.length) return true;
      return rule.values.includes(getFieldValue(s, rule.column));
    }
    case "codigo":
    case "motivo": {
      const q = rule.text.trim().toLowerCase();
      if (!q) return true;
      return getFieldValue(s, rule.column).toLowerCase().includes(q);
    }
    default:
      return true;
  }
}

export function applyAproAntFilters(
  registros: AnticipoAprobacion[],
  rules: AproAntFilterRule[],
): AnticipoAprobacion[] {
  const active = rules.filter(isRuleComplete);
  if (!active.length) return registros;
  return registros.filter((s) => active.every((r) => matchRule(s, r)));
}

export function hayFiltrosActivos(rules: AproAntFilterRule[]): boolean {
  return rules.some(isRuleComplete);
}

export function upsertFilterRule(
  rules: AproAntFilterRule[],
  rule: AproAntFilterRule,
): AproAntFilterRule[] {
  const idx = rules.findIndex((r) => r.column === rule.column);
  if (idx >= 0) {
    return rules.map((r, i) => (i === idx ? rule : r));
  }
  return [...rules, rule];
}

export function removeFilterByColumn(
  rules: AproAntFilterRule[],
  column: AproAntFilterColumn,
): AproAntFilterRule[] {
  return rules.filter((r) => r.column !== column);
}

export function getFilterForColumn(
  rules: AproAntFilterRule[],
  column: AproAntFilterColumn,
): AproAntFilterRule | undefined {
  return rules.find((r) => r.column === column);
}

export function isRuleComplete(rule: AproAntFilterRule): boolean {
  switch (rule.column) {
    case "fecha":
      return !!(rule.from || rule.to);
    case "empleado":
    case "tipo":
    case "proyecto":
    case "estado":
      return rule.values.length > 0;
    case "codigo":
    case "motivo":
      return !!rule.text.trim();
    default:
      return false;
  }
}

export function createEmptyRule(column: AproAntFilterColumn): AproAntFilterRule {
  const id = newFilterId();
  switch (column) {
    case "fecha":
      return { id, column: "fecha" };
    case "empleado":
    case "tipo":
    case "proyecto":
    case "estado":
      return { id, column, values: [] };
    case "codigo":
    case "motivo":
      return { id, column, text: "" };
    default:
      return { id, column: "codigo", text: "" };
  }
}
