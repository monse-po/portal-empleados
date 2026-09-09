"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppProviders } from "@/src/components/layout/AppProviders";
import { RoleProvider } from "@/src/components/layout/RoleContext";
import { ToastProvider } from "@/src/components/ui/Toast";
import { FocusGuard } from "@/src/components/layout/FocusGuard";
import { IfsSessionGuard } from "@/src/components/layout/IfsSessionGuard";
import { MobileNavDrawer } from "@/src/components/layout/MobileNavDrawer";
import { ShellContext } from "@/src/components/layout/ShellContext";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { Topbar } from "@/src/components/layout/Topbar";
import { LoadingNotice } from "@/src/components/ui/LoadingNotice";

/** En local next.config deja esto vacío: no hay muro de /login. */
const LOGIN_REQUIRED = process.env.NEXT_PUBLIC_PORTAL_LOGIN_REQUIRED === "true";

type PortalShellProps = {
  children: React.ReactNode;
};

export function PortalShell({ children }: PortalShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLogin = pathname === "/login";
  const [session, setSession] = useState<"unknown" | "ok" | "no">(
    LOGIN_REQUIRED && !isLogin ? "unknown" : "ok",
  );

  useEffect(() => {
    if (!LOGIN_REQUIRED || isLogin) {
      setSession("ok");
      return;
    }
    let cancelled = false;
    void fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setSession("ok");
          return;
        }
        setSession("no");
        const next = encodeURIComponent(pathname);
        window.location.replace(`/login?next=${next}`);
      })
      .catch(() => {
        if (!cancelled) setSession("ok");
      });
    return () => {
      cancelled = true;
    };
  }, [isLogin, pathname]);

  const toggleSidebar = () => setCollapsed((c) => !c);
  const toggleMobileMenu = useCallback(
    () => setMobileMenuOpen((open) => !open),
    [],
  );
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  if (isLogin) {
    return (
      <ToastProvider>
        <main className="min-h-screen bg-[var(--bg)]">{children}</main>
      </ToastProvider>
    );
  }

  if (session !== "ok") {
    return (
      <ToastProvider>
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
          {session === "unknown" ? (
            <LoadingNotice variant="panel" label="Comprobando sesión" />
          ) : null}
        </main>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <RoleProvider>
        <AppProviders>
          <ShellContext.Provider
            value={{
              collapsed,
              toggleSidebar,
              mobileMenuOpen,
              toggleMobileMenu,
              closeMobileMenu,
            }}
          >
            <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
              <IfsSessionGuard />
              <Topbar />
              <div className="flex min-h-0 flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex min-h-0 flex-1 flex-col items-center overflow-x-hidden overflow-y-auto px-2 max-md:px-1.5 md:px-3">
                  <div className="w-full py-[18px] max-md:py-2 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:py-4 [&>*]:w-full">
                    <FocusGuard>{children}</FocusGuard>
                  </div>
                </main>
              </div>
              <MobileNavDrawer />
            </div>
          </ShellContext.Provider>
        </AppProviders>
      </RoleProvider>
    </ToastProvider>
  );
}
