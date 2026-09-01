"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRole, type UsuarioRol } from "@/src/components/layout/RoleContext";
import { useToast } from "@/src/components/ui/Toast";
import { IFS_EMPLOYEE_CHANGED_EVENT } from "@/src/lib/ifs/portal-events";

type ImpersonationState = {
  operatorEmail: string | null;
  effectiveEmail: string | null;
  impersonating: boolean;
  targetNombre?: string | null;
  uiRol?: UsuarioRol | null;
  homePath?: string | null;
  aviso?: string;
  canManageAccesos?: boolean;
};

/**
 * UAT: lee ?u=correo, pide al servidor activar impersonación
 * (solo si hay sesión de operador allowlisted + PortalAcceso).
 */
export function ImpersonationGate() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { setRol } = useRole();
  const [state, setState] = useState<ImpersonationState | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/impersonate");
    if (!res.ok) return;
    const data = (await res.json()) as ImpersonationState & { ok?: boolean };
    setState(data);
    return data;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const pedido = searchParams.get("u")?.trim();
    if (!pedido) return;

    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/auth/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pedido }),
      });
      const data = (await res.json()) as ImpersonationState & {
        ok?: boolean;
        error?: string;
        aviso?: string;
      };
      if (cancelled) return;

      if (!res.ok || !data.ok) {
        toast(
          data.error ||
            data.aviso ||
            "Cambiar de usuario requiere sesión de Consola.",
          "danger",
        );
      } else if (data.impersonating) {
        if (data.uiRol) setRol(data.uiRol);
        toast(`Viendo el portal como ${data.effectiveEmail}`, "green");
        window.dispatchEvent(new Event(IFS_EMPLOYEE_CHANGED_EVENT));
        router.refresh();
      } else if (data.aviso) {
        toast(data.aviso, "warn");
      }

      await refresh();

      const next = new URLSearchParams(searchParams.toString());
      next.delete("u");
      const qs = next.toString();
      const dest =
        data.impersonating && data.homePath
          ? data.homePath
          : qs
            ? `${pathname}?${qs}`
            : pathname;
      router.replace(dest);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, pathname, router, toast, refresh, setRol]);

  const stop = async () => {
    await fetch("/api/auth/impersonate", { method: "DELETE" });
    toast("Volviste a tu sesión", "green");
    window.dispatchEvent(new Event(IFS_EMPLOYEE_CHANGED_EVENT));
    await refresh();
    router.push("/consola");
    router.refresh();
  };

  if (!state?.impersonating || !state.effectiveEmail) return null;

  const rolLabel =
    state.uiRol === "gerente" ? "autorizando" : "solicitando horas";

  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-3 border-b border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-950">
      <span>
        <strong>UAT · Viendo como</strong>{" "}
        {state.targetNombre
          ? `${state.targetNombre} (${state.effectiveEmail})`
          : state.effectiveEmail}
        <span className="text-amber-800"> · {rolLabel}</span>
        {state.operatorEmail ? (
          <span className="text-amber-800">
            {" "}
            · operador {state.operatorEmail}
          </span>
        ) : null}
      </span>
      <a
        href="/consola"
        className="rounded-full border border-amber-400 bg-white px-3 py-0.5 text-[12px] font-semibold text-amber-950 hover:bg-amber-100"
      >
        Consola
      </a>
      <button
        type="button"
        onClick={() => void stop()}
        className="rounded-full border border-amber-400 bg-white px-3 py-0.5 text-[12px] font-semibold text-amber-950 hover:bg-amber-100"
      >
        ↩ Volver a mí
      </button>
    </div>
  );
}
