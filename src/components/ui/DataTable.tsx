import type { ReactNode } from "react";
import {
  splitEmpleadoNombreCodigo,
} from "@/src/lib/empleado-display";
import {
  baseProyectoCodigo,
  baseProyectoNombre,
} from "@/src/lib/proyecto-display";

export {
  empleadoCodigoDisplay,
  splitEmpleadoNombreCodigo,
} from "@/src/lib/empleado-display";

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

/** Clave/nombre que entra al siguiente nivel. Toda la etiqueta es el enlace. */
export function TableDrillLink({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="block w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[13px] font-semibold text-navy underline decoration-[#014783] underline-offset-2 hover:text-[#01376a] hover:decoration-[#01376a]"
    >
      {children}
    </button>
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

/** Código base (ProjectId) + descripción. El código es la línea principal. */
export function ProyectoCell({
  codigo,
  nombre,
  inline = false,
}: {
  codigo?: string | null;
  nombre?: string | null;
  /** Una línea: código semibold + nombre muted. */
  inline?: boolean;
}) {
  const code = baseProyectoCodigo(codigo);
  const desc = baseProyectoNombre(codigo, nombre);
  if (!code && !desc) {
    return <span className="text-muted">—</span>;
  }
  const title = [code, desc].filter(Boolean).join(" · ");
  if (inline) {
    return (
      <span className="block min-w-0 truncate" title={title}>
        <span className="font-semibold">{code || "—"}</span>
        {desc ? (
          <>
            {" "}
            <span className="text-[12px] font-normal text-[#9ca3af]">{desc}</span>
          </>
        ) : null}
      </span>
    );
  }
  return (
    <div className="min-w-0">
      <div className={`${dataTdResPrimary} font-semibold`} title={code}>
        {code || "—"}
      </div>
      {desc ? (
        <div className={dataTdResSecondary} title={desc}>
          {desc}
        </div>
      ) : null}
    </div>
  );
}

/** Código + nombre (subproyecto), misma geometría que ProyectoCell. */
export function SubproyectoCell({
  codigo,
  nombre,
  inline = false,
}: {
  codigo?: string | null;
  nombre?: string | null;
  inline?: boolean;
}) {
  const raw = (codigo || "").trim();
  const parts = raw.split("·").map((x) => x.trim());
  const code = parts[0] || "";
  const desc = (nombre || parts[1] || "").trim();
  if (!code && !desc) {
    return <span className="text-muted">—</span>;
  }
  const title = [code, desc !== code ? desc : ""].filter(Boolean).join(" · ");
  if (inline) {
    return (
      <span className="block min-w-0 truncate" title={title}>
        <span className="font-semibold">{code || "—"}</span>
        {desc && desc !== code ? (
          <>
            {" "}
            <span className="text-[12px] font-normal text-[#9ca3af]">{desc}</span>
          </>
        ) : null}
      </span>
    );
  }
  return (
    <div className="min-w-0">
      <div className={dataTdResPrimary} title={code || desc}>
        {code || "—"}
      </div>
      {desc && desc !== code ? (
        <div className={dataTdResSecondary} title={desc}>
          {desc}
        </div>
      ) : null}
    </div>
  );
}

/** Monto + divisa. Misma pila en anticipos, legalizaciones y DSE. */
export function MontoCell({
  monto,
  divisa,
  decimals,
}: {
  monto: number;
  divisa?: string | null;
  decimals?: number;
}) {
  const div = (divisa || "COP").trim() || "COP";
  const prefix: Record<string, string> = {
    COP: "$",
    USD: "US$",
    MXN: "$",
    PEN: "S/",
  };
  const pre = prefix[div] || "$";
  const abs = Math.abs(monto).toLocaleString(
    "es-CO",
    decimals != null
      ? {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }
      : undefined,
  );
  const sign = monto < 0 ? "-" : "";
  return (
    <div className="min-w-0 text-right">
      <div className="font-semibold leading-snug tabular-nums">
        {sign}
        {pre} {abs}
      </div>
      <div className={dataTdResSecondary}>{div}</div>
    </div>
  );
}

/** Nombre + código (EmpNo). El nombre es la línea principal. */
export function EmpleadoCell({
  nombre,
  codigo,
  inline = false,
}: {
  nombre?: string | null;
  codigo?: string | null;
  inline?: boolean;
}) {
  const { nombre: name, codigo: code } = splitEmpleadoNombreCodigo(
    nombre,
    codigo,
  );
  if (!name && !code) {
    return <span className="text-muted">—</span>;
  }
  if (inline) {
    return (
      <span
        className="block min-w-0 truncate"
        title={[name, code].filter(Boolean).join(" · ")}
      >
        {name ? <span className="font-semibold">{name}</span> : null}
        {code ? (
          <>
            {" "}
            <span className="text-[12px] font-normal tabular-nums text-[#9ca3af]">
              {code}
            </span>
          </>
        ) : null}
      </span>
    );
  }
  return (
    <div className="min-w-0">
      {name ? (
        <div className={dataTdResPrimary} title={name}>
          {name}
        </div>
      ) : null}
      {code ? (
        <div className={`${dataTdResSecondary} tabular-nums`} title={code}>
          {code}
        </div>
      ) : null}
    </div>
  );
}

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

/** Mi Tiempo — tab Lista (proyecto apilado + comentarios + acciones) */
export const MI_TIEMPO_LISTA_COLS = [
  "16%",
  "13%",
  "9%",
  "5%",
  "20%",
  "18%",
  "8%",
  "5%",
] as const;

/** Mi Tiempo — vista día con columna de acciones */
export const MI_TIEMPO_DIA_COLS = [...MI_TIEMPO_COLS, "5%"] as const;

/** Aprobación — pendientes (checkbox + datos; acciones van en BulkSelectionBar) */
export const APRO_PEND_COLS = [
  CHECKBOX_COL_WIDTH,
  "7%",
  "10%",
  "10%",
  "8%",
  "5%",
  "11%",
  "10%",
  "11%",
  "18%",
] as const;

export const TABLE_PAGE_SIZE = 50;

/**
 * Tabs resueltas — view-wide 1680px.
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
  "9%",   // Código
  "8%",   // Solicitado
  "12%",  // Empleado
  "7%",   // Tipo pill
  "13%",  // Proyecto
  "10%",  // Monto + divisa
  "8%",   // Estado pill + fecha
  "30%",  // Motivo decisión
] as const;

/** Legalizaciones resueltas — proyecto apilado (código + nombre) */
export const APRO_LEG_COLS_RES = [
  RES_TAB_SPACER_COL,
  "8%",   // Código
  "7%",   // Solicitado
  "11%",  // Empleado
  "10%",  // Aprobador
  "8%",   // Tipo pill
  "12%",  // Concepto
  "12%",  // Proyecto
  "8%",   // Monto + divisa
  "8%",   // Estado pill + fecha
  "13%",  // Motivo decisión
] as const;

/** Tiempo resueltas — mismas proporciones que pendientes (comentario→motivo, +estado) */
export const APRO_RES_COLS = [
  RES_TAB_SPACER_COL,
  "7%",   // Fecha
  "10%",  // Empleado
  "10%",  // Aprobador
  "7%",   // Tipo hora pill
  "5%",   // Horas
  "11%",  // Proyecto
  "10%",  // Subproyecto
  "10%",  // Actividad
  "8%",   // Estado pill
  "15%",  // Motivo decisión
  RES_TAB_ACTION_COL,
] as const;
