"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAprobacionAnticiposOptional } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposContext";
import { useAprobacionLegalizacionesOptional } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesContext";
import { useAprobacionOptional } from "@/src/app/aprobacion-tiempo/AprobacionContext";
import { Icon } from "@/src/components/ui/Icon";
import { useRole } from "@/src/components/layout/RoleContext";
import {
  getVisibleModules,
  isPathVisible,
  type ModuleRoute,
} from "@/src/lib/modules";

function usePendingCount(path: string): number | undefined {
  const aprobacion = useAprobacionOptional();
  const aprobacionAnticipos = useAprobacionAnticiposOptional();
  const aprobacionLegalizaciones = useAprobacionLegalizacionesOptional();

  let count = 0;
  if (path === "/aprobacion-tiempo") count = aprobacion?.pendientesCount ?? 0;
  else if (path === "/aprobacion-anticipos") {
    count = aprobacionAnticipos?.pendientesCount ?? 0;
  } else if (path === "/aprobacion-legalizaciones") {
    count = aprobacionLegalizaciones?.pendientesCount ?? 0;
  } else return undefined;

  return count > 0 ? count : undefined;
}

function shortLabel(route: ModuleRoute): string {
  if (route.path === "/aprobacion-anticipos") return "Aprob. Ant.";
  if (route.path === "/aprobacion-legalizaciones") return "Aprob. Leg.";
  if (route.path === "/aprobacion-tiempo") return "Tiempo";
  if (route.path === "/mis-anticipos") return "Anticipos";
  if (route.path === "/legalizaciones") return "Mis Leg.";
  if (route.path === "/hoja-tiempo") return "Mi Tiempo";
  return route.navLabel;
}

function BottomTabLink({ route }: { route: ModuleRoute }) {
  const pathname = usePathname();
  const count = usePendingCount(route.path);
  const active = pathname.startsWith(route.path);

  if (!isPathVisible(route.path)) return null;

  return (
    <Link
      href={route.path}
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors active:bg-[#f5f7fa] ${
        active ? "font-bold text-navy" : "text-muted"
      }`}
    >
      <Icon name={route.icon} size="lg" className="mb-0.5" />
      <span>{shortLabel(route)}</span>
      {count !== undefined && count > 0 && (
        <span className="absolute right-[calc(50%-28px)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dbeafe] px-1 text-[9px] font-bold text-[#1d4ed8]">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

export function BottomTabs() {
  const { isGerente } = useRole();
  const modules = getVisibleModules();

  const gerenteRoutes = modules.flatMap((m) =>
    m.routes.filter((r) => r.rol === "gerente"),
  );
  const empleadoRoutes = modules.flatMap((m) =>
    m.routes.filter((r) => r.rol === "empleado"),
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[200] flex h-[60px] border-t border-border bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)] md:hidden"
      role="navigation"
      aria-label="Navegación principal"
    >
      {isGerente &&
        gerenteRoutes.map((route) => (
          <BottomTabLink key={route.path} route={route} />
        ))}
      {empleadoRoutes.map((route) => (
        <BottomTabLink key={route.path} route={route} />
      ))}
    </nav>
  );
}
