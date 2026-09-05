"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_IFS_AUTH_ENABLED === "true";

/**
 * Si la cookie expiró pero el middleware dejó pasar (o el usuario quedó en SPA),
 * redirige a /login con la ruta actual.
 */
export function IfsSessionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/dev")
    ) {
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (cancelled || res.ok) return;
        // En local, sin sesión, se puede seguir en el portal (datos demo).
        // El redirect a login solo aplica cuando ya hubo cookie y expiró.
        if (process.env.NODE_ENV === "development") return;
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
