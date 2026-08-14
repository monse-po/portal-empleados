import { Icon } from "@/src/components/ui/Icon";
import { Pill } from "@/src/components/ui/Pill";
import { getTipoHoraMeta } from "@/src/lib/mi-tiempo-mock";

export function TipoHoraPill({
  tipo,
  label,
  title,
  className = "",
}: {
  tipo: string;
  /** Override del texto corto (p. ej. label IFS recortado). */
  label?: string;
  title?: string;
  className?: string;
}) {
  const m = getTipoHoraMeta(tipo);
  const text =
    m.s ||
    label ||
    (tipo.length > 14 ? `${tipo.slice(0, 13).trimEnd()}…` : tipo) ||
    "—";
  return (
    <Pill
      title={title ?? (m.n ? `${tipo} · ${m.n}` : tipo)}
      className={`max-w-full ${className}`}
      style={{ background: m.b, color: m.c }}
    >
      <Icon name={m.icon} size="xs" className="shrink-0" />
      <span className="min-w-0 truncate">{text}</span>
    </Pill>
  );
}
