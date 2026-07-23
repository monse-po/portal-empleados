"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/src/components/layout/RoleContext";
import { getFocusModule, isPathVisible } from "@/src/lib/modules";

/**
 * Modo enfoque: si hay un módulo enfocado (FOCUS=...) y el usuario navega a
 * una ruta que no pertenece a ese módulo, lo devuelve a su home visible.
 * Sin FOCUS no hace nada (app completa).
 */
export function FocusGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { homePath, roleReady } = useRole();

  const focus = getFocusModule();
  const oculto =
    focus !== null &&
    pathname !== "/" &&
    !isPathVisible(pathname);

  useEffect(() => {
    if (!roleReady) return;
    if (oculto) router.replace(homePath);
  }, [oculto, homePath, roleReady, router]);

  if (oculto) return null;

  return children;
}
