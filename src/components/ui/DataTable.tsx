import type { ReactNode } from "react";

type DataTableProps = {
  /** Column widths as CSS values, e.g. "10%", "72px" */
  colWidths: string[];
  children: ReactNode;
  className?: string;
};

export function DataTable({ colWidths, children, className = "" }: DataTableProps) {
  return (
    <table
      className={`w-full table-fixed border-collapse text-[12px] ${className}`}
    >
      <colgroup>
        {colWidths.map((width, index) => (
          <col key={index} style={{ width }} />
        ))}
      </colgroup>
      {children}
    </table>
  );
}

const dataThBase =
  "border-b border-border bg-[#f8fafc] px-2 py-2 text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted whitespace-nowrap";

export const dataTh = `${dataThBase} text-left`;

export const dataThCenter = `${dataThBase} text-center`;

export const dataThRight = `${dataThBase} text-right`;

/** Evita que text-left de dataTh anule text-center / text-right */
export function dataThWithAlign(align?: string) {
  if (align === "text-center") return dataThCenter;
  if (align === "text-right") return dataThRight;
  return dataTh;
}

/** Columna checkbox — ancho fijo y centrado idéntico en `<th>` y `<td>` */
export const CHECKBOX_COL_WIDTH = "36px" as const;

const checkboxCellBase =
  "box-border w-[36px] min-w-[36px] max-w-[36px] px-2 py-2 text-center align-middle";

export const dataThCheck = `border-b border-border bg-[#f8fafc] ${checkboxCellBase}`;

export const dataTdCheck = `border-b border-[#f3f4f6] ${checkboxCellBase}`;

export function TableCheckboxWrap({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center">{children}</div>
  );
}

const dataTdBase =
  "min-w-0 border-b border-[#f3f4f6] px-2 py-2 align-middle";

export const dataTd = `${dataTdBase} text-left`;

/** Columna acciones — aprobar/rechazar (2 botones) o anular (1 botón) */
export const ACTION_COL_WIDTH = "72px" as const;

const actionPendFixed =
  "box-border w-[72px] min-w-[72px] max-w-[72px]";

const actionResFixed =
  "box-border w-[56px] min-w-[56px] max-w-[56px]";

export const dataThAction = `${dataThCenter} ${actionPendFixed} align-middle`;

export const dataTdAction = `${dataTdBase} text-center ${actionPendFixed}`;

export const dataThResAction = `${dataThCenter} ${actionResFixed} align-middle`;

export const dataTdResAction = `${dataTdBase} text-center ${actionResFixed}`;

export function TableActionWrap({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-1.5">{children}</div>
  );
}

export const dataTdTruncate = "truncate";

export const dataTdClamp =
  "line-clamp-2 break-words text-[12px] leading-[1.35] [overflow-wrap:anywhere]";

/** Tabs resueltas — mismas métricas que pendientes (`dataTd`); nombre legacy conservado */
export const dataTdRes = dataTd;

/** Valores numéricos cortos (horas, cantidades) — centrados (sin text-left) */
export const dataTdNumeric =
  `${dataTdBase} text-center font-semibold tabular-nums`;

export const dataTdResNumeric = dataTdNumeric;

/** Primera línea en celdas apiladas (proyecto, monto, estado, subproy) */
export const dataTdResPrimary = "truncate font-medium leading-snug";

/** Segunda línea en celdas apiladas */
export const dataTdResSecondary =
  "truncate text-[11px] leading-snug text-[#9ca3af]";

/** Mi Tiempo — vista día e historial (7 columnas de datos) */
export const MI_TIEMPO_COLS = [
  "11%",
  "13%",
  "9%",
  "6%",
  "24%",
  "22%",
  "10%",
] as const;

/** Mi Tiempo — vista día con columna de acciones */
export const MI_TIEMPO_DIA_COLS = [...MI_TIEMPO_COLS, "5%"] as const;

/** Aprobación — pendientes */
export const APRO_PEND_COLS = [
  CHECKBOX_COL_WIDTH,
  "8%",
  "11%",
  "10%",
  "5%",
  "13%",
  "13%",
  "26%",
  ACTION_COL_WIDTH,
] as const;

export const TABLE_PAGE_SIZE = 50;

/**
 * Tabs resueltas — view-wide 1320px.
 * Columnas compactas usan 2 líneas apiladas → menos % horizontal → más para Motivo.
 */
export const RES_TAB_SPACER_COL = "28px" as const;
export const RES_TAB_ACTION_COL = "56px" as const;
export const RES_TAB_PCT_BUDGET = {
  SPACER_ONLY: 97,
  WITH_ACTION: 93,
} as const;

/** Anticipos resueltas — proporciones alineadas a pendientes (+estado; motivo 26%) */
export const APRO_ANT_COLS_RES = [
  RES_TAB_SPACER_COL,
  "9%",   // Código (igual pendientes)
  "8%",   // Solicitado
  "12%",  // Empleado
  "7%",   // Tipo pill
  "13%",  // Proyecto (2 líneas, igual pendientes)
  "10%",  // Monto + divisa (2 líneas)
  "8%",   // Estado pill + fecha (2 líneas)
  "30%",  // Motivo decisión
] as const;

/** Legalizaciones resueltas — sin proyecto; concepto + motivo decisión */
export const APRO_LEG_COLS_RES = [
  RES_TAB_SPACER_COL,
  "9%",   // Código
  "8%",   // Solicitado
  "12%",  // Empleado
  "9%",   // Tipo pill
  "16%",  // Concepto
  "10%",  // Monto + divisa
  "8%",   // Estado pill + fecha
  "28%",  // Motivo decisión
] as const;

/** Tiempo resueltas — mismas proporciones que pendientes (comentario→motivo 26%, +estado 8%) */
export const APRO_RES_COLS = [
  RES_TAB_SPACER_COL,
  "8%",   // Fecha (igual pendientes)
  "11%",  // Empleado
  "9%",   // Tipo hora pill
  "5%",   // Horas
  "13%",  // Subproyecto (2 líneas, igual pendientes)
  "13%",  // Actividad
  "8%",   // Estado pill
  "26%",  // Motivo decisión (igual comentario en pendientes)
  RES_TAB_ACTION_COL,
] as const;
