import { Icon } from "@/src/components/ui/Icon";
import type { SegmentedOption } from "@/src/components/ui/SegmentedControl";
import {
  Pill,
  tipoAnticipoPillVariant,
  type PillVariant,
} from "@/src/components/ui/Pill";

export type AnticipoTipo = "Gasto" | "Viaje";

/** Colores alineados con `tipoAnticipoPillVariant` en Pill */
export const TIPO_ANTICIPO_SEGMENTED_OPTIONS: SegmentedOption<AnticipoTipo>[] =
  [
    {
      value: "Gasto",
      label: "Gasto",
      icon: "briefcase",
      activeClassName:
        "bg-[#f5f3ff] text-[#6d28d9] shadow-sm ring-1 ring-[#6d28d9]/35",
      inactiveClassName: "text-muted hover:bg-[#f3f4f6] hover:text-[#6d28d9]",
    },
    {
      value: "Viaje",
      label: "Viaje",
      icon: "plane",
      activeClassName:
        "bg-[#fdf2f8] text-[#9d174d] shadow-sm ring-1 ring-[#9d174d]/35",
      inactiveClassName: "text-muted hover:bg-[#f3f4f6] hover:text-[#9d174d]",
    },
  ];

type TipoAnticipoPillProps = {
  tipo: AnticipoTipo;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

function pillVariant(tipo: AnticipoTipo, active: boolean): PillVariant {
  if (!active) return "inactivo";
  return tipoAnticipoPillVariant[tipo];
}

export function TipoAnticipoPill({
  tipo,
  active = true,
  onClick,
  className = "",
}: TipoAnticipoPillProps) {
  const pill = (
    <Pill variant={pillVariant(tipo, active)} className={className}>
      <Icon name={tipo === "Viaje" ? "plane" : "briefcase"} size="xs" />
      {tipo}
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
