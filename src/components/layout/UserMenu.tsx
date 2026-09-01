"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/components/ui/Icon";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";
import { useToast } from "@/src/components/ui/Toast";
import { useRole, type UsuarioRol } from "@/src/components/layout/RoleContext";
import { getHomePathForRole } from "@/src/lib/modules";
import {
  fetchIfsPortalProfileAction,
  type IfsPortalProfile,
} from "@/src/server/mi-tiempo-catalog-actions";
import { IFS_EMPLOYEE_CHANGED_EVENT } from "@/src/lib/ifs/portal-events";

const IFS_AUTH_ENABLED = process.env.NEXT_PUBLIC_IFS_AUTH_ENABLED === "true";

function profileTitle(profile: IfsPortalProfile | null, loading: boolean): string {
  if (!IFS_AUTH_ENABLED) return "Usuario DEMO";
  if (loading && !profile) return "…";
  if (profile?.connected && profile.empName) return profile.empName;
  if (profile?.connected && profile.empNo) return `EmpNo ${profile.empNo}`;
  if (profile?.connected && profile.email) return profile.email;
  return "Sin sesión IFS";
}

function profileSubtitle(profile: IfsPortalProfile | null, loading: boolean): string {
  if (loading && !profile) return "Cargando datos…";
  if (profile?.connected) {
    const bits: string[] = [];
    if (profile.empNo) bits.push(`EmpNo ${profile.empNo}`);
    if (profile.email) bits.push(profile.email);
    if (profile.companyId || profile.companyName) {
      bits.push(profile.companyId || profile.companyName || "");
    }
    return bits.filter(Boolean).join(" · ") || "Sesión IFS";
  }
  return "Entra con el correo asociado al empleado en DEV";
}

function applyProfile(
  next: IfsPortalProfile,
  prevEmpNo: MutableRefObject<string | undefined>,
  setProfile: (p: IfsPortalProfile) => void,
) {
  setProfile(next);
  const nextEmpNo = next.connected ? next.empNo : undefined;
  if (
    nextEmpNo &&
    prevEmpNo.current &&
    prevEmpNo.current !== nextEmpNo
  ) {
    window.dispatchEvent(
      new CustomEvent(IFS_EMPLOYEE_CHANGED_EVENT, {
        detail: { empNo: nextEmpNo },
      }),
    );
  }
  if (nextEmpNo) prevEmpNo.current = nextEmpNo;
}

