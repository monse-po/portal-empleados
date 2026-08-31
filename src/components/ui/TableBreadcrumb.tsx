type TableBreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

type TableBreadcrumbProps = {
  items: TableBreadcrumbItem[];
};

/** Breadcrumb clásico dentro de un Card/tabla: Proyectos / código / empleado. */
export function TableBreadcrumb({ items }: TableBreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Ubicación"
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-[#e5e9f0] bg-[#fafbfc] px-2 py-2 text-[13px]"
    >
      {items.map((item, index) => {
        const last = index === items.length - 1;
        const clickable = Boolean(item.onClick) && !last;

        return (
          <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 ? (
              <span className="select-none text-[#c0c7d4]" aria-hidden>
                /
              </span>
            ) : null}
            {clickable ? (
              <button
                type="button"
                onClick={item.onClick}
                className="truncate font-medium text-navy hover:underline"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={`truncate ${
                  last ? "font-semibold text-[#111]" : "text-muted"
                }`}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
