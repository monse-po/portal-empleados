"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/src/components/layout/RoleContext";

export function RoleHomeRedirect() {
  const router = useRouter();
  const { homePath, roleReady } = useRole();

  useEffect(() => {
    if (!roleReady) return;
    router.replace(homePath);
  }, [homePath, roleReady, router]);

  return null;
}
