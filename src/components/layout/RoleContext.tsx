"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getHomePathForRole } from "@/src/lib/modules";

export type UsuarioRol = "gerente" | "empleado";

const STORAGE_KEY = "hmv-usuario-rol";

type RoleContextValue = {
  rol: UsuarioRol;
  setRol: (rol: UsuarioRol) => void;
  isGerente: boolean;
  homePath: string;
  roleReady: boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

function readStoredRol(): UsuarioRol {
  if (typeof window === "undefined") return "gerente";
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  return stored === "empleado" ? "empleado" : "gerente";
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [rol, setRolState] = useState<UsuarioRol>("gerente");
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    setRolState(readStoredRol());
    setRoleReady(true);
  }, []);

  const setRol = useCallback((next: UsuarioRol) => {
    setRolState(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value: RoleContextValue = {
    rol,
    setRol,
    isGerente: rol === "gerente",
    homePath: getHomePathForRole(rol),
    roleReady,
  };

  return (
    <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole debe usarse dentro de RoleProvider");
  return ctx;
}
