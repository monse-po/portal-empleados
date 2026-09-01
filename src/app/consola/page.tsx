import Link from "next/link";
import { prisma } from "@/src/lib/db";
import type { PortalAccesoRolValue } from "@/src/lib/portal-acceso-rol";
import { requireImpersonationOperator } from "@/src/server/portal-impersonation";
import { ConsolaClient } from "@/src/app/consola/ConsolaClient";

export const dynamic = "force-dynamic";

export default async function ConsolaPage() {
  const operator = await requireImpersonationOperator();
  const operatorsConfigured = Boolean(
    process.env.PORTAL_IMPERSONATION_OPERATORS?.trim(),
  );

  if (!operator) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Consola UAT
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-navy">
          Empleados y autorizadores
        </h1>
        <p className="mt-3 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-3 text-sm text-[#92400e]">
          {operatorsConfigured
            ? "Entra con IFS usando un correo de PORTAL_IMPERSONATION_OPERATORS (operador / Monse)."
            : "Falta PORTAL_IMPERSONATION_OPERATORS en el .env del servidor DEV."}{" "}
          <Link href="/login?next=/consola" className="font-semibold underline">
            Login IFS
          </Link>
        </p>
        <p className="mt-4 text-xs text-muted">
          Aquí das de alta correos internos para solicitar horas (empleado) o
          autorizarlas (gerente), y entras como ellos sin su SSO.
        </p>
      </div>
    );
  }

  const rows = await prisma.portalAcceso.findMany({
    orderBy: [{ activo: "desc" }, { rol: "asc" }, { email: "asc" }],
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
        Consola UAT
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">
        Empleados y autorizadores
      </h1>
      <p className="mt-2 text-sm text-muted">
        Agrega correos internos. Luego entra como empleado para{" "}
        <strong>solicitar horas</strong> o como autorizador para{" "}
        <strong>aprobarlas</strong>. Andamiaje de pruebas — no es login de
        producción.
      </p>
      <ConsolaClient
        operator={operator}
        rows={rows.map((r) => ({
          id: r.id,
          email: r.email,
          nombre: r.nombre,
          empNo: r.empNo,
          rol: r.rol as PortalAccesoRolValue,
          activo: r.activo,
        }))}
      />
      <p className="mt-6 text-sm">
        <Link href="/dev/ifs" className="text-navy underline">
          Diagnóstico IFS
        </Link>
      </p>
    </div>
  );
}
