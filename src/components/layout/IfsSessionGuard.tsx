"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const LOGIN_REQUIRED = process.env.NEXT_PUBLIC_PORTAL_LOGIN_REQUIRED === "true";

/**
 * Si la cookie expiró pero el middleware dejó pasar, vuelve a /login.
 */
export function IfsSessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!LOGIN_REQUIRED) return;
    if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (cancelled || res.ok) return;
        const next = encodeURIComponent(pathname);
        window.location.href = `/login?next=${next}&error=session_expired`;
      } catch {
        /* red offline: no forzar logout */
      }
    };

    void verify();
    const id = window.setInterval(verify, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pathname]);

  return null;
}
