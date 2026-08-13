import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "@/src/components/ui/Icon";

/** Base compartida — sin border en ninguna pill */
export const pillBase =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap";

/**
 * Variantes → tokens CSS (`globals.css`).
 * No hardcodear hex aquí; cambiar color en tokens.
 */
const variants = {
  borrador: "bg-pill-borrador-bg text-pill-borrador-fg",
  registrado: "bg-pill-registrado-bg text-pill-registrado-fg",
  aprobado: "bg-pill-aprobado-bg text-pill-aprobado-fg",
  rechazado: "bg-pill-rechazado-bg text-pill-rechazado-fg",
  lanzado: "bg-pill-lanzado-bg text-pill-lanzado-fg",
  revision: "bg-pill-revision-bg text-pill-revision-fg",
  pagado: "bg-pill-pagado-bg text-pill-pagado-fg",
  /** Alias de lanzado (legacy). */
  enviado: "bg-pill-lanzado-bg text-pill-lanzado-fg",
  cancelado: "bg-pill-cancelado-bg text-pill-cancelado-fg",
  gasto: "bg-pill-gasto-bg text-pill-gasto-fg",
  viaje: "bg-pill-viaje-bg text-pill-viaje-fg",
  inactivo: "bg-pill-cancelado-bg text-muted",
} as const;

export type PillVariant = keyof typeof variants;

