"use client";

import Link from "next/link";
import { Icon } from "@/src/components/ui/Icon";
import { HMV_LOGO_SRC } from "@/src/lib/hmv-logo";
import { useRole } from "@/src/components/layout/RoleContext";
import { useShell } from "@/src/components/layout/ShellContext";
import { UserMenu } from "@/src/components/layout/UserMenu";
import { NotificationBell } from "@/src/components/notifications/NotificationBell";

export function Topbar() {
  const { collapsed, toggleSidebar, mobileMenuOpen, toggleMobileMenu } =
    useShell();
  const { isGerente } = useRole();

  return (
    <header className="relative z-[100] flex h-[52px] shrink-0 items-center justify-between bg-white px-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] max-md:px-2 md:h-14 md:px-6">
      <div className="flex items-center gap-4 max-md:min-w-0 max-md:gap-1 md:gap-[18px]">
        <button
          type="button"
          onClick={toggleMobileMenu}
          title={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-md text-navy active:bg-[#eef3f9] md:hidden"
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileMenuOpen}
        >
          <Icon name={mobileMenuOpen ? "x" : "menu"} size="md" />
        </button>

        <button
          type="button"
          onClick={toggleSidebar}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="hidden cursor-pointer items-center rounded p-1 text-navy transition-colors hover:bg-[#eef3f9] md:flex"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <Icon name={collapsed ? "menu" : "x"} size="md" />
        </button>

        <Link
          href={isGerente ? "/aprobacion-tiempo" : "/hoja-tiempo"}
          className="flex cursor-pointer items-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HMV_LOGO_SRC}
            alt="HMV Ingenieros"
            className="block h-[26px] w-auto md:h-[30px]"
          />
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border-[1.5px] border-[#c7d9ed] bg-[#eef3f9] px-2.5 py-[3px] text-[11px] font-bold tracking-wide text-navy md:inline-flex">
          <Icon name={isGerente ? "shieldCheck" : "clock"} size="sm" />
          {isGerente ? "Gerente" : "Empleado"}
        </span>

        <div className="hidden h-7 w-px bg-border md:block" />

        <NotificationBell />

        <UserMenu />
      </div>
    </header>
  );
}
