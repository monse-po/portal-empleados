"use client";

import Link from "next/link";
import { Icon } from "@/src/components/ui/Icon";
import { HMV_LOGO_ON_DARK_SRC, HMV_LOGO_SRC } from "@/src/lib/hmv-logo";
import { useRole } from "@/src/components/layout/RoleContext";
import { useShell } from "@/src/components/layout/ShellContext";
import { UserMenu } from "@/src/components/layout/UserMenu";
import { NotificationBell } from "@/src/components/notifications/NotificationBell";

export function Topbar() {
  const { collapsed, toggleSidebar, mobileMenuOpen, toggleMobileMenu } =
    useShell();
  const { isGerente, roleReady } = useRole();
  const onNavy = roleReady && isGerente;

  return (
    <header
      className={`relative z-[100] flex h-[52px] shrink-0 items-center justify-between px-3.5 max-md:px-2 md:h-14 md:px-6 ${
        onNavy
          ? "bg-navy shadow-[0_1px_0_rgba(0,0,0,0.18)]"
          : "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      }`}
    >
      <div className="flex items-center gap-4 max-md:min-w-0 max-md:gap-1 md:gap-[18px]">
        <button
          type="button"
          onClick={toggleMobileMenu}
          title={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          className={`inline-flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-md md:hidden ${
            onNavy
              ? "text-white active:bg-white/10"
              : "text-navy active:bg-[#eef3f9]"
          }`}
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileMenuOpen}
        >
          <Icon name={mobileMenuOpen ? "x" : "menu"} size="md" />
        </button>

        <button
          type="button"
          onClick={toggleSidebar}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className={`hidden cursor-pointer items-center rounded p-1 transition-colors md:flex ${
            onNavy
              ? "text-white hover:bg-white/10"
              : "text-navy hover:bg-[#eef3f9]"
          }`}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <Icon name={collapsed ? "menu" : "x"} size="md" />
        </button>

        <Link
          href={isGerente ? "/aprobacion-tiempo-proyectos" : "/hoja-tiempo"}
          className="flex cursor-pointer items-center"
          onClick={() => {
            if (!isGerente) {
              window.dispatchEvent(
                new CustomEvent("portal:module-home", {
                  detail: { path: "/hoja-tiempo" },
                }),
              );
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={onNavy ? HMV_LOGO_ON_DARK_SRC : HMV_LOGO_SRC}
            alt="HMV Ingenieros"
            className="block h-[26px] w-auto md:h-[30px]"
          />
        </Link>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <span
          className={`hidden items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-[3px] text-[11px] font-bold tracking-wide md:inline-flex ${
            onNavy
              ? "border-white/25 bg-white/10 text-white"
              : "border-[#c7d9ed] bg-[#eef3f9] text-navy"
          }`}
        >
          <Icon name={isGerente ? "shieldCheck" : "clock"} size="sm" />
          {isGerente ? "Gerente" : "Empleado"}
        </span>

        <div
          className={`hidden h-7 w-px md:block ${onNavy ? "bg-white/20" : "bg-border"}`}
        />

        <NotificationBell />

        <UserMenu />
      </div>
    </header>
  );
}
