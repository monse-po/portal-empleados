import type { UsuarioRol } from "@/src/components/layout/RoleContext";
import { getHomePathForRole } from "@/src/lib/modules";

export type PortalAccesoRolValue = "EMPLEADO" | "AUTORIZADOR" | "AMBOS";

/** Rol de UI del portal a partir del rol UAT. */
export function uiRolFromPortalAcceso(rol: PortalAccesoRolValue): UsuarioRol {
  return rol === "AUTORIZADOR" ? "gerente" : "empleado";
}

export function homePathFromPortalAcceso(rol: PortalAccesoRolValue): string {
  return getHomePathForRole(uiRolFromPortalAcceso(rol));
}

export function labelPortalAccesoRol(rol: PortalAccesoRolValue): string {
  switch (rol) {
    case "AUTORIZADOR":
      return "Autorizador (aprobar horas)";
    case "AMBOS":
      return "Empleado + autorizador";
    default:
      return "Empleado (solicitar horas)";
  }
}

export function parsePortalAccesoRol(raw: unknown): PortalAccesoRolValue {
  if (raw === "AUTORIZADOR" || raw === "AMBOS" || raw === "EMPLEADO") return raw;
  return "EMPLEADO";
}
