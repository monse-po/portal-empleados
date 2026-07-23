import type { ReactNode } from "react";
import {
  EstadoAnticipoPill,
  EstadoLegalizacionPill,
  EstadoTiempoPill,
} from "@/src/components/ui/Pill";
import {
  TipoAnticipoPill,
  type AnticipoTipo,
} from "@/src/components/ui/TipoAnticipoPill";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import {
  TipoLegalizacionPill,
  labelTipoLegalizacion,
} from "@/src/components/ui/TipoLegalizacionPill";
import type { LegalizacionTipo } from "@/src/lib/legalizaciones-mock";

/** Módulo de negocio — alinea pills de filtro con tablas del mismo dominio */
export type FilterPillModule = "tiempo" | "anticipo" | "legalizacion";

/** Columnas multiselect cuyos valores se muestran como pill en filtros */
export const FILTER_PILL_COLUMNS = ["tipo", "estado"] as const;

export type FilterPillColumn = (typeof FILTER_PILL_COLUMNS)[number];

export function isFilterPillColumn(column: string): column is FilterPillColumn {
  return (FILTER_PILL_COLUMNS as readonly string[]).includes(column);
}

const LEGALIZACION_TIPOS = new Set<string>([
  "Con anticipo",
  "Tarjeta corporativa",
  "Sin anticipos",
]);

function asLegalizacionTipo(value: string): LegalizacionTipo | null {
  return LEGALIZACION_TIPOS.has(value) ? (value as LegalizacionTipo) : null;
}

function asAnticipoTipo(value: string): AnticipoTipo | null {
  return value === "Gasto" || value === "Viaje" ? value : null;
}

/** Pill de filtro con los mismos colores que en tablas del módulo */
export function FilterValuePill({
  module,
  column,
  value,
}: {
  module: FilterPillModule;
  column: FilterPillColumn;
  value: string;
}): ReactNode | null {
  if (module === "tiempo") {
    if (column === "tipo") return <TipoHoraPill tipo={value} />;
    if (column === "estado") return <EstadoTiempoPill estado={value} />;
  }

  if (module === "anticipo") {
    if (column === "tipo") {
      const tipo = asAnticipoTipo(value);
      return tipo ? <TipoAnticipoPill tipo={tipo} /> : null;
    }
    if (column === "estado") return <EstadoAnticipoPill estado={value} />;
  }

  if (module === "legalizacion") {
    if (column === "tipo") {
      const tipo = asLegalizacionTipo(value);
      return tipo ? <TipoLegalizacionPill tipo={tipo} /> : null;
    }
    if (column === "estado") return <EstadoLegalizacionPill estado={value} />;
  }

  return null;
}

export function filterPillLabel(
  module: FilterPillModule,
  column: FilterPillColumn,
  value: string,
  fallback: string,
): string {
  if (module === "legalizacion" && column === "tipo") {
    const tipo = asLegalizacionTipo(value);
    if (tipo) return labelTipoLegalizacion(tipo);
  }
  return fallback;
}
