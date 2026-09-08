"use server";

import { getServerIfsSession } from "@/src/lib/ifs/session";

export type SessionUiRol = {
  email: string | null;
  /** Hay sesión IFS: el portal muestra bandejas; IFS filtra qué puede aprobar. */
  canApprove: boolean;
};

/** Identidad de menú: sesión IFS, no tabla UAT ni allowlist. */
export async function fetchSessionUiRolAction(): Promise<SessionUiRol> {
  const session = await getServerIfsSession();
  if (!session?.email) {
    return { email: null, canApprove: false };
  }
  return { email: session.email, canApprove: true };
}
