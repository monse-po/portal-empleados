import { format, parse } from "date-fns";
import type { IconName } from "@/src/components/ui/Icon";
import { dmyToSortKey } from "@/src/lib/tiempo-bridge";
import { TIPO_HORA } from "@/src/lib/mi-tiempo-mock";
import { horasNum, type HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";

export type AproFilterColumn =
  | "fecha"
  | "empleado"
  | "tipo"
  | "horas"
  | "subproy"
  | "actividad"
  | "comentario"
  | "estado";

export type HorasFilterOp = "eq" | "gte" | "lte" | "between";

export type AproFilterRule =
  | {
      id: string;
      column: "fecha";
      from?: string;
      to?: string;
    }
  | {
      id: string;
      column: "empleado" | "tipo" | "subproy" | "actividad" | "estado";
      values: string[];
    }
  | {
      id: string;
      column: "horas";
      op: HorasFilterOp;
      value: number;
      valueTo?: number;
    }
  | {
      id: string;
      column: "comentario";
      text: string;
    };

export type AproFilterColumnDef = {
  id: AproFilterColumn;
  label: string;
  icon: IconName;
};

export const APRO_FILTER_COLUMNS_BASE: AproFilterColumnDef[] = [
  { id: "fecha", label: "Fecha", icon: "calendar" },
  { id: "empleado", label: "Empleado", icon: "user" },
  { id: "tipo", label: "Tipo Hora", icon: "clock" },
  { id: "horas", label: "Horas", icon: "hourglass" },
  { id: "subproy", label: "Subproyecto", icon: "folderOpen" },
  { id: "actividad", label: "Actividad", icon: "flag" },
  { id: "comentario", label: "Comentario", icon: "pencil" },
];

export const APRO_FILTER_COLUMN_ESTADO: AproFilterColumnDef = {
  id: "estado",
  label: "Estado",
  icon: "checkSquare",
};

export function getFilterColumns(tab: "pend" | "res"): AproFilterColumnDef[] {
  if (tab === "res") {
    return [...APRO_FILTER_COLUMNS_BASE, APRO_FILTER_COLUMN_ESTADO];
  }
  return APRO_FILTER_COLUMNS_BASE;
}

export function getFilterColumnDef(
  column: AproFilterColumn,
): AproFilterColumnDef {
  const all = [...APRO_FILTER_COLUMNS_BASE, APRO_FILTER_COLUMN_ESTADO];
  return (
    all.find((c) => c.id === column) ?? {
      id: column,
      label: column,
      icon: "filter",
    }
  );
}

export function newFilterId(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isoToDmy(iso: string): string {
  if (!iso) return "";
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return format(d, "dd/MM/yyyy");
}

function getFieldValue(h: HojaAprobacion, col: AproFilterColumn): string {
  switch (col) {
    case "fecha":
      return h.fecha;
    case "empleado":
      return h.solicitante || h.nombre || "";
    case "tipo":
      return h.tipo;
    case "subproy":
      return h.subproy;
    case "actividad":
      return h.actividad;
    case "comentario":
      return h.comentarioEmpleado || "";
    case "estado":
      return h.estadoApro || "";
    default:
      return "";
  }
}

export function getDistinctValues(
  hojas: HojaAprobacion[],
  col: "empleado" | "tipo" | "subproy" | "actividad" | "estado",
): string[] {
  const set = new Set<string>();
  hojas.forEach((h) => {
    const v = getFieldValue(h, col);
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function matchRule(h: HojaAprobacion, rule: AproFilterRule): boolean {
  switch (rule.column) {
    case "fecha": {
      const dKey = dmyToSortKey(h.fecha);
      const fromKey = rule.from ? dmyToSortKey(isoToDmy(rule.from)) : null;
      const toKey = rule.to ? dmyToSortKey(isoToDmy(rule.to)) : null;
      if (fromKey !== null && dKey < fromKey) return false;
      if (toKey !== null && dKey > toKey) return false;
      return true;
    }
    case "empleado":
    case "tipo":
    case "subproy":
    case "actividad":
    case "estado": {
      if (!rule.values.length) return true;
      return rule.values.includes(getFieldValue(h, rule.column));
    }
    case "horas": {
      const n = horasNum(h.horas);
      switch (rule.op) {
        case "eq":
          return n === rule.value;
        case "gte":
          return n >= rule.value;
        case "lte":
          return n <= rule.value;
        case "between":
          return n >= rule.value && n <= (rule.valueTo ?? rule.value);
        default:
          return true;
      }
    }
    case "comentario": {
      const q = rule.text.trim().toLowerCase();
      if (!q) return true;
      return (h.comentarioEmpleado || "").toLowerCase().includes(q);
    }
    default:
      return true;
  }
}

export function applyAproFilters(
  hojas: HojaAprobacion[],
  rules: AproFilterRule[],
): HojaAprobacion[] {
  const active = rules.filter(isRuleComplete);
  if (!active.length) return hojas;
  return hojas.filter((h) => active.every((r) => matchRule(h, r)));
}

export function hayFiltrosActivos(rules: AproFilterRule[]): boolean {
  return rules.some(isRuleComplete);
}

function valueLabel(col: AproFilterColumn, val: string): string {
  if (col === "tipo" && TIPO_HORA[val]?.s) return TIPO_HORA[val].s;
  return val;
}

export function upsertFilterRule(
  rules: AproFilterRule[],
  rule: AproFilterRule,
): AproFilterRule[] {
  const idx = rules.findIndex((r) => r.column === rule.column);
  if (idx >= 0) {
    return rules.map((r, i) => (i === idx ? rule : r));
  }
  return [...rules, rule];
}

export function removeFilterByColumn(
  rules: AproFilterRule[],
  column: AproFilterColumn,
): AproFilterRule[] {
  return rules.filter((r) => r.column !== column);
}

export function getFilterForColumn(
  rules: AproFilterRule[],
  column: AproFilterColumn,
): AproFilterRule | undefined {
  return rules.find((r) => r.column === column);
}

const HORAS_OP_LABEL: Record<HorasFilterOp, string> = {
  eq: "=",
  gte: "≥",
  lte: "≤",
  between: "entre",
};

const COLUMN_LABEL: Record<AproFilterColumn, string> = {
  fecha: "Fecha",
  empleado: "Empleado",
  tipo: "Tipo Hora",
  horas: "Horas",
  subproy: "Subproyecto",
  actividad: "Actividad",
  comentario: "Comentario",
  estado: "Estado",
};

function formatMultiChip(col: AproFilterColumn, values: string[]): string {
  const label = COLUMN_LABEL[col];
  if (values.length === 1) {
    return `${label}: ${valueLabel(col, values[0])}`;
  }
  return `${label}: ${valueLabel(col, values[0])}, +${values.length - 1}`;
}

export function formatFilterChip(rule: AproFilterRule): string {
  const col = COLUMN_LABEL[rule.column];
  switch (rule.column) {
    case "fecha": {
      const from = rule.from ? isoToDmy(rule.from) : "";
      const to = rule.to ? isoToDmy(rule.to) : "";
      if (from && to) return `${col}: ${from} – ${to}`;
      if (from) return `${col}: desde ${from}`;
      if (to) return `${col}: hasta ${to}`;
      return col;
    }
    case "empleado":
    case "tipo":
    case "subproy":
    case "actividad":
    case "estado":
      return formatMultiChip(rule.column, rule.values);
    case "horas": {
      const op = HORAS_OP_LABEL[rule.op];
      if (rule.op === "between") {
        return `${col}: ${op} ${rule.value} y ${rule.valueTo ?? rule.value}`;
      }
      return `${col}: ${op} ${rule.value}`;
    }
    case "comentario":
      return `${col}: contiene "${rule.text.trim()}"`;
    default:
      return col;
  }
}

export function isRuleComplete(rule: AproFilterRule): boolean {
  switch (rule.column) {
    case "fecha":
      return !!(rule.from || rule.to);
    case "empleado":
    case "tipo":
    case "subproy":
    case "actividad":
    case "estado":
      return rule.values.length > 0;
    case "horas":
      if (rule.op === "between") {
        return (
          rule.value !== undefined &&
          rule.valueTo !== undefined &&
          !Number.isNaN(rule.value) &&
          !Number.isNaN(rule.valueTo)
        );
      }
      return rule.value !== undefined && !Number.isNaN(rule.value);
    case "comentario":
      return !!rule.text.trim();
    default:
      return false;
  }
}

export function createEmptyRule(column: AproFilterColumn): AproFilterRule {
  const id = newFilterId();
  switch (column) {
    case "fecha":
      return { id, column: "fecha" };
    case "empleado":
    case "tipo":
    case "subproy":
    case "actividad":
    case "estado":
      return { id, column, values: [] };
    case "horas":
      return { id, column: "horas", op: "eq", value: 8 };
    case "comentario":
      return { id, column: "comentario", text: "" };
    default:
      return { id, column: "fecha" };
  }
}
