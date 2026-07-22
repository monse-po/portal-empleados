"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/src/components/layout/RoleContext";

type RoleRouteGuardProps = {
  allow: "gerente" | "empleado" | "any";
  children: React.ReactNode;
};

export function RoleRouteGuard({ allow, children }: RoleRouteGuardProps) {
  const router = useRouter();
  const { rol, homePath, roleReady } = useRole();

  useEffect(() => {
    if (!roleReady) return;
    if (allow === "any" || rol === allow) return;
    router.replace(homePath);
  }, [allow, homePath, roleReady, rol, router]);

  if (!roleReady) return null;
  if (allow !== "any" && rol !== allow) return null;

  return children;
}
