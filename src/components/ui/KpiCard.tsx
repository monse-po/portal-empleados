import type { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: ReactNode;
  sub: string;
  alert?: boolean;
  navy?: boolean;
  smallValue?: boolean;
};

/** KPI de bandeja gerente — misma receta en tiempo, anticipos y legalizaciones. */
export function KpiCard({
  label,
  value,
  sub,
  alert,
  navy,
  smallValue,
}: KpiCardProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 ${
        alert
          ? "border-[#fcd34d] bg-[#fffbeb]"
          : navy
            ? "border-[#c7d9ed] bg-[#eef3f9]"
            : "border-border bg-white"
      }`}
    >
      <div
        className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${
          navy ? "text-navy" : "text-muted"
        }`}
      >
        {label}
      </div>
      <div
        className={`font-extrabold leading-none ${smallValue ? "text-lg" : "text-[28px]"} ${alert ? "text-[#b45309]" : "text-navy"}`}
      >
        {value}
      </div>
      <div className={`mt-1.5 text-[11px] ${navy ? "text-navy/70" : "text-muted"}`}>
        {sub}
      </div>
    </div>
  );
}
