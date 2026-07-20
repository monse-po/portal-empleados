"use client";

import { Icon, type IconName } from "@/src/components/ui/Icon";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: IconName;
  activeClassName?: string;
  inactiveClassName?: string;
};

type SegmentedControlProps<T extends string> = {
  value: T | "";
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  "aria-label"?: string;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = "",
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 rounded-lg border border-border bg-[#f8fafc] p-0.5 ${className}`.trim()}
    >
      {options.map((option) => {
        const active = value === option.value;
        const activeClass =
          option.activeClassName ??
          "bg-navy text-white shadow-[0_1px_2px_rgba(1,71,131,0.24)]";
        const inactiveClass =
          option.inactiveClassName ??
          "text-muted hover:bg-white/80 hover:text-[#374151]";
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              active ? activeClass : inactiveClass
            }`}
          >
            {option.icon && <Icon name={option.icon} size="xs" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
