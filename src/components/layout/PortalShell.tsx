"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { AppProviders } from "@/src/components/layout/AppProviders";
import { RoleProvider } from "@/src/components/layout/RoleContext";
import { ToastProvider } from "@/src/components/ui/Toast";
import { FocusGuard } from "@/src/components/layout/FocusGuard";
import { MobileNavDrawer } from "@/src/components/layout/MobileNavDrawer";
import { ShellContext } from "@/src/components/layout/ShellContext";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { Topbar } from "@/src/components/layout/Topbar";

type PortalShellProps = {
  children: React.ReactNode;
};

export function PortalShell({ children }: PortalShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLogin = pathname === "/login";

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
