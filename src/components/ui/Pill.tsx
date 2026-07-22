import type { CSSProperties, ReactNode } from "react";

/** Base compartida — sin border en ninguna pill */
export const pillBase =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap";

const variants = {
  registrado: "bg-[#eef2f6] text-[#64748b]",
  aprobado: "bg-[#ccfbf1] text-[#0f766e]",
  rechazado: "bg-[#fee2e2] text-[#b91c1c]",
  lanzado: "bg-[#dbeafe] text-[#1d4ed8]",
  borrador: "bg-[#f0f4f8] text-muted",
  revision: "bg-[#fef9c3] text-[#854d0e]",
  pagado: "bg-[#dcfce7] text-[#15803d]",
  enviado: "bg-[#dbeafe] text-[#1d4ed8]",
  cancelado: "bg-[#f3f4f6] text-[#6b7280]",
  gasto: "bg-[#f5f3ff] text-[#6d28d9]",
  viaje: "bg-[#fdf2f8] text-[#9d174d]",
  inactivo: "bg-[#f3f4f6] text-muted",
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

export const estadoPillVariant: Record<string, PillVariant> = {
  Registrado: "registrado",
  "En revisión": "revision",
  Aprobado: "aprobado",
  Rechazado: "rechazado",
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
  return {
    variant: estadoAnticipoPillVariant[estado] ?? ("registrado" as PillVariant),
    label: estado,
  };
}

export function estadoTiempoPillProps(estado: string) {
  const label = estado || "Pendiente";
  const variant = estado
    ? (estadoPillVariant[estado] ?? "registrado")
    : "lanzado";
  return { variant, label };
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
    <Pill variant={variant} className={className}>
      {label}
    </Pill>
  );
}

export function EstadoTiempoPill({
  estado,
  className = "",
}: {
  estado: string;
  className?: string;
}) {
  const { variant, label } = estadoTiempoPillProps(estado);
  return (
    <Pill variant={variant} className={className}>
      {label}
    </Pill>
  );
}

export const estadoLegalizacionPillVariant: Record<string, PillVariant> = {
  Borrador: "borrador",
  "En revisión": "revision",
  Aprobado: "aprobado",
  Rechazado: "rechazado",
};

export function estadoLegalizacionPillProps(estado: string) {
  return {
    variant: estadoLegalizacionPillVariant[estado] ?? ("registrado" as PillVariant),
    label: estado,
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
    <Pill variant={variant} className={className}>
      {label}
    </Pill>
  );
}
