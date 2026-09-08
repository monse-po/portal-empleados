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
  const { rol, homePath, roleReady, isGerente } = useRole();

  const allowed =
    allow === "any" ||
    rol === allow ||
    (allow === "gerente" && isGerente);

  useEffect(() => {
    if (!roleReady) return;
    if (allowed) return;
    router.replace(homePath);
  }, [allow, allowed, homePath, roleReady, router]);

  if (!roleReady) return null;
  if (!allowed) return null;

  return children;
}
