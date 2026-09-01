import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { parsePortalAccesoRol } from "@/src/lib/portal-acceso-rol";
import { normalizePortalEmail } from "@/src/lib/portal-impersonation";
import { requireImpersonationOperator } from "@/src/server/portal-impersonation";

/** Lista de PortalAcceso — solo operadores de consola (Monse). */
export async function GET() {
  const operator = await requireImpersonationOperator();
  if (!operator) {
    return NextResponse.json(
      { ok: false, error: "Requiere sesión de operador." },
      { status: 403 },
    );
  }

  const rows = await prisma.portalAcceso.findMany({
    orderBy: [{ rol: "asc" }, { email: "asc" }],
  });
  return NextResponse.json({ ok: true, operator, rows });
}

/** Alta / update de un acceso UAT (empleado o autorizador). */
export async function POST(req: Request) {
  const operator = await requireImpersonationOperator();
  if (!operator) {
    return NextResponse.json(
      { ok: false, error: "Requiere sesión de operador." },
      { status: 403 },
    );
  }

  let body: {
    email?: string;
    nombre?: string;
    empNo?: string;
    rol?: string;
    activo?: boolean;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const email = normalizePortalEmail(body.email ?? "");
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "Correo inválido." },
      { status: 400 },
    );
  }

  const rol = parsePortalAccesoRol(body.rol);

  const row = await prisma.portalAcceso.upsert({
    where: { email },
    create: {
      email,
      nombre: body.nombre?.trim() || null,
      empNo: body.empNo?.trim() || null,
      rol,
      activo: body.activo !== false,
    },
    update: {
      nombre: body.nombre?.trim() || null,
      empNo: body.empNo?.trim() || null,
      rol,
      activo: body.activo !== false,
    },
  });

  return NextResponse.json({ ok: true, row });
}

/** Baja lógica (activo=false) o borrado. */
export async function DELETE(req: Request) {
  const operator = await requireImpersonationOperator();
  if (!operator) {
    return NextResponse.json(
      { ok: false, error: "Requiere sesión de operador." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const email = normalizePortalEmail(url.searchParams.get("email") ?? "");
  const hard = url.searchParams.get("hard") === "1";
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Falta email." },
      { status: 400 },
    );
  }

  if (hard) {
    await prisma.portalAcceso.deleteMany({ where: { email } });
  } else {
    await prisma.portalAcceso.updateMany({
      where: { email },
      data: { activo: false },
    });
  }

  return NextResponse.json({ ok: true });
}
