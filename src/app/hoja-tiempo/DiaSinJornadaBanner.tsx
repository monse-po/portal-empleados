"use client";

import { Icon } from "@/src/components/ui/Icon";
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
    title: "Día festivo",
  },
  fin_semana: {
    box: "border-[#bfdbfe] bg-[#eff6ff] text-[#1e40af]",
    icon: "moon",
    title: "Fin de semana",
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
  className?: string;
};

/** Etiqueta de tipo de día (una línea). La regla de tipos la aplica el programa. */
export function DiaSinJornadaBanner({
  fecha,
  kind,
  className = "",
}: DiaSinJornadaBannerProps) {
  const resolved = kind ?? getDiaSinJornadaKind(fecha);
  if (!resolved) return null;
  const style = STYLES[resolved];

  return (
    <div
      className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold leading-none ${style.box} ${className}`.trim()}
      role="status"
    >
      <Icon name={style.icon} size="xs" className="shrink-0" />
      {style.title}
    </div>
  );
}
