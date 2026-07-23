"use client";

import { Icon, type IconName } from "@/src/components/ui/Icon";

export function FilterChainRow({
  label,
  icon,
  operator,
  active,
  onRemove,
  children,
}: {
  label: string;
  icon: IconName;
  operator: string;
  active?: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`inline-flex shrink-0 items-stretch overflow-hidden rounded-[7px] border ${
        active ? "border-[#c7d9ed]" : "border-border"
      }`}
    >
      <div className="flex items-center gap-1.5 border-r border-[#e5e9f0] bg-[#f4f7fb] px-2 py-1">
        <Icon name={icon} size="xs" className="shrink-0 text-navy" />
        <span className="shrink-0 text-[12px] font-medium text-navy">{label}</span>
      </div>
      <div className="flex items-center border-r border-[#e5e9f0] bg-white px-2 py-1 text-[12px] text-muted">
        {operator}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1 bg-white px-1 py-0.5 [&_[data-col-filter]]:shrink-0">
        {children}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex shrink-0 cursor-pointer items-center border-l border-[#e5e9f0] bg-white px-1.5 text-muted hover:bg-[#f4f7fb] hover:text-navy"
        aria-label={`Quitar filtro ${label}`}
      >
        <Icon name="x" size="xs" />
      </button>
    </div>
  );
}
