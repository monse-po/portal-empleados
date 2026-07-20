import { format, parse } from "date-fns";
import type { IconName } from "@/src/components/ui/Icon";
import { dmyToSortKey } from "@/src/lib/tiempo-bridge";
import type { Anticipo, AnticipoTab } from "@/src/lib/mis-anticipos-mock";
import {
  filterAnticiposByTab,
  getBeneficiarioNombre,
} from "@/src/lib/mis-anticipos-mock";

export type AnticipoFilterColumn =
  | "codigo"
  | "fecha"
  | "proyecto"
  | "tipo"
  | "beneficiario"
  | "motivo"
  | "estado";

export type AnticipoFilterRule =
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
      column: "proyecto" | "tipo" | "estado" | "beneficiario";
      values: string[];
    };

export type AnticipoFilterColumnDef = {
  id: AnticipoFilterColumn;
  label: string;
  icon: IconName;
};

export const ANT_FILTER_COLUMNS_BASE: AnticipoFilterColumnDef[] = [
  { id: "codigo", label: "Código", icon: "copy" },
  { id: "fecha", label: "Solicitado", icon: "calendar" },
  { id: "proyecto", label: "Proyecto", icon: "folderOpen" },
  { id: "tipo", label: "Tipo", icon: "briefcase" },
  { id: "beneficiario", label: "Beneficiario", icon: "user" },
  { id: "motivo", label: "Motivo", icon: "pencil" },
];

export const ANT_FILTER_COLUMN_ESTADO: AnticipoFilterColumnDef = {
  id: "estado",
  label: "Estado",
  icon: "checkSquare",
};

export function getFilterColumns(
  tab: AnticipoTab,
): AnticipoFilterColumnDef[] {
  if (tab === "disponibles") {
    return [...ANT_FILTER_COLUMNS_BASE, ANT_FILTER_COLUMN_ESTADO];
  }
  return ANT_FILTER_COLUMNS_BASE;
}

export function getFilterColumnDef(
  column: AnticipoFilterColumn,
): AnticipoFilterColumnDef {
  const all = [...ANT_FILTER_COLUMNS_BASE, ANT_FILTER_COLUMN_ESTADO];
  return (
    all.find((c) => c.id === column) ?? {
      id: column,
      label: column,
      icon: "filter",
    }
  );
}

export function newFilterId(): string {
  return `ant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isoToDmy(iso: string): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return format(d, "dd/MM/yyyy");
}

function getFieldValue(s: Anticipo, col: AnticipoFilterColumn): string {
  switch (col) {
    case "codigo":
      return s.no;
    case "fecha":
      return s.fecha;
    case "proyecto":
      return s.proy;
    case "tipo":
      return s.tipo;
    case "beneficiario":
      return getBeneficiarioNombre(s);
    case "motivo":
      return s.motivo;
    case "estado":
      return s.estado;
    default:
      return "";
  }
}

export function getDistinctValues(
  registros: Anticipo[],
  col: "proyecto" | "tipo" | "estado" | "beneficiario",
): string[] {
  const set = new Set<string>();
  registros.forEach((s) => {
    const v = getFieldValue(s, col);
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function matchRule(s: Anticipo, rule: AnticipoFilterRule): boolean {
  switch (rule.column) {
    case "fecha": {
      const dKey = dmyToSortKey(s.fecha);
      const fromKey = rule.from ? dmyToSortKey(isoToDmy(rule.from)) : null;
      const toKey = rule.to ? dmyToSortKey(isoToDmy(rule.to)) : null;
      if (fromKey !== null && dKey < fromKey) return false;
      if (toKey !== null && dKey > toKey) return false;
      return true;
    }
    case "proyecto":
    case "tipo":
    case "estado":
    case "beneficiario": {
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

export function applyAnticipoFilters(
  registros: Anticipo[],
  rules: AnticipoFilterRule[],
): Anticipo[] {
  const active = rules.filter(isRuleComplete);
  if (!active.length) return registros;
  return registros.filter((s) => active.every((r) => matchRule(s, r)));
}

export function hayFiltrosActivos(rules: AnticipoFilterRule[]): boolean {
  return rules.some(isRuleComplete);
}

export function upsertFilterRule(
  rules: AnticipoFilterRule[],
  rule: AnticipoFilterRule,
): AnticipoFilterRule[] {
  const idx = rules.findIndex((r) => r.column === rule.column);
  if (idx >= 0) {
    return rules.map((r, i) => (i === idx ? rule : r));
  }
  return [...rules, rule];
}

export function removeFilterByColumn(
  rules: AnticipoFilterRule[],
  column: AnticipoFilterColumn,
): AnticipoFilterRule[] {
  return rules.filter((r) => r.column !== column);
}

export function getFilterForColumn(
  rules: AnticipoFilterRule[],
  column: AnticipoFilterColumn,
): AnticipoFilterRule | undefined {
  return rules.find((r) => r.column === column);
}

export function isRuleComplete(rule: AnticipoFilterRule): boolean {
  switch (rule.column) {
    case "fecha":
      return !!(rule.from || rule.to);
    case "proyecto":
    case "tipo":
    case "estado":
    case "beneficiario":
      return rule.values.length > 0;
    case "codigo":
    case "motivo":
      return !!rule.text.trim();
    default:
      return false;
  }
}

export function createEmptyRule(column: AnticipoFilterColumn): AnticipoFilterRule {
  const id = newFilterId();
  switch (column) {
    case "fecha":
      return { id, column: "fecha" };
    case "proyecto":
    case "tipo":
    case "estado":
    case "beneficiario":
      return { id, column, values: [] };
    case "codigo":
    case "motivo":
      return { id, column, text: "" };
    default:
      return { id, column: "codigo", text: "" };
  }
}

export function getAnticiposRegistrosTab(
  anticipos: Record<string, Anticipo>,
  tab: AnticipoTab,
): Anticipo[] {
  return filterAnticiposByTab(anticipos, tab);
}
