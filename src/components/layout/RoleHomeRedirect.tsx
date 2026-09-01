"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRole } from "@/src/components/layout/RoleContext";

function RoleHomeRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { homePath, roleReady } = useRole();

  useEffect(() => {
    if (!roleReady) return;
    const qs = searchParams.toString();
    router.replace(qs ? `${homePath}?${qs}` : homePath);
  }, [homePath, roleReady, router, searchParams]);

  return null;
}

export function RoleHomeRedirect() {
  return (
    <Suspense fallback={null}>
      <RoleHomeRedirectInner />
    </Suspense>
  );
}
