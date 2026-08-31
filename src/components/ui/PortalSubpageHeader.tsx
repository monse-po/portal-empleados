import type { ReactNode } from "react";
import { Icon } from "@/src/components/ui/Icon";
import { PageBreadcrumb } from "@/src/components/ui/PageBreadcrumb";

type PortalSubpageHeaderProps = {
  parentLabel: string;
  onVolver: () => void;
  title: ReactNode;
  segment?: string;
  titleAddon?: ReactNode;
  onDiaAnterior?: () => void;
  onDiaSiguiente?: () => void;
  puedeDiaAnterior?: boolean;
  puedeDiaSiguiente?: boolean;
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
  onDiaAnterior,
  onDiaSiguiente,
  puedeDiaAnterior = false,
  puedeDiaSiguiente = false,
  trailing,
  className = "",
}: PortalSubpageHeaderProps) {
  const navBtnClass =
    "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-white text-navy transition-colors hover:border-[#c7d9ed] hover:bg-[#eef3f9] disabled:cursor-not-allowed disabled:opacity-40 max-md:h-11 max-md:w-11";

  return (
    <div
      className={`mb-4 flex flex-wrap items-start justify-between gap-3 max-md:flex-col ${className}`.trim()}
    >
      <div className="min-w-0 max-md:w-full">
        <PageBreadcrumb
          parentLabel={parentLabel}
          onVolver={onVolver}
          segment={segment}
        />
        <div className="mt-2.5 flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2 max-md:flex-nowrap">
            {onDiaAnterior && (
              <button
                type="button"
                className={navBtnClass}
                aria-label="Día anterior"
                disabled={!puedeDiaAnterior}
                onClick={onDiaAnterior}
              >
                <Icon name="chevronLeft" size="sm" />
              </button>
            )}
            <h1
              className={`min-w-0 text-2xl font-bold max-md:flex-1 max-md:truncate max-md:whitespace-nowrap max-md:text-center max-md:text-[18px] ${
                onDiaAnterior || onDiaSiguiente ? "text-navy" : "text-[#111]"
              }`}
            >
              {title}
            </h1>
            {onDiaSiguiente && (
              <button
                type="button"
                className={navBtnClass}
                aria-label="Día siguiente"
                disabled={!puedeDiaSiguiente}
                onClick={onDiaSiguiente}
              >
                <Icon name="chevronRight" size="sm" />
              </button>
            )}
            {titleAddon ? (
              <span className="hidden shrink-0 md:inline-flex">{titleAddon}</span>
            ) : null}
          </div>
          {titleAddon ? (
            <div className="flex justify-center md:hidden">{titleAddon}</div>
          ) : null}
        </div>
      </div>
      {trailing}
    </div>
  );
}
