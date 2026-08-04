import { Icon } from "@/src/components/ui/Icon";
import type { SegmentedOption } from "@/src/components/ui/SegmentedControl";
import { Pill, type PillVariant } from "@/src/components/ui/Pill";
import type { LegalizacionTipo } from "@/src/lib/legalizaciones-mock";

export const TIPO_LEGALIZACION_OPTIONS: SegmentedOption<LegalizacionTipo>[] = [
  {
    value: "Con anticipo",
    label: "Con anticipo",
    icon: "wallet",
    activeClassName:
      "bg-[#dbeafe] text-[#1e40af] shadow-sm ring-1 ring-[#1d4ed8]/45",
    inactiveClassName: "text-muted hover:bg-[#f3f4f6] hover:text-[#1e40af]",
  },
  {
    value: "Tarjeta corporativa",
    label: "Tarjeta corp.",
    icon: "briefcase",
    activeClassName:
      "bg-[#bbf7d0] text-[#15803d] shadow-sm ring-1 ring-[#15803d]/45",
    inactiveClassName: "text-muted hover:bg-[#f3f4f6] hover:text-[#15803d]",
  },
  {
    value: "Sin anticipos",
    label: "Sin anticipo",
    icon: "receipt",
    activeClassName:
      "bg-[#ede9fe] text-[#5b21b6] shadow-sm ring-1 ring-[#6d28d9]/45",
    inactiveClassName: "text-muted hover:bg-[#f3f4f6] hover:text-[#5b21b6]",
  },
];

export function labelTipoLegalizacion(tipo: LegalizacionTipo): string {
  if (tipo === "Tarjeta corporativa") return "Tarjeta corporativa";
  return tipo;
}

const tipoLegalizacionPillVariant: Record<LegalizacionTipo, PillVariant> = {
  "Con anticipo": "lanzado",
  "Tarjeta corporativa": "pagado",
  "Sin anticipos": "gasto",
};

const tipoLegalizacionIcon = {
  "Con anticipo": "wallet",
  "Tarjeta corporativa": "briefcase",
  "Sin anticipos": "receipt",
} as const;

type TipoLegalizacionPillProps = {
  tipo: LegalizacionTipo;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export function TipoLegalizacionPill({
  tipo,
  active = true,
  onClick,
  className = "",
}: TipoLegalizacionPillProps) {
  const variant = active ? tipoLegalizacionPillVariant[tipo] : "inactivo";
  const icon = tipoLegalizacionIcon[tipo];
  const pill = (
    <Pill variant={variant} className={className}>
      <Icon name={icon} size="xs" />
      {labelTipoLegalizacion(tipo)}
    </Pill>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer border-0 bg-transparent p-0"
      >
        {pill}
      </button>
    );
  }

  return pill;
}
