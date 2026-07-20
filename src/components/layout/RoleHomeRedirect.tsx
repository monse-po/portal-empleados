"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/src/components/layout/RoleContext";

export function RoleHomeRedirect() {
  const router = useRouter();
  const { homePath } = useRole();

  useEffect(() => {
    router.replace(homePath);
  }, [homePath, router]);

  return null;
}
