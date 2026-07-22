import { format, parse } from "date-fns";
import type { IconName } from "@/src/components/ui/Icon";
import { labelTipoLegalizacion } from "@/src/components/ui/TipoLegalizacionPill";
import { dmyToSortKey } from "@/src/lib/tiempo-bridge";
import type { LegalizacionApro } from "@/src/lib/aprobacion-legalizaciones-mock";

export type AproLegFilterColumn =
  | "codigo"
  | "fecha"
  | "empleado"
  | "tipo"
  | "concepto"
  | "motivo"
  | "estado";

export type AproLegFilterRule =
  | {
      id: string;
      column: "codigo" | "concepto" | "motivo";
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
      column: "empleado" | "tipo" | "estado";
      values: string[];
    };

export type AproLegFilterColumnDef = {
  id: AproLegFilterColumn;
  label: string;
  icon: IconName;
};

export const APRO_LEG_FILTER_COLUMNS_BASE: AproLegFilterColumnDef[] = [
  { id: "codigo", label: "Código", icon: "copy" },
  { id: "fecha", label: "Solicitado", icon: "calendar" },
  { id: "empleado", label: "Empleado", icon: "user" },
  { id: "tipo", label: "Tipo", icon: "briefcase" },
  { id: "concepto", label: "Concepto", icon: "folderOpen" },
  { id: "motivo", label: "Motivo", icon: "pencil" },
];

export const APRO_LEG_FILTER_COLUMN_ESTADO: AproLegFilterColumnDef = {
  id: "estado",
  label: "Estado",
  icon: "checkSquare",
};

export function getFilterColumns(
  tab: "pend" | "res",
): AproLegFilterColumnDef[] {
  if (tab === "res") {
    return [...APRO_LEG_FILTER_COLUMNS_BASE, APRO_LEG_FILTER_COLUMN_ESTADO];
  }
  return APRO_LEG_FILTER_COLUMNS_BASE;
}

export function getFilterColumnDef(
  column: AproLegFilterColumn,
): AproLegFilterColumnDef {
  const all = [...APRO_LEG_FILTER_COLUMNS_BASE, APRO_LEG_FILTER_COLUMN_ESTADO];
  return (
    all.find((c) => c.id === column) ?? {
      id: column,
      label: column,
      icon: "filter",
    }
  );
}

export function newFilterId(): string {
  return `fleg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isoToDmy(iso: string): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return format(d, "dd/MM/yyyy");
}

function getFieldValue(
  s: LegalizacionApro,
  col: AproLegFilterColumn,
): string {
  switch (col) {
    case "codigo":
      return s.no;
    case "fecha":
      return s.fecha;
    case "empleado":
      return s.solicitante;
    case "tipo":
      return labelTipoLegalizacion(s.tipo);
    case "concepto":
      return s.concepto;
    case "motivo":
      return s.motivo;
    case "estado":
      return s.estadoApro || "";
    default:
      return "";
  }
}

export function getDistinctValues(
  registros: LegalizacionApro[],
  col: "empleado" | "tipo" | "estado",
): string[] {
  const set = new Set<string>();
  registros.forEach((s) => {
    const v = getFieldValue(s, col);
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function matchRule(s: LegalizacionApro, rule: AproLegFilterRule): boolean {
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
    case "estado": {
      if (!rule.values.length) return true;
      return rule.values.includes(getFieldValue(s, rule.column));
    }
    case "codigo":
    case "concepto":
    case "motivo": {
      const q = rule.text.trim().toLowerCase();
      if (!q) return true;
      return getFieldValue(s, rule.column).toLowerCase().includes(q);
    }
    default:
      return true;
  }
}

export function applyAproLegFilters(
  registros: LegalizacionApro[],
  rules: AproLegFilterRule[],
): LegalizacionApro[] {
  const active = rules.filter(isRuleComplete);
  if (!active.length) return registros;
  return registros.filter((s) => active.every((r) => matchRule(s, r)));
}

export function hayFiltrosActivos(rules: AproLegFilterRule[]): boolean {
  return rules.some(isRuleComplete);
}

export function upsertFilterRule(
  rules: AproLegFilterRule[],
  rule: AproLegFilterRule,
): AproLegFilterRule[] {
  const idx = rules.findIndex((r) => r.column === rule.column);
  if (idx >= 0) {
    return rules.map((r, i) => (i === idx ? rule : r));
  }
  return [...rules, rule];
}

export function removeFilterByColumn(
  rules: AproLegFilterRule[],
  column: AproLegFilterColumn,
): AproLegFilterRule[] {
  return rules.filter((r) => r.column !== column);
}

export function getFilterForColumn(
  rules: AproLegFilterRule[],
  column: AproLegFilterColumn,
): AproLegFilterRule | undefined {
  return rules.find((r) => r.column === column);
}

export function isRuleComplete(rule: AproLegFilterRule): boolean {
  switch (rule.column) {
    case "fecha":
      return !!(rule.from || rule.to);
    case "empleado":
    case "tipo":
    case "estado":
      return rule.values.length > 0;
    case "codigo":
    case "concepto":
    case "motivo":
      return !!rule.text.trim();
    default:
      return false;
  }
}

export function createEmptyRule(column: AproLegFilterColumn): AproLegFilterRule {
  const id = newFilterId();
  switch (column) {
    case "fecha":
      return { id, column: "fecha" };
    case "empleado":
    case "tipo":
    case "estado":
      return { id, column, values: [] };
    case "codigo":
    case "concepto":
    case "motivo":
      return { id, column, text: "" };
    default:
      return { id, column: "codigo", text: "" };
  }
}
