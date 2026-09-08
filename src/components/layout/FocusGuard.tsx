"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/src/components/layout/RoleContext";
import {
  getFocusModules,
  isHiddenModulePath,
  isPathVisible,
} from "@/src/lib/modules";

/**
 * Modo enfoque: si hay un módulo enfocado (FOCUS=...) y el usuario navega a
 * una ruta que no pertenece a ese módulo, lo devuelve a su home visible.
 * También redirige módulos pausados (`hidden`) aunque FOCUS=all.
 */
export function FocusGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { homePath, roleReady } = useRole();

  const focus = getFocusModules();
  const oculto =
    pathname !== "/" &&
    (isHiddenModulePath(pathname) ||
      (focus !== null && !isPathVisible(pathname)));

  useEffect(() => {
    if (!roleReady) return;
    if (oculto) router.replace(homePath);
  }, [oculto, homePath, roleReady, router]);

  if (oculto) return null;

  return children;
}
