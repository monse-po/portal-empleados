import { format, parse } from "date-fns";
import type { IconName } from "@/src/components/ui/Icon";
import type { RegistroMock } from "@/src/lib/tiempo-registro";
import { getProyectoListaParts } from "@/src/lib/tiempo-bridge";

export type HistoricoFilterColumn =
  | "proyecto"
  | "fecha"
  | "actividad"
  | "tipo"
  | "subproyecto"
  | "comentario";

export type HistoricoFilterRule =
  | {
      id: string;
      column: "actividad" | "comentario";
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
      column: "proyecto" | "tipo" | "subproyecto";
      values: string[];
    };

export type HistoricoFilterColumnDef = {
  id: HistoricoFilterColumn;
  label: string;
  icon: IconName;
};

export const HISTORICO_FILTER_COLUMNS: HistoricoFilterColumnDef[] = [
  { id: "proyecto", label: "Proyecto", icon: "folderOpen" },
  { id: "fecha", label: "Fecha", icon: "calendar" },
  { id: "actividad", label: "Actividad", icon: "briefcase" },
  { id: "tipo", label: "Tipo", icon: "clock" },
  { id: "subproyecto", label: "Subproyecto", icon: "flag" },
  { id: "comentario", label: "Comentario", icon: "pencil" },
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
    case "actividad":
      return r.act;
    case "tipo":
      return r.tipo;
    case "subproyecto":
      return r.subproy ?? "";
    case "comentario":
      return r.comentario;
    default:
      return "";
  }
}

export function getDistinctValues(
  registros: RegistroMock[],
  col: "proyecto" | "tipo" | "subproyecto",
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
    case "tipo":
    case "subproyecto": {
      if (!rule.values.length) return true;
      return rule.values.includes(getFieldValue(r, rule.column));
    }
    case "actividad":
    case "comentario": {
      const q = rule.text.trim().toLowerCase();
      if (!q) return true;
      return getFieldValue(r, rule.column).toLowerCase().includes(q);
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
      return !!(rule.from || rule.to);
    case "proyecto":
    case "tipo":
    case "subproyecto":
      return rule.values.length > 0;
    case "actividad":
    case "comentario":
      return !!rule.text.trim();
    default:
      return false;
  }
}

export function createEmptyRule(column: HistoricoFilterColumn): HistoricoFilterRule {
  const id = newFilterId();
  switch (column) {
    case "fecha":
      return { id, column: "fecha" };
    case "proyecto":
    case "tipo":
    case "subproyecto":
      return { id, column, values: [] };
    case "actividad":
    case "comentario":
      return { id, column, text: "" };
    default:
      return { id, column: "actividad", text: "" };
  }
}
