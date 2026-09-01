import { prisma } from "@/src/lib/db";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import {
  homePathFromPortalAcceso,
  uiRolFromPortalAcceso,
  type PortalAccesoRolValue,
} from "@/src/lib/portal-acceso-rol";
import {
  clearImpersonationCookie,
  isImpersonationOperator,
  listImpersonationOperators,
  normalizePortalEmail,
  persistImpersonationCookie,
  readImpersonationCookie,
} from "@/src/lib/portal-impersonation";
import type { UsuarioRol } from "@/src/components/layout/RoleContext";

export type EffectivePortalIdentity = {
  /** Sesión SSO/IFS real (operador / Monse). */
  operatorEmail: string | null;
  /** Email con el que actúa el portal (puede ser impersonado). */
  effectiveEmail: string | null;
  impersonating: boolean;
  targetNombre?: string | null;
  /** Rol UAT del acceso (EMPLEADO / AUTORIZADOR / AMBOS). */
  portalRol?: PortalAccesoRolValue | null;
  /** Rol de UI a activar (empleado | gerente). */
  uiRol?: UsuarioRol | null;
  /** Ruta sugerida al entrar como esa persona. */
  homePath?: string | null;
  /** Aviso para UI (sin sesión, sin acceso, etc.). */
  aviso?: string;
  /** Puede administrar /consola. */
  canManageAccesos?: boolean;
};

/**
 * Resuelve el email efectivo.
 * La guardia es siempre servidor: sin operador allowlisted + PortalAcceso activo,
 * se ignora la cookie/?u= y se usa la sesión real.
 */
export async function resolveEffectivePortalIdentity(): Promise<EffectivePortalIdentity> {
  const session = await getServerIfsSession();
  if (!session?.email) {
    return {
      operatorEmail: null,
      effectiveEmail: null,
      impersonating: false,
      canManageAccesos: false,
    };
  }

  const operatorEmail = normalizePortalEmail(session.email);
  const canManageAccesos = isImpersonationOperator(operatorEmail);
  const imp = await readImpersonationCookie();

  if (!imp) {
    return {
      operatorEmail,
      effectiveEmail: operatorEmail,
      impersonating: false,
      canManageAccesos,
    };
  }

  if (imp.operatorEmail !== operatorEmail) {
    await clearImpersonationCookie();
    return {
      operatorEmail,
      effectiveEmail: operatorEmail,
      impersonating: false,
      canManageAccesos,
      aviso: "Impersonación invalidada (sesión distinta).",
    };
  }

  if (!canManageAccesos) {
    await clearImpersonationCookie();
    return {
      operatorEmail,
      effectiveEmail: operatorEmail,
      impersonating: false,
      canManageAccesos: false,
      aviso: "Cambiar de usuario requiere sesión de operador (consola).",
    };
  }

  const acceso = await prisma.portalAcceso.findFirst({
    where: { email: imp.targetEmail, activo: true },
  });

  if (!acceso) {
    await clearImpersonationCookie();
    return {
      operatorEmail,
      effectiveEmail: operatorEmail,
      impersonating: false,
      canManageAccesos,
      aviso: "Ese usuario no está dado de alta; entrando con el de sesión.",
    };
  }

  const portalRol = acceso.rol as PortalAccesoRolValue;
  return {
    operatorEmail,
    effectiveEmail: acceso.email,
    impersonating: true,
    targetNombre: acceso.nombre,
    portalRol,
    uiRol: uiRolFromPortalAcceso(portalRol),
    homePath: homePathFromPortalAcceso(portalRol),
    canManageAccesos,
  };
}

export type StartImpersonationResult = {
  ok: boolean;
  impersonating: boolean;
  effectiveEmail: string | null;
  targetNombre?: string | null;
  portalRol?: PortalAccesoRolValue | null;
  uiRol?: UsuarioRol | null;
  homePath?: string | null;
  aviso?: string;
  error?: string;
};

/** Sesión real + allowlist. Null si no hay operador de consola. */
export async function requireImpersonationOperator(): Promise<string | null> {
  const session = await getServerIfsSession();
  if (!session?.email) return null;
  const email = normalizePortalEmail(session.email);
  return isImpersonationOperator(email) ? email : null;
}

/**
 * Activa impersonación tras validar operador + PortalAcceso.
 * El front solo envía el email pedido; el servidor decide.
 */
export async function startImpersonation(
  requestedEmail: string,
): Promise<StartImpersonationResult> {
  const session = await getServerIfsSession();
  if (!session?.email) {
    return {
      ok: false,
      impersonating: false,
      effectiveEmail: null,
      error: "Cambiar de usuario requiere sesión de Consola/operador.",
    };
  }

  const operatorEmail = normalizePortalEmail(session.email);
  if (!isImpersonationOperator(operatorEmail)) {
    return {
      ok: false,
      impersonating: false,
      effectiveEmail: operatorEmail,
      error: "Cambiar de usuario requiere sesión de Consola/operador.",
    };
  }

  if (!listImpersonationOperators().length) {
    return {
      ok: false,
      impersonating: false,
      effectiveEmail: operatorEmail,
      error: "PORTAL_IMPERSONATION_OPERATORS no está configurado.",
    };
  }

  const targetEmail = normalizePortalEmail(requestedEmail);
  if (!targetEmail || !targetEmail.includes("@")) {
    return {
      ok: false,
      impersonating: false,
      effectiveEmail: operatorEmail,
      error: "Correo inválido.",
    };
  }

  if (targetEmail === operatorEmail) {
    await clearImpersonationCookie();
    return {
      ok: true,
      impersonating: false,
      effectiveEmail: operatorEmail,
    };
  }

  const acceso = await prisma.portalAcceso.findFirst({
    where: { email: targetEmail, activo: true },
  });

  if (!acceso) {
    return {
      ok: false,
      impersonating: false,
      effectiveEmail: operatorEmail,
      aviso: "Ese usuario no está dado de alta; entrando con el de sesión.",
      error: "Usuario no dado de alta en PortalAcceso. Agrégalo en /consola.",
    };
  }

  await persistImpersonationCookie({
    operatorEmail,
    targetEmail: acceso.email,
    expiresAt: session.expiresAt,
  });

  const portalRol = acceso.rol as PortalAccesoRolValue;
  return {
    ok: true,
    impersonating: true,
    effectiveEmail: acceso.email,
    targetNombre: acceso.nombre,
    portalRol,
    uiRol: uiRolFromPortalAcceso(portalRol),
    homePath: homePathFromPortalAcceso(portalRol),
  };
}

export async function stopImpersonation(): Promise<void> {
  await clearImpersonationCookie();
}

export async function findPortalAccesoByEmail(email: string) {
  return prisma.portalAcceso.findFirst({
    where: { email: normalizePortalEmail(email), activo: true },
  });
}
