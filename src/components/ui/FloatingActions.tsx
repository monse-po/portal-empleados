import type { ReactNode } from "react";

/**
 * Acciones principales: en md+ quedan en el flujo (header/footer).
 * En teléfono se despegan y flotan abajo a la derecha, en pastilla.
 */
export function FloatingActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <div
      className={`shrink-0 max-md:pointer-events-none max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-[80] max-md:flex max-md:justify-end max-md:px-3 max-md:pb-[max(12px,env(safe-area-inset-bottom,0px))] ${className}`.trim()}
      role="group"
      aria-label="Acciones principales"
    >
      <div className="flex flex-wrap items-center gap-2.5 max-md:pointer-events-auto max-md:flex-col max-md:flex-nowrap max-md:items-end [&_button]:max-md:h-12 [&_button]:max-md:min-h-12 [&_button]:max-md:w-auto [&_button]:max-md:justify-center [&_button]:max-md:rounded-full [&_button]:max-md:px-4 [&_button]:max-md:text-[13px] [&_button]:max-md:shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
        {children}
      </div>
    </div>
  );
}
