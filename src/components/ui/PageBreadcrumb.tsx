import { Icon } from "@/src/components/ui/Icon";

type PageBreadcrumbProps = {
  parentLabel: string;
  onVolver: () => void;
  /** Segmento después de « / » (código, fecha, etc.) */
  segment?: string;
};

/** Breadcrumb + volver — único patrón en subpáginas y detalle del portal */
export function PageBreadcrumb({
  parentLabel,
  onVolver,
  segment,
}: PageBreadcrumbProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onVolver}
        aria-label={`Volver a ${parentLabel}`}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-[#c7d9ed] bg-[#eef3f9] px-3 py-1.5 text-[13px] font-semibold text-navy transition-colors hover:border-[#bfdbfe] hover:bg-[#dbeafe] max-md:h-11 max-md:w-11 max-md:justify-center max-md:px-0"
      >
        <Icon name="arrowLeft" size="sm" className="shrink-0 text-navy" />
        <span className="max-md:hidden">{parentLabel}</span>
      </button>
      {segment ? (
        <>
          <span className="text-[13px] text-[#c0c7d4]">/</span>
          <span className="text-[13px] font-medium text-[#4b5563]">
            {segment}
          </span>
        </>
      ) : null}
    </div>
  );
}