type PillProps = {
  children: ReactNode;
  variant?: PillVariant;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export function Pill({
  children,
  variant = "registrado",
  className = "",
  style,
  title,
}: PillProps) {
  return (
    <span
      title={title}
      style={style}
      className={`${pillBase} ${style ? "" : variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Labels de estado del portal (después de normalizar). */
export type EstadoPortalLabel =
  | "Borrador"
  | "Lanzado"
  | "Pendiente"
  | "Aprobado"
  | "Pagado"
  | "Rechazado"
  | "Cancelado";

/** Icono Lucide homologado por estado (todos los módulos). */
export function estadoPillIcon(estado: string): IconName | null {
  const e = normalizeEstadoLabel(estado);
  if (e === "Borrador") return "pencil";
  if (e === "Lanzado" || e === "Pendiente") return "send";
  if (e === "Aprobado") return "check";
  if (e === "Pagado") return "wallet";
  if (e === "Rechazado") return "x";
  if (e === "Cancelado") return "ban";
  return null;
}

/**
 * Normaliza labels legacy / alias → label de producto.
 * Anulado → Cancelado (nunca mostrar “Anulado” en chips).
 */
export function normalizeEstadoLabel(estado: string): string {
  if (!estado) return "Pendiente";
  if (estado === "En revisión" || estado === "Registrado") return "Lanzado";
  if (estado === "Anulado") return "Cancelado";
  return estado;
}

/** Mapa canónico estado → variant (compartido; módulos filtran los que usan). */
export const estadoPortalPillVariant: Record<string, PillVariant> = {
  Borrador: "borrador",
  Pendiente: "lanzado",
  Lanzado: "lanzado",
  Registrado: "lanzado",
  "En revisión": "lanzado",
  Aprobado: "aprobado",
  Pagado: "pagado",
  Rechazado: "rechazado",
  Cancelado: "cancelado",
  Anulado: "cancelado",
};

export const estadoTiempoPillVariant: Record<string, PillVariant> = {
  Borrador: "borrador",
  Pendiente: "lanzado",
  Lanzado: "lanzado",
  Registrado: "lanzado",
  "En revisión": "lanzado",
  Aprobado: "aprobado",
  Rechazado: "rechazado",
};

export const estadoPillVariant: Record<string, PillVariant> = {
  ...estadoPortalPillVariant,
};

export const estadoAnticipoPillVariant: Record<string, PillVariant> = {
  Pendiente: "lanzado",
  Lanzado: "lanzado",
  Aprobado: "aprobado",
  Pagado: "pagado",
  Rechazado: "rechazado",
  Cancelado: "cancelado",
};

export const tipoAnticipoPillVariant = {
  Gasto: "gasto",
  Viaje: "viaje",
} as const satisfies Record<string, PillVariant>;

export function estadoAnticipoPillProps(estado: string) {
  const label = normalizeEstadoLabel(estado);
  return {
    variant: estadoAnticipoPillVariant[label] ?? ("registrado" as PillVariant),
    label: label === "Pendiente" ? "Lanzado" : label,
  };
}

function estadoTiempoEditable(estado: string): boolean {
  const e = normalizeEstadoLabel(estado);
  return e === "Borrador" || e === "Lanzado";
}

export function estadoTiempoPillProps(estado: string) {
  const label = normalizeEstadoLabel(estado);
  const variant =
    estadoTiempoPillVariant[label] ??
    estadoTiempoPillVariant[estado] ??
    "borrador";
  const editable = estadoTiempoEditable(estado);
  return { variant, label, editable };
}

function EstadoPillShell({
  variant,
  label,
  className = "",
  title,
}: {
  variant: PillVariant;
  label: string;
  className?: string;
  title?: string;
}) {
  const icon = estadoPillIcon(label);
  return (
    <Pill variant={variant} className={className} title={title}>
      {icon ? <Icon name={icon} size="xs" className="opacity-80" /> : null}
      {label}
    </Pill>
  );
}

export function EstadoAnticipoPill({
  estado,
  className = "",
}: {
  estado: string;
  className?: string;
}) {
  const { variant, label } = estadoAnticipoPillProps(estado);
  return (
    <EstadoPillShell variant={variant} label={label} className={className} />
  );
}

export function EstadoTiempoPill({
  estado,
  className = "",
}: {
  estado: string;
  className?: string;
}) {
  const { variant, label, editable } = estadoTiempoPillProps(estado);
  const isLanzado = label === "Lanzado" || label === "Pendiente";
  return (
    <EstadoPillShell
      variant={variant}
      label={label === "Pendiente" ? "Lanzado" : label}
      className={className}
      title={
        isLanzado ? "Enviado a aprobación" : editable ? "Editable" : undefined
      }
    />
  );
}

export const estadoLegalizacionPillVariant: Record<string, PillVariant> = {
  Pendiente: "lanzado",
  Lanzado: "lanzado",
  "En revisión": "lanzado",
  Aprobado: "aprobado",
  Rechazado: "rechazado",
  Cancelado: "cancelado",
};

export function estadoLegalizacionPillProps(estado: string) {
  const label = normalizeEstadoLabel(estado);
  return {
    variant:
      estadoLegalizacionPillVariant[label] ??
      estadoLegalizacionPillVariant[estado] ??
      ("lanzado" as PillVariant),
    label: label === "Pendiente" ? "Lanzado" : label,
  };
}

export function EstadoLegalizacionPill({
  estado,
  className = "",
}: {
  estado: string;
  className?: string;
}) {
  const { variant, label } = estadoLegalizacionPillProps(estado);
  return (
    <EstadoPillShell variant={variant} label={label} className={className} />
  );
}

export const estadoDocumentoSoportePillVariant: Record<string, PillVariant> = {
  Pendiente: "lanzado",
  Lanzado: "lanzado",
  Aprobado: "aprobado",
  Rechazado: "rechazado",
  Cancelado: "cancelado",
  Anulado: "cancelado",
};

export function estadoDocumentoSoportePillProps(estado: string) {
  const label = normalizeEstadoLabel(estado);
  return {
    variant:
      estadoDocumentoSoportePillVariant[label] ??
      estadoDocumentoSoportePillVariant[estado] ??
      ("registrado" as PillVariant),
    label: label === "Pendiente" ? "Lanzado" : label,
  };
}

export function EstadoDocumentoSoportePill({
  estado,
  className = "",
}: {
  estado: string;
  className?: string;
}) {
  const { variant, label } = estadoDocumentoSoportePillProps(estado);
  return (
    <EstadoPillShell variant={variant} label={label} className={className} />
  );
}
