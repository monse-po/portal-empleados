import { NextResponse } from "next/server";
import {
  startImpersonation,
  stopImpersonation,
  resolveEffectivePortalIdentity,
} from "@/src/server/portal-impersonation";

/** Estado actual de impersonación (UAT). */
export async function GET() {
  const identity = await resolveEffectivePortalIdentity();
  return NextResponse.json({
    ok: true,
    ...identity,
    operatorsConfigured: Boolean(
      process.env.PORTAL_IMPERSONATION_OPERATORS?.trim(),
    ),
  });
}

/**
 * Activa ?u=correo — solo si hay sesión de operador allowlisted
 * y el target existe en PortalAcceso.
 */
export async function POST(req: Request) {
  let body: { email?: string } = {};
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const result = await startImpersonation(body.email ?? "");
  if (!result.ok) {
    return NextResponse.json(result, { status: 403 });
  }
  return NextResponse.json(result);
}

/** Quita impersonación (vuelve al operador de sesión). */
export async function DELETE() {
  await stopImpersonation();
  const identity = await resolveEffectivePortalIdentity();
  return NextResponse.json({ ok: true, ...identity });
}
