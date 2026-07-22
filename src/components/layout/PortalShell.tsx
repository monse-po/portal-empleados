"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { AppProviders } from "@/src/components/layout/AppProviders";
import { RoleProvider } from "@/src/components/layout/RoleContext";
import { ToastProvider } from "@/src/components/ui/Toast";
import { BottomTabs } from "@/src/components/layout/BottomTabs";
import { FocusGuard } from "@/src/components/layout/FocusGuard";
import { ShellContext } from "@/src/components/layout/ShellContext";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { Topbar } from "@/src/components/layout/Topbar";

type PortalShellProps = {
  children: React.ReactNode;
};

export function PortalShell({ children }: PortalShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isLogin = pathname === "/login";

  const toggleSidebar = () => setCollapsed((c) => !c);

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
          <ShellContext.Provider value={{ collapsed, toggleSidebar }}>
          <div className="flex min-h-screen flex-col pb-[60px] md:pb-0">
            <Topbar />
            <div className="flex flex-1 overflow-visible">
              <Sidebar />
              <main className="flex flex-1 flex-col items-center overflow-x-visible overflow-y-auto px-3.5 py-[18px] md:px-8 md:py-7 [&>*]:w-full">
                <FocusGuard>{children}</FocusGuard>
              </main>
            </div>
            <BottomTabs />
          </div>
        </ShellContext.Provider>
        </AppProviders>
      </RoleProvider>
    </ToastProvider>
  );
}
