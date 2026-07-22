import { format, parse } from "date-fns";
import type { IconName } from "@/src/components/ui/Icon";
import { labelTipoLegalizacion } from "@/src/components/ui/TipoLegalizacionPill";
import { dmyToSortKey } from "@/src/lib/tiempo-bridge";
import type {
  Legalizacion,
  LegalizacionTab,
} from "@/src/lib/legalizaciones-mock";

export type LegalizacionFilterColumn =
  | "codigo"
  | "fecha"
  | "tipo"
  | "concepto"
  | "motivo"
  | "estado";

export type LegalizacionFilterRule =
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
      column: "tipo" | "estado";
      values: string[];
    };

export type LegalizacionFilterColumnDef = {
  id: LegalizacionFilterColumn;
  label: string;
  icon: IconName;
};

export const LEG_FILTER_COLUMNS_BASE: LegalizacionFilterColumnDef[] = [
  { id: "codigo", label: "Código", icon: "copy" },
  { id: "fecha", label: "Solicitado", icon: "calendar" },
  { id: "tipo", label: "Tipo", icon: "briefcase" },
  { id: "concepto", label: "Concepto", icon: "folderOpen" },
  { id: "motivo", label: "Motivo", icon: "pencil" },
];

export const LEG_FILTER_COLUMN_ESTADO: LegalizacionFilterColumnDef = {
  id: "estado",
  label: "Estado",
  icon: "checkSquare",
};

export function getFilterColumns(
  tab: LegalizacionTab,
): LegalizacionFilterColumnDef[] {
  if (tab === "historial") {
    return [...LEG_FILTER_COLUMNS_BASE, LEG_FILTER_COLUMN_ESTADO];
  }
  return LEG_FILTER_COLUMNS_BASE;
}

export function getFilterColumnDef(
  column: LegalizacionFilterColumn,
): LegalizacionFilterColumnDef {
  const all = [...LEG_FILTER_COLUMNS_BASE, LEG_FILTER_COLUMN_ESTADO];
  return (
    all.find((c) => c.id === column) ?? {
      id: column,
      label: column,
      icon: "filter",
    }
  );
}

export function newFilterId(): string {
  return `leg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isoToDmy(iso: string): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return format(d, "dd/MM/yyyy");
}

function getFieldValue(
  s: Legalizacion,
  col: LegalizacionFilterColumn,
): string {
  switch (col) {
    case "codigo":
      return s.no;
    case "fecha":
      return s.fecha;
    case "tipo":
      return labelTipoLegalizacion(s.tipo);
    case "concepto":
      return s.concepto;
    case "motivo":
      return s.motivo;
    case "estado":
      return s.estado;
    default:
      return "";
  }
}

export function getDistinctValues(
  registros: Legalizacion[],
  col: "tipo" | "estado",
): string[] {
  const set = new Set<string>();
  registros.forEach((s) => {
    const v = getFieldValue(s, col);
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function matchRule(s: Legalizacion, rule: LegalizacionFilterRule): boolean {
  switch (rule.column) {
    case "fecha": {
      const dKey = dmyToSortKey(s.fecha);
      const fromKey = rule.from ? dmyToSortKey(isoToDmy(rule.from)) : null;
      const toKey = rule.to ? dmyToSortKey(isoToDmy(rule.to)) : null;
      if (fromKey !== null && dKey < fromKey) return false;
      if (toKey !== null && dKey > toKey) return false;
      return true;
    }
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

export function applyLegalizacionFilters(
  registros: Legalizacion[],
  rules: LegalizacionFilterRule[],
): Legalizacion[] {
  const active = rules.filter(isRuleComplete);
  if (!active.length) return registros;
  return registros.filter((s) => active.every((r) => matchRule(s, r)));
}

export function hayFiltrosActivos(rules: LegalizacionFilterRule[]): boolean {
  return rules.some(isRuleComplete);
}

export function upsertFilterRule(
  rules: LegalizacionFilterRule[],
  rule: LegalizacionFilterRule,
): LegalizacionFilterRule[] {
  const idx = rules.findIndex((r) => r.column === rule.column);
  if (idx >= 0) {
    return rules.map((r, i) => (i === idx ? rule : r));
  }
  return [...rules, rule];
}

export function removeFilterByColumn(
  rules: LegalizacionFilterRule[],
  column: LegalizacionFilterColumn,
): LegalizacionFilterRule[] {
  return rules.filter((r) => r.column !== column);
}

export function getFilterForColumn(
  rules: LegalizacionFilterRule[],
  column: LegalizacionFilterColumn,
): LegalizacionFilterRule | undefined {
  return rules.find((r) => r.column === column);
}

export function isRuleComplete(rule: LegalizacionFilterRule): boolean {
  switch (rule.column) {
    case "fecha":
      return !!(rule.from || rule.to);
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

export function createEmptyRule(
  column: LegalizacionFilterColumn,
): LegalizacionFilterRule {
  const id = newFilterId();
  switch (column) {
    case "fecha":
      return { id, column: "fecha" };
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
