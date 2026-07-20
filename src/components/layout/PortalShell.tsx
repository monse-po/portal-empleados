"use client";

import { useState } from "react";
import { AppProviders } from "@/src/components/layout/AppProviders";
import { RoleProvider } from "@/src/components/layout/RoleContext";
import { ToastProvider } from "@/src/components/ui/Toast";
import { BottomTabs } from "@/src/components/layout/BottomTabs";
import { ShellContext } from "@/src/components/layout/ShellContext";
import { Sidebar } from "@/src/components/layout/Sidebar";
import { Topbar } from "@/src/components/layout/Topbar";

type PortalShellProps = {
  children: React.ReactNode;
};

export function PortalShell({ children }: PortalShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => setCollapsed((c) => !c);

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
                {children}
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
