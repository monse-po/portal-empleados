import type { IconName } from "@/src/components/ui/Icon";
import type {
  HorasEmpleadoAprobacion,
  HorasProyectoAprobacion,
} from "@/src/lib/ifs/tiempo-approval";

export type AproProyFilterColumn =
  | "proyecto"
  | "nombre"
  | "empleado"
  | "cedula"
  | "porAprobar"
  | "acumulado";

export type AproProyFilterLevel = "proyecto" | "empleado";

export type HorasFilterOp = "eq" | "gte" | "lte" | "between";

export type AproProyFilterRule =
  | {
      id: string;
      column: "nombre" | "cedula";
      text: string;
    }
  | {
      id: string;
      column: "proyecto" | "empleado";
      values: string[];
    }
  | {
      id: string;
      column: "porAprobar" | "acumulado";
      op: HorasFilterOp;
      value: number;
      valueTo?: number;
    };

export type AproProyFilterColumnDef = {
  id: AproProyFilterColumn;
  label: string;
  icon: IconName;
};

const COLS_PROYECTO: AproProyFilterColumnDef[] = [
  { id: "proyecto", label: "Proyecto", icon: "folderOpen" },
  { id: "nombre", label: "Nombre", icon: "pencil" },
  { id: "porAprobar", label: "Por aprobar", icon: "hourglass" },
  { id: "acumulado", label: "Acumulado", icon: "clock" },
];

const COLS_EMPLEADO: AproProyFilterColumnDef[] = [
  { id: "empleado", label: "Empleado", icon: "user" },
  { id: "cedula", label: "Cédula", icon: "copy" },
  { id: "porAprobar", label: "Por aprobar", icon: "hourglass" },
  { id: "acumulado", label: "Acumulado", icon: "clock" },
];

export function getFilterColumns(
  level: AproProyFilterLevel,
): AproProyFilterColumnDef[] {
  return level === "empleado" ? COLS_EMPLEADO : COLS_PROYECTO;
}

export function getFilterColumnDef(
  column: AproProyFilterColumn,
): AproProyFilterColumnDef {
  const all = [...COLS_PROYECTO, ...COLS_EMPLEADO];
  return (
    all.find((c) => c.id === column) ?? {
      id: column,
      label: column,
      icon: "filter",
    }
  );
}

export function newFilterId(): string {
  return `fp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyRule(
  column: AproProyFilterColumn,
): AproProyFilterRule {
  if (column === "nombre" || column === "cedula") {
    return { id: newFilterId(), column, text: "" };
  }
  if (column === "porAprobar" || column === "acumulado") {
    return { id: newFilterId(), column, op: "gte", value: Number.NaN };
  }
  return { id: newFilterId(), column, values: [] };
}

export function isRuleComplete(rule: AproProyFilterRule): boolean {
  if (rule.column === "nombre" || rule.column === "cedula") {
    return rule.text.trim().length > 0;
  }
  if (rule.column === "porAprobar" || rule.column === "acumulado") {
    if (rule.op === "between") {
      return (
        !Number.isNaN(rule.value) &&
        rule.valueTo !== undefined &&
        !Number.isNaN(rule.valueTo)
      );
    }
    return !Number.isNaN(rule.value);
  }
  return rule.values.length > 0;
}

export function hayFiltrosActivos(filters: AproProyFilterRule[]): boolean {
  return filters.some(isRuleComplete);
}

export function getFilterForColumn(
  filters: AproProyFilterRule[],
  column: AproProyFilterColumn,
): AproProyFilterRule | undefined {
  return filters.find((f) => f.column === column);
}

export function upsertFilterRule(
  filters: AproProyFilterRule[],
  rule: AproProyFilterRule,
): AproProyFilterRule[] {
  const idx = filters.findIndex((f) => f.column === rule.column);
  if (idx === -1) return [...filters, rule];
  const next = [...filters];
  next[idx] = rule;
  return next;
}

export function removeFilterByColumn(
  filters: AproProyFilterRule[],
  column: AproProyFilterColumn,
): AproProyFilterRule[] {
  return filters.filter((f) => f.column !== column);
}

export function getDistinctProyectoCodigos(
  items: HorasProyectoAprobacion[],
): string[] {
  return [...new Set(items.map((p) => p.codigo).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

export function getDistinctEmpleadoNombres(
  items: HorasEmpleadoAprobacion[],
): string[] {
  return [...new Set(items.map((e) => e.nombre).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

export function horasOpLabel(op: HorasFilterOp): string {
  switch (op) {
    case "gte":
      return "≥";
    case "lte":
      return "≤";
    case "between":
      return "entre";
    default:
      return "=";
  }
}

function matchHoras(
  n: number,
  op: HorasFilterOp,
  value: number,
  valueTo?: number,
): boolean {
  switch (op) {
    case "eq":
      return n === value;
    case "gte":
      return n >= value;
    case "lte":
      return n <= value;
    case "between":
      return n >= value && n <= (valueTo ?? value);
    default:
      return true;
  }
}

function matchHorasRule(
  n: number,
  rule: Extract<AproProyFilterRule, { column: "porAprobar" | "acumulado" }>,
): boolean {
  return matchHoras(n, rule.op, rule.value, rule.valueTo);
}

export function applyProyectoFilters(
  items: HorasProyectoAprobacion[],
  filters: AproProyFilterRule[],
): HorasProyectoAprobacion[] {
  const active = filters.filter(isRuleComplete);
  if (!active.length) return items;
  return items.filter((p) =>
    active.every((rule) => {
      if (rule.column === "proyecto") {
        return rule.values.includes(p.codigo);
      }
      if (rule.column === "nombre") {
        const q = rule.text.trim().toLowerCase();
        return (
          p.nombre.toLowerCase().includes(q) ||
          p.codigo.toLowerCase().includes(q)
        );
      }
      if (rule.column === "porAprobar") {
        return matchHorasRule(p.horasPendientes, rule);
      }
      if (rule.column === "acumulado") {
        return matchHorasRule(p.horasAcumuladas, rule);
      }
      return true;
    }),
  );
}

export function applyEmpleadoFilters(
  items: HorasEmpleadoAprobacion[],
  filters: AproProyFilterRule[],
): HorasEmpleadoAprobacion[] {
  const active = filters.filter(isRuleComplete);
  if (!active.length) return items;
  return items.filter((e) =>
    active.every((rule) => {
      if (rule.column === "empleado") {
        return rule.values.includes(e.nombre);
      }
      if (rule.column === "cedula") {
        return e.empNo.toLowerCase().includes(rule.text.trim().toLowerCase());
      }
      if (rule.column === "porAprobar") {
        return matchHorasRule(e.horasPendientes, rule);
      }
      if (rule.column === "acumulado") {
        return matchHorasRule(e.horasAcumuladas, rule);
      }
      return true;
    }),
  );
}
