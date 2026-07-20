"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAprobacionAnticiposOptional } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposContext";
import { useAprobacionOptional } from "@/src/app/aprobacion-tiempo/AprobacionContext";
import { Icon } from "@/src/components/ui/Icon";
import { useRole } from "@/src/components/layout/RoleContext";

export function BottomTabs() {
  const pathname = usePathname();
  const { isGerente } = useRole();
  const aprobacion = useAprobacionOptional();
  const aprobacionAnticipos = useAprobacionAnticiposOptional();
  const pendientesCount = aprobacion?.pendientesCount ?? 0;
  const pendientesAntCount = aprobacionAnticipos?.pendientesCount ?? 0;
  const activeAprob = pathname.startsWith("/aprobacion-tiempo");
  const activeAprobAnt = pathname.startsWith("/aprobacion-anticipos");
  const activeTiempo = pathname.startsWith("/hoja-tiempo");
  const activeAnticipos = pathname.startsWith("/mis-anticipos");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[200] flex h-[60px] border-t border-border bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)] md:hidden"
      role="navigation"
      aria-label="Navegación principal"
    >
      {isGerente && (
        <>
          <Link
            href="/aprobacion-tiempo"
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors active:bg-[#f5f7fa] ${
              activeAprob ? "font-bold text-navy" : "text-muted"
            }`}
          >
            <Icon name="checkSquare" size="lg" className="mb-0.5" />
            <span>Hoja Tiempo</span>
            {pendientesCount > 0 && (
              <span className="absolute right-[calc(50%-28px)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dbeafe] px-1 text-[9px] font-bold text-[#1d4ed8]">
                {pendientesCount > 9 ? "9+" : pendientesCount}
              </span>
            )}
          </Link>
          <Link
            href="/aprobacion-anticipos"
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors active:bg-[#f5f7fa] ${
              activeAprobAnt ? "font-bold text-navy" : "text-muted"
            }`}
          >
            <Icon name="wallet" size="lg" className="mb-0.5" />
            <span>Aprob. Ant.</span>
            {pendientesAntCount > 0 && (
              <span className="absolute right-[calc(50%-28px)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dbeafe] px-1 text-[9px] font-bold text-[#1d4ed8]">
                {pendientesAntCount > 9 ? "9+" : pendientesAntCount}
              </span>
            )}
          </Link>
        </>
      )}
      <Link
        href="/hoja-tiempo"
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10.5px] font-medium transition-colors active:bg-[#f5f7fa] ${
          activeTiempo ? "font-bold text-navy" : "text-muted"
        }`}
      >
        <Icon name="clock" size="lg" className="mb-0.5" />
        <span>Mi Tiempo</span>
      </Link>
      <Link
        href="/mis-anticipos"
        className={`flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10.5px] font-medium transition-colors active:bg-[#f5f7fa] ${
          activeAnticipos ? "font-bold text-navy" : "text-muted"
        }`}
      >
        <Icon name="wallet" size="lg" className="mb-0.5" />
        <span>Anticipos</span>
      </Link>
    </nav>
  );
}