export function UserMenu() {
  const { rol, setRol, homePath } = useRole();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<IfsPortalProfile | null>(null);
  const [canManageAccesos, setCanManageAccesos] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const prevEmpNoRef = useRef<string | undefined>(undefined);

  const reloadProfile = () => {
    setLoading(true);
    return fetchIfsPortalProfileAction()
      .then((next) => {
        applyProfile(next, prevEmpNoRef, setProfile);
      })
      .catch(() => {
        setProfile({ connected: false });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const onChanged = () => {
      void reloadProfile();
    };
    window.addEventListener(IFS_EMPLOYEE_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(IFS_EMPLOYEE_CHANGED_EVENT, onChanged);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/impersonate")
      .then((r) => r.json())
      .then((data: { canManageAccesos?: boolean }) => {
        if (!cancelled) setCanManageAccesos(Boolean(data.canManageAccesos));
      })
      .catch(() => {
        if (!cancelled) setCanManageAccesos(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchIfsPortalProfileAction()
      .then((next) => {
        if (!cancelled) applyProfile(next, prevEmpNoRef, setProfile);
      })
      .catch(() => {
        if (!cancelled) setProfile({ connected: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void reloadProfile();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onClick);
    };
  }, [open]);

  const cambiarRol = (next: UsuarioRol) => {
    if (next === rol) {
      setOpen(false);
      return;
    }
    setRol(next);
    setOpen(false);
    router.push(getHomePathForRole(next));
    toast(
      next === "gerente"
        ? "Vista de gerente activada"
        : "Vista de empleado activada",
      "navy",
    );
  };

  const title = profileTitle(profile, loading);
  const subtitle = profileSubtitle(profile, loading);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-2.5 border-none bg-transparent p-0 max-md:min-h-11 max-md:touch-manipulation"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de usuario"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef3f9]">
          <Icon name="user" size="xs" className="text-navy" />
        </div>
        <div className="hidden flex-col gap-px text-left md:flex">
          <span className="text-[13px] font-semibold leading-tight text-navy">
            {title}
          </span>
          <span className="text-[11px] leading-tight text-muted">{subtitle}</span>
        </div>
        <span
          className={`ml-0.5 hidden transition-transform md:inline-flex ${open ? "rotate-180" : ""}`}
        >
          <DropdownChevron open={open} />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-[300] min-w-[220px] overflow-hidden rounded-[10px] border border-border bg-white py-1 shadow-[0_10px_28px_rgba(15,23,42,0.14)]"
        >
          <div className="border-b border-[#f1f5f9] px-3.5 py-2.5">
            <div className="text-[13px] font-semibold text-navy">{title}</div>
            <div className="text-[11px] text-muted">{subtitle}</div>
            {profile?.connected && profile.companyId ? (
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-green">
                IFS · {profile.companyId}
              </div>
            ) : null}
            {profile?.error ? (
              <div className="mt-1 text-[11px] text-[#b45309]">{profile.error}</div>
            ) : null}
          </div>

          {IFS_AUTH_ENABLED && !profile?.connected && !loading ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                router.push("/login?next=/hoja-tiempo");
              }}
              className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3.5 py-2 text-left text-[12.5px] text-[#374151] hover:bg-[#f4f7fb]"
            >
              <Icon name="userCircle" size="sm" className="text-muted" />
              Entrar con IFS
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                toast(
                  !IFS_AUTH_ENABLED
                    ? "Ambiente DEMO"
                    : profile?.empNo
                      ? `Empleado IFS ${profile.empNo}`
                      : "Perfil IFS",
                  "navy",
                );
              }}
              className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3.5 py-2 text-left text-[12.5px] text-[#374151] hover:bg-[#f4f7fb]"
            >
              <Icon name="userCircle" size="sm" className="text-muted" />
              Mi perfil
            </button>
          )}

          {IFS_AUTH_ENABLED && canManageAccesos ? (
            <>
              <div className="my-1 h-px bg-[#f1f5f9]" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  router.push("/consola");
                }}
                className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3.5 py-2 text-left text-[12.5px] font-semibold text-navy hover:bg-[#f4f7fb]"
              >
                <Icon name="shieldCheck" size="sm" className="text-navy" />
                Consola UAT
              </button>
            </>
          ) : null}

          <div className="my-1 h-px bg-[#f1f5f9]" />

          <div className="px-3.5 pb-1 pt-1.5 text-[9.5px] font-bold uppercase tracking-wide text-[#b0b7c3]">
            Cambiar vista
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => cambiarRol("gerente")}
            className={`flex w-full cursor-pointer items-center gap-2 border-none px-3.5 py-2 text-left text-[12.5px] hover:bg-[#f4f7fb] ${
              rol === "gerente"
                ? "font-semibold text-navy"
                : "text-[#374151]"
            }`}
          >
            <Icon name="shieldCheck" size="sm" className="text-navy" />
            Gerente
            {rol === "gerente" && (
              <Icon name="check" size="xs" className="ml-auto text-navy" />
            )}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => cambiarRol("empleado")}
            className={`flex w-full cursor-pointer items-center gap-2 border-none px-3.5 py-2 text-left text-[12.5px] hover:bg-[#f4f7fb] ${
              rol === "empleado"
                ? "font-semibold text-navy"
                : "text-[#374151]"
            }`}
          >
            <Icon name="clock" size="sm" className="text-muted" />
            Empleado
            {rol === "empleado" && (
              <Icon name="check" size="xs" className="ml-auto text-navy" />
            )}
          </button>

          <div className="my-1 h-px bg-[#f1f5f9]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              if (IFS_AUTH_ENABLED) {
                window.location.href = "/api/auth/ifs-logout";
                return;
              }
              router.push(homePath);
              toast("Sesión cerrada (demo)", "navy");
            }}
            className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3.5 py-2 text-left text-[12.5px] text-[#374151] hover:bg-[#f4f7fb]"
          >
            <Icon name="arrowLeft" size="sm" className="text-muted" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
