import type { ReactNode } from "react";
import { PageBreadcrumb } from "@/src/components/ui/PageBreadcrumb";

type PortalSubpageHeaderProps = {
  parentLabel: string;
  onVolver: () => void;
  title: string;
  segment?: string;
  titleAddon?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

/** Header de formularios y subvistas (día, alta, etc.) — mismo layout que detalle */
export function PortalSubpageHeader({
  parentLabel,
  onVolver,
  title,
  segment,
  titleAddon,
  trailing,
  className = "",
}: PortalSubpageHeaderProps) {
  return (
    <div
      className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${className}`.trim()}
    >
      <div className="min-w-0">
        <PageBreadcrumb
          parentLabel={parentLabel}
          onVolver={onVolver}
          segment={segment}
        />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-[#111]">{title}</h1>
          {titleAddon}
        </div>
      </div>
      {trailing}
    </div>
  );
}
