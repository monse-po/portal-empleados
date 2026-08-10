import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/src/components/ui/Icon";

/** Base compartida — sin border en ninguna pill */
export const pillBase =
  "inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap";

const variants = {
  /** Borrador — no enviado (familia neutra editable). */
  borrador: "bg-[#f1f5f9] text-[#64748b]",
  /** Registrado — enviado, pendiente de aprobador (tono parecido, un poco más frío). */
  registrado: "bg-[#e8eef4] text-[#475569]",
  /** Aprobado — cerrado OK (verde bosque pastel, más peso que borrador). */
  aprobado: "bg-green-soft text-green",
  rechazado: "bg-[#fee2e2] text-[#b91c1c]",
  lanzado: "bg-[#dbeafe] text-[#1d4ed8]",
  revision: "bg-[#fef9c3] text-[#854d0e]",
  pagado: "bg-green-soft text-green",
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

export const estadoTiempoPillVariant: Record<string, PillVariant> = {
  Borrador: "borrador",
  Registrado: "registrado",
  /** Legacy — misma pill que Registrado. */
  "En revisión": "registrado",
  Aprobado: "aprobado",
  Rechazado: "rechazado",
};

export const estadoPillVariant: Record<string, PillVariant> = {
  ...estadoTiempoPillVariant,
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

const ESTADO_TIEMPO_LABEL: Record<string, string> = {
  "En revisión": "Registrado",
};

function estadoTiempoLabel(estado: string): string {
  if (!estado) return "Pendiente";
  return ESTADO_TIEMPO_LABEL[estado] ?? estado;
}

function estadoTiempoEditable(estado: string): boolean {
  return (
    estado === "Borrador" ||
    estado === "Registrado" ||
    estado === "En revisión"
  );
}

export function estadoTiempoPillProps(estado: string) {
  const label = estadoTiempoLabel(estado);
  const variant = estadoTiempoPillVariant[estado] ?? "borrador";
  const editable = estadoTiempoEditable(estado);
  return { variant, label, editable };
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
  const { variant, label, editable } = estadoTiempoPillProps(estado);
  return (
    <Pill variant={variant} className={className} title={editable ? "Editable" : undefined}>
      {editable ? <Icon name="pencil" size="xs" className="opacity-80" /> : null}
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

export const estadoDocumentoSoportePillVariant: Record<string, PillVariant> = {
  Solicitado: "registrado",
  Aprobado: "aprobado",
  Rechazado: "rechazado",
  Anulado: "cancelado",
};

export function EstadoDocumentoSoportePill({
  estado,
  className = "",
}: {
  estado: string;
  className?: string;
}) {
  const variant =
    estadoDocumentoSoportePillVariant[estado] ?? ("registrado" as PillVariant);
  return (
    <Pill variant={variant} className={className}>
      {estado}
    </Pill>
  );
}
