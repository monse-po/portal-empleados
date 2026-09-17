import { prisma } from "@/src/lib/db";
import { fetchIfsAccessToken } from "@/src/lib/ifs/auth";
import { findPortalUserByEmpId } from "@/src/lib/ifs/cemp-portal";
import { isIfsConfigured } from "@/src/lib/ifs/config";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import { sendMail } from "@/src/lib/mail/send-mail";
import { normalizeNotifEmpleadoId } from "@/src/lib/notificacion-tiempo";

const EMAIL_CACHE_TTL_MS = 20 * 60 * 1000;

type CacheEntry = { email: string | null; expiresAt: number };

const emailCache = new Map<string, CacheEntry>();

export type NotificacionCorreoPayload = {
  titulo: string;
  mensaje: string;
  empleadoId: string;
  empleadoNombre: string;
  href: string;
  registrosCount?: number;
};

function lookupKeys(empleadoId: string): string[] {
  const id = normalizeNotifEmpleadoId(empleadoId);
  if (!id || id === "—") return [];
  const keys = [id];
  const digits = id.replace(/\D/g, "");
  if (digits && digits !== id) keys.push(digits);
  return keys;
}

function cacheGet(key: string): string | null | undefined {
  const hit = emailCache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    emailCache.delete(key);
    return undefined;
  }
  return hit.email;
}

function cacheSet(key: string, email: string | null) {
  emailCache.set(key, { email, expiresAt: Date.now() + EMAIL_CACHE_TTL_MS });
}

async function ifsLookupToken(): Promise<string | null> {
  if (isIfsConfigured()) {
    try {
      const m2m = await fetchIfsAccessToken();
      if (m2m.accessToken) return m2m.accessToken;
    } catch {
      /* el client de login a veces no es M2M; se usa el token de sesión */
    }
  }
  try {
    const session = await getServerIfsSession();
    return session?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function emailFromIfs(
  accessToken: string,
  empId: string,
): Promise<string | null> {
  try {
    const user = await findPortalUserByEmpId(accessToken, empId);
    const email = user?.EmailId?.trim().toLowerCase() || null;
    return email;
  } catch (error) {
    console.error("[correo] IFS EmailId no disponible", empId, error);
    return null;
  }
}

async function emailFromPortalAcceso(empId: string): Promise<string | null> {
  try {
    const row = await prisma.portalAcceso.findFirst({
      where: {
        activo: true,
        empNo: empId,
      },
      select: { email: true },
    });
    return row?.email?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

/** Cédula / EmpNo de la notificación → EmailId de login en IFS. */
export async function resolveEmailIdForEmpleado(
  empleadoId: string,
): Promise<string | null> {
  const keys = lookupKeys(empleadoId);
  if (!keys.length) return null;

  let needsLookup = false;
  for (const key of keys) {
    const cached = cacheGet(key);
    if (cached) return cached;
    if (cached === undefined) needsLookup = true;
  }
  if (!needsLookup) return null;

  const token = await ifsLookupToken();
  let resolved: string | null = null;

  if (token) {
    for (const key of keys) {
      resolved = await emailFromIfs(token, key);
      if (resolved) break;
    }
  }

  if (!resolved) {
    for (const key of keys) {
      resolved = await emailFromPortalAcceso(key);
      if (resolved) break;
    }
  }

  for (const key of keys) cacheSet(key, resolved);
  return resolved;
}

export async function enviarCorreosDecision(input: {
  payloads: NotificacionCorreoPayload[];
  impersonating?: boolean;
}): Promise<void> {
  if (!input.payloads.length) return;

  if (input.impersonating) {
    console.info("[correo] skip (impersonación)", {
      count: input.payloads.length,
    });
    return;
  }

  for (const item of input.payloads) {
    try {
      const to = await resolveEmailIdForEmpleado(item.empleadoId);
      if (!to) {
        console.info("[correo] skip (sin EmailId)", {
          empleadoId: item.empleadoId,
          subject: item.titulo,
        });
        continue;
      }
      await sendMail({
        to,
        toName: item.empleadoNombre,
        subject: item.titulo,
        text: item.mensaje,
        href: item.href,
        registrosCount: item.registrosCount,
      });
    } catch (error) {
      console.error("[correo] no se pudo notificar", item.empleadoId, error);
    }
  }
}
