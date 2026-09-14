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
import { fetchSessionUiRolAction } from "@/src/server/portal-acceso-session";

export type UsuarioRol = "gerente" | "empleado";

const STORAGE_KEY = "hmv-usuario-rol";
const CAN_APPROVE_KEY = "hmv-usuario-can-approve";
const IFS_AUTH_ENABLED = process.env.NEXT_PUBLIC_IFS_AUTH_ENABLED === "true";

type RoleContextValue = {
  rol: UsuarioRol;
  setRol: (rol: UsuarioRol) => void;
  isGerente: boolean;
  homePath: string;
  roleReady: boolean;
  /** Solo demo local sin IFS. */
  canSwitchRole: boolean;
};

const RoleContext = createContext<RoleContextValue | null>(null);

function readStoredRol(): UsuarioRol {
  if (typeof window === "undefined") return "empleado";
  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  return stored === "gerente" ? "gerente" : "empleado";
}

function persistRol(next: UsuarioRol) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(STORAGE_KEY, next);
  }
}

function readStoredCanApprove(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(CAN_APPROVE_KEY) === "1";
}

function persistCanApprove(approve: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CAN_APPROVE_KEY, approve ? "1" : "0");
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [rol, setRolState] = useState<UsuarioRol>("empleado");
  const [roleReady, setRoleReady] = useState(false);
  const [canSwitchRole, setCanSwitchRole] = useState(!IFS_AUTH_ENABLED);
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const finish = (
      next: UsuarioRol,
      switchAllowed: boolean,
      approve: boolean,
    ) => {
      if (cancelled) return;
      const stable = approve || readStoredCanApprove();
      setRolState(next);
      persistRol(next);
      persistCanApprove(stable);
      setCanSwitchRole(switchAllowed);
      setCanApprove(stable);
      setRoleReady(true);
    };

    if (!IFS_AUTH_ENABLED) {
      const stored = readStoredRol();
      finish(stored, true, stored === "gerente");
      return;
    }

    if (readStoredCanApprove()) {
      setCanApprove(true);
    }

    void fetchSessionUiRolAction()
      .then((data) => {
        finish("empleado", false, data.canApprove);
      })
      .catch(() => {
        finish("empleado", false, readStoredCanApprove());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setRol = useCallback(
    (next: UsuarioRol) => {
      if (roleReady && !canSwitchRole) return;
      setRolState(next);
      persistRol(next);
    },
    [canSwitchRole, roleReady],
  );

  const isGerente = canSwitchRole ? rol === "gerente" : canApprove;

  const value: RoleContextValue = {
    rol,
    setRol,
    isGerente,
    homePath: getHomePathForRole(canSwitchRole ? rol : "empleado"),
    roleReady,
    canSwitchRole,
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
