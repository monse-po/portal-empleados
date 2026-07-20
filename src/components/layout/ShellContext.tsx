"use client";

import { createContext, useContext } from "react";

type ShellContextValue = {
  collapsed: boolean;
  toggleSidebar: () => void;
};

export const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within PortalShell");
  return ctx;
}
