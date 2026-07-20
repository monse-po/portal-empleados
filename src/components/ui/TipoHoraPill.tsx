import { Icon } from "@/src/components/ui/Icon";
import { Pill } from "@/src/components/ui/Pill";
import { getTipoHoraMeta } from "@/src/lib/mi-tiempo-mock";

type TipoHoraPillProps = {
  tipo: string;
  className?: string;
};

export function TipoHoraPill({ tipo, className = "" }: TipoHoraPillProps) {
  const m = getTipoHoraMeta(tipo);
  return (
    <Pill
      title={m.n ? `${tipo} · ${m.n}` : tipo}
      className={className}
      style={{ background: m.b, color: m.c }}
    >
      <Icon name={m.icon} size="xs" />
      {m.s || tipo}
    </Pill>
  );
}
