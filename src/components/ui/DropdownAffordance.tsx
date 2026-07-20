"use client";

import { Icon } from "@/src/components/ui/Icon";
import type { SelectHTMLAttributes } from "react";

type DropdownChevronProps = {
  open?: boolean;
  className?: string;
};

/** Chevron centrado para triggers de dropdown (botones) */
export function DropdownChevron({
  open = false,
  className = "text-muted",
}: DropdownChevronProps) {
  return (
    <span
      aria-hidden
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
    >
      <Icon
        name="chevronDown"
        size="xs"
        className={`block ${className} ${open ? "opacity-100" : "opacity-50"}`}
      />
    </span>
  );
}

type SelectControlProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

/** Select nativo sin flecha del browser — chevron alineado a la derecha */
export function SelectControl({
  className = "",
  wrapperClassName = "w-full",
  ...props
}: SelectControlProps) {
  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <select
        {...props}
        className={`w-full appearance-none pr-8 ${className}`.trim()}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center"
      >
        <DropdownChevron />
      </span>
    </div>
  );
}
