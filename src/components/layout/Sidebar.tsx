"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAprobacionAnticiposOptional } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposContext";
import { useAprobacionOptional } from "@/src/app/aprobacion-tiempo/AprobacionContext";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import { useRole } from "@/src/components/layout/RoleContext";
import { useShell } from "@/src/components/layout/ShellContext";

type NavItemProps = {
  label: string;
  href: string;
  icon: IconName;
  count?: number;
  active?: boolean;
  collapsed: boolean;
};

function NavItem({ label, href, icon, count, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? `${label}${count ? ` (${count})` : ""}` : undefined}
      className={`relative mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-sm text-left text-[12.5px] transition-colors duration-[120ms] ${
        collapsed ? "justify-center px-0 py-2.5" : "px-3.5 py-[9px]"
      } ${
        active
          ? "bg-[#eef3f9] font-semibold text-navy"
          : "text-muted hover:bg-[#f1f5f9] hover:text-navy"
      }`}
    >
      <Icon
        name={icon}
        size="md"
        className={`w-5 text-center ${active ? "text-navy" : "text-muted"}`}
      />
      {!collapsed && <span className="flex-1">{label}</span>}
      {count !== undefined && count > 0 && (
        <span
          className={`inline-flex items-center rounded-full bg-[#dbeafe] font-semibold text-[#1d4ed8] ${
            collapsed
              ? "absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1 text-[9px]"
              : "ml-auto px-[7px] py-0.5 text-[10px]"
          }`}
        >
          {collapsed && count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

function NavSectionLabel({
  children,
  collapsed,
}: {
  children: React.ReactNode;
  collapsed: boolean;
}) {
  if (collapsed) return null;
  return (
    <div className="px-3.5 pb-1 pt-2.5 text-[9.5px] font-bold uppercase tracking-[0.09em] text-[#b0b7c3]">
      {children}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useShell();
  const { isGerente } = useRole();
  const aprobacion = useAprobacionOptional();
  const aprobacionAnticipos = useAprobacionAnticiposOptional();
  const pendientesCount = aprobacion?.pendientesCount ?? 0;
  const pendientesAntCount = aprobacionAnticipos?.pendientesCount ?? 0;

  return (
    <aside
      className={`hidden shrink-0 overflow-x-hidden overflow-y-auto border-r border-border bg-white py-3.5 transition-[width,padding] duration-200 ease-in-out md:block ${
        collapsed ? "w-[52px] px-1.5" : "w-[220px] px-2.5"
      }`}
    >
      {isGerente && (
        <>
          <NavSectionLabel collapsed={collapsed}>
            Aprobaciones pendientes
          </NavSectionLabel>
          <NavItem
            label="Hoja de Tiempo"
            href="/aprobacion-tiempo"
            icon="checkSquare"
            count={pendientesCount > 0 ? pendientesCount : undefined}
            collapsed={collapsed}
            active={pathname.startsWith("/aprobacion-tiempo")}
          />
          <NavItem
            label="Anticipos"
            href="/aprobacion-anticipos"
            icon="wallet"
            count={pendientesAntCount > 0 ? pendientesAntCount : undefined}
            collapsed={collapsed}
            active={pathname.startsWith("/aprobacion-anticipos")}
          />

          {!collapsed && <div className="my-2.5 h-px bg-[#f0f0f0]" />}
        </>
      )}

      <NavSectionLabel collapsed={collapsed}>Mis solicitudes</NavSectionLabel>
      <NavItem
        label="Mi Tiempo"
        href="/hoja-tiempo"
        icon="clock"
        collapsed={collapsed}
        active={pathname.startsWith("/hoja-tiempo")}
      />
      <NavItem
        label="Mis Anticipos"
        href="/mis-anticipos"
        icon="wallet"
        collapsed={collapsed}
        active={pathname.startsWith("/mis-anticipos")}
      />
    </aside>
  );
}
