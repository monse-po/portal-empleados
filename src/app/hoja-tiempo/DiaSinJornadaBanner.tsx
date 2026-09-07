"use client";

import { Icon } from "@/src/components/ui/Icon";
import {
  etiquetaFestivo,
  etiquetaFinSemana,
  ifsDayAccent,
} from "@/src/lib/ifs/schedule-day-color";
import {
  getDiaSinJornadaKind,
  type DiaCalendarioKind,
} from "@/src/lib/tiempo-schedule";

const STYLES: Record<
  DiaCalendarioKind,
  { box: string; icon: "star" | "moon" | "clock"; title: string }
> = {
  festivo: {
    box: "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]",
    icon: "star",
    title: etiquetaFestivo(),
  },
  fin_semana: {
    box: "border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af]",
    icon: "moon",
    title: "",
  },
  sin_jornada: {
    box: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]",
    icon: "clock",
    title: "Sin jornada",
  },
};

type DiaSinJornadaBannerProps = {
  fecha: string;
  kind?: DiaCalendarioKind | null;
  /** ColorName IFS (festivo / fin de semana). Pastel en fondo, tinta en texto. */
  color?: string | null;
  /** Texto IFS (DayTypeDesc). */
  label?: string | null;
  className?: string;
};

/** Etiqueta de tipo de día (una línea). La regla de tipos la aplica el programa. */
export function DiaSinJornadaBanner({
  fecha,
  kind,
  color,
  label,
  className = "",
}: DiaSinJornadaBannerProps) {
  const resolved = kind ?? getDiaSinJornadaKind(fecha);
  if (!resolved) return null;
  const style = STYLES[resolved];
  const accent =
    resolved === "festivo" || resolved === "fin_semana"
      ? ifsDayAccent(color)
      : {};
  const title =
    resolved === "festivo"
      ? etiquetaFestivo(label)
      : resolved === "fin_semana"
        ? etiquetaFinSemana(label)
        : style.title;

  return (
    <div
      className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold leading-none ${accent.ink ? "border-transparent" : style.box} ${className}`.trim()}
      role="status"
      style={
        accent.ink
          ? { color: accent.ink, background: accent.wash }
          : undefined
      }
    >
      <Icon name={style.icon} size="xs" className="shrink-0" />
      {title}
    </div>
  );
}
