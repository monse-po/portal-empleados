"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/src/components/ui/Icon";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";
import { useToast } from "@/src/components/ui/Toast";
import { useRole, type UsuarioRol } from "@/src/components/layout/RoleContext";

export function UserMenu() {
  const { rol, setRol, homePath } = useRole();
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const cambiarRol = (next: UsuarioRol) => {
    if (next === rol) {
      setOpen(false);
      return;
    }
    setRol(next);
    setOpen(false);
    const destino = next === "gerente" ? "/aprobacion-tiempo" : "/hoja-tiempo";
    router.push(destino);
    toast(
      next === "gerente"
        ? "Vista de gerente activada"
        : "Vista de empleado activada",
      "navy",
    );
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex cursor-pointer items-center gap-2.5 border-none bg-transparent p-0"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de usuario"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef3f9]">
          <Icon name="user" size="xs" className="text-navy" />
        </div>
        <div className="hidden flex-col gap-px text-left md:flex">
          <span className="text-[13px] font-semibold leading-tight text-navy">
            Carlos Rivas
          </span>
          <span className="text-[11px] leading-tight text-muted">
            carlos.rivas@hmvingenieros.com · HMVINGCO
          </span>
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
            <div className="text-[13px] font-semibold text-navy">
              Carlos Rivas
            </div>
            <div className="text-[11px] text-muted">
              carlos.rivas@hmvingenieros.com
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              toast("Perfil de usuario (demo)", "navy");
            }}
            className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3.5 py-2 text-left text-[12.5px] text-[#374151] hover:bg-[#f4f7fb]"
          >
            <Icon name="userCircle" size="sm" className="text-muted" />
            Mi perfil
          </button>

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
