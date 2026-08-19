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
        <main className="min-h-screen bg-[#f4f7fb]">{children}</main>
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
            <div className="flex min-h-screen flex-col">
              <Topbar />
              <div className="flex flex-1 overflow-visible">
                <Sidebar />
                <main className="flex flex-1 flex-col items-center overflow-x-visible overflow-y-auto px-3.5 py-[18px] max-md:px-2 max-md:py-2 max-md:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:px-8 md:py-7 [&>*]:w-full">
                  <FocusGuard>{children}</FocusGuard>
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
