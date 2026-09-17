"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RouteLoading } from "@/src/components/layout/RouteLoading";
import { useRole } from "@/src/components/layout/RoleContext";

function RoleHomeRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { homePath } = useRole();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `${homePath}?${qs}` : homePath);
  }, [homePath, router, searchParams]);

  return <RouteLoading />;
}

export function RoleHomeRedirect() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <RoleHomeRedirectInner />
    </Suspense>
  );
}
