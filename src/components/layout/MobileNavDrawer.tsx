"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAprobacionAnticiposOptional } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposContext";
import { useAprobacionLegalizacionesOptional } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesContext";
import { useAprobacionOptional } from "@/src/app/aprobacion-tiempo/AprobacionContext";
import { Icon } from "@/src/components/ui/Icon";
import { useRole } from "@/src/components/layout/RoleContext";
import { useShell } from "@/src/components/layout/ShellContext";
import {
  getVisibleModules,
  isNavRouteActive,
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

function DrawerLink({
  route,
  onNavigate,
}: {
  route: ModuleRoute;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const count = usePendingCount(route.path);
  const active = isNavRouteActive(pathname, route.path);

  if (!isPathVisible(route.path)) return null;

  return (
    <Link
      href={route.path}
      onClick={() => {
        if (isNavRouteActive(pathname, route.path)) {
          window.dispatchEvent(
            new CustomEvent("portal:module-home", {
              detail: { path: route.path },
            }),
          );
        }
        onNavigate();
      }}
      className={`flex min-h-12 touch-manipulation items-center gap-3 rounded-lg px-3 text-[14px] ${
        active
          ? "bg-[#eef3f9] font-semibold text-navy"
          : "font-medium text-[#374151] active:bg-[#f5f7fa]"
      }`}
    >
      <Icon
        name={route.icon}
        size="md"
        className={active ? "text-navy" : "text-muted"}
      />
      <span className="flex-1">{route.navLabel}</span>
      {count !== undefined && count > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#dbeafe] px-1.5 text-[10px] font-bold text-[#1d4ed8]">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

export function MobileNavDrawer() {
  const pathname = usePathname();
  const { mobileMenuOpen, closeMobileMenu } = useShell();
  const { isGerente, roleReady } = useRole();
  const modules = getVisibleModules();

  const gerenteRoutes = modules.flatMap((m) =>
    m.routes.filter((r) => r.rol === "gerente"),
  );
  const empleadoRoutes = modules.flatMap((m) =>
    m.routes.filter((r) => r.rol === "empleado"),
  );

  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  return (
    <div className="md:hidden" aria-hidden={!mobileMenuOpen}>
      <div
        className={`fixed inset-x-0 bottom-0 top-[52px] z-[90] bg-black/30 transition-opacity duration-500 ease-out ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onPointerDown={closeMobileMenu}
      />
      <nav
        className={`fixed bottom-0 left-0 top-[52px] z-[95] flex w-[min(280px,85vw)] flex-col overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)] shadow-[8px_0_28px_rgba(15,23,42,0.12)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          mobileMenuOpen
            ? "translate-x-0"
            : "pointer-events-none -translate-x-full"
        }`}
        role="navigation"
        aria-label="Menú principal"
      >
        {roleReady ? (
          <div className="flex flex-col gap-0.5 p-3">
            {empleadoRoutes.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#b0b7c3]">
                  Mis solicitudes
                </p>
                {empleadoRoutes.map((route) => (
                  <DrawerLink
                    key={route.path}
                    route={route}
                    onNavigate={closeMobileMenu}
                  />
                ))}
              </>
            )}
            {isGerente && gerenteRoutes.length > 0 && (
              <>
                {empleadoRoutes.length > 0 && (
                  <div className="my-2 h-px bg-[#f0f0f0]" />
                )}
                <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#b0b7c3]">
                  Aprobaciones
                </p>
                {gerenteRoutes.map((route) => (
                  <DrawerLink
                    key={route.path}
                    route={route}
                    onNavigate={closeMobileMenu}
                  />
                ))}
              </>
            )}
          </div>
        ) : null}
      </nav>
    </div>
  );
}
