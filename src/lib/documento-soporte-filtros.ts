import { format, parse } from "date-fns";
import type { IconName } from "@/src/components/ui/Icon";
import { dmyToSortKey } from "@/src/lib/tiempo-bridge";
import type {
  DocumentoSoporte,
  DocumentoSoporteTab,
} from "@/src/lib/documento-soporte-mock";

export type DocumentoSoporteFilterColumn =
  | "codigo"
  | "fecha"
  | "nif"
  | "documento"
  | "concepto"
  | "estado";

export type DocumentoSoporteFilterRule =
  | {
      id: string;
      column: "codigo" | "nif" | "documento" | "concepto";
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
      column: "estado";
      values: string[];
    };

export type DocumentoSoporteFilterColumnDef = {
  id: DocumentoSoporteFilterColumn;
  label: string;
  icon: IconName;
};

export const DS_FILTER_COLUMNS_BASE: DocumentoSoporteFilterColumnDef[] = [
  { id: "codigo", label: "Código", icon: "copy" },
  { id: "fecha", label: "Solicitado", icon: "calendar" },
  { id: "nif", label: "NIF", icon: "userCircle" },
  { id: "documento", label: "No. Documento", icon: "paperclip" },
  { id: "concepto", label: "Concepto", icon: "pencil" },
];

export const DS_FILTER_COLUMN_ESTADO: DocumentoSoporteFilterColumnDef = {
  id: "estado",
  label: "Estado",
  icon: "checkSquare",
};

export function getFilterColumns(
  tab: DocumentoSoporteTab,
): DocumentoSoporteFilterColumnDef[] {
  if (tab === "historial") {
    return [...DS_FILTER_COLUMNS_BASE, DS_FILTER_COLUMN_ESTADO];
  }
  return DS_FILTER_COLUMNS_BASE;
}

export function getFilterColumnDef(
  column: DocumentoSoporteFilterColumn,
): DocumentoSoporteFilterColumnDef {
  const all = [...DS_FILTER_COLUMNS_BASE, DS_FILTER_COLUMN_ESTADO];
  return (
    all.find((c) => c.id === column) ?? {
      id: column,
      label: column,
      icon: "filter",
    }
  );
}

export function newFilterId(): string {
  return `ds-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isoToDmy(iso: string): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return format(d, "dd/MM/yyyy");
}

function getFieldValue(
  s: DocumentoSoporte,
  col: DocumentoSoporteFilterColumn,
): string {
  switch (col) {
    case "codigo":
      return s.no;
    case "fecha":
      return s.fecha;
    case "nif":
      return s.nif;
    case "documento":
      return s.noDocumentoOriginal;
    case "concepto":
      return s.concepto;
    case "estado":
      return s.estado;
    default:
      return "";
  }
}

export function getDistinctValues(
  registros: DocumentoSoporte[],
  col: "estado",
): string[] {
  const set = new Set<string>();
  registros.forEach((s) => {
    const v = getFieldValue(s, col);
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function matchRule(
  s: DocumentoSoporte,
  rule: DocumentoSoporteFilterRule,
): boolean {
  switch (rule.column) {
    case "fecha": {
      const dKey = dmyToSortKey(s.fecha);
      const fromKey = rule.from ? dmyToSortKey(isoToDmy(rule.from)) : null;
      const toKey = rule.to ? dmyToSortKey(isoToDmy(rule.to)) : null;
      if (fromKey !== null && dKey < fromKey) return false;
      if (toKey !== null && dKey > toKey) return false;
      return true;
    }
    case "estado": {
      if (!rule.values.length) return true;
      return rule.values.includes(getFieldValue(s, rule.column));
    }
    case "codigo":
    case "nif":
    case "documento":
    case "concepto": {
      const q = rule.text.trim().toLowerCase();
      if (!q) return true;
      return getFieldValue(s, rule.column).toLowerCase().includes(q);
    }
    default:
      return true;
  }
}

export function applyDocumentoSoporteFilters(
  registros: DocumentoSoporte[],
  rules: DocumentoSoporteFilterRule[],
): DocumentoSoporte[] {
  const active = rules.filter(isRuleComplete);
  if (!active.length) return registros;
  return registros.filter((s) => active.every((r) => matchRule(s, r)));
}

export function hayFiltrosActivos(rules: DocumentoSoporteFilterRule[]): boolean {
  return rules.some(isRuleComplete);
}

export function upsertFilterRule(
  rules: DocumentoSoporteFilterRule[],
  rule: DocumentoSoporteFilterRule,
): DocumentoSoporteFilterRule[] {
  const idx = rules.findIndex((r) => r.column === rule.column);
  if (idx >= 0) return rules.map((r, i) => (i === idx ? rule : r));
  return [...rules, rule];
}

export function removeFilterByColumn(
  rules: DocumentoSoporteFilterRule[],
  column: DocumentoSoporteFilterColumn,
): DocumentoSoporteFilterRule[] {
  return rules.filter((r) => r.column !== column);
}

export function getFilterForColumn(
  rules: DocumentoSoporteFilterRule[],
  column: DocumentoSoporteFilterColumn,
): DocumentoSoporteFilterRule | undefined {
  return rules.find((r) => r.column === column);
}

export function isRuleComplete(rule: DocumentoSoporteFilterRule): boolean {
  switch (rule.column) {
    case "fecha":
      return !!(rule.from || rule.to);
    case "estado":
      return rule.values.length > 0;
    case "codigo":
    case "nif":
    case "documento":
    case "concepto":
      return !!rule.text.trim();
    default:
      return false;
  }
}

export function createEmptyRule(
  column: DocumentoSoporteFilterColumn,
): DocumentoSoporteFilterRule {
  const id = newFilterId();
  switch (column) {
    case "fecha":
      return { id, column: "fecha" };
    case "estado":
      return { id, column: "estado", values: [] };
    case "codigo":
    case "nif":
    case "documento":
    case "concepto":
      return { id, column, text: "" };
    default:
      return { id, column: "codigo", text: "" };
  }
}
