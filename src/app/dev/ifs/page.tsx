import Link from "next/link";
import { getIfsConfig, isIfsAuthEnabled, isIfsAuthReady, isIfsDevTokenBypass } from "@/src/lib/ifs/config";
import { isLocalDevRuntime } from "@/src/lib/ifs/dev-local";
import { getServerIfsSession } from "@/src/lib/ifs/session";
import { IfsDevTokenForm } from "@/src/app/dev/ifs/IfsDevTokenForm";
import {
  getEmployeeTimesheet,
  getUserInfo,
  getValidEmpPrjAct,
  openCempPortalSession,
} from "@/src/lib/ifs/cemp-portal";

export const dynamic = "force-dynamic";

type ProbeResult = {
  ok: boolean;
  label: string;
  detail?: string;
};

async function probeIfs(): Promise<ProbeResult[]> {
  const steps: ProbeResult[] = [];
  const cfg = getIfsConfig();

  steps.push({
    ok: Boolean(cfg.cempPortalBaseUrl),
    label: "URL CEmpPortalServices",
    detail: cfg.cempPortalBaseUrl,
  });

  steps.push({
    ok: isIfsAuthReady() || isIfsDevTokenBypass(),
    label: "OAuth configurado (IFS_AUTH_ENABLED + client + redirect)",
    detail: isIfsDevTokenBypass()
      ? "No requerido — bypass dev activo"
      : isIfsAuthEnabled()
        ? isIfsAuthReady()
          ? "Listo"
          : "Faltan variables en Vercel/.env.local"
        : "Desactivado (modo demo o usa bypass dev)",
  });

  if (isIfsDevTokenBypass()) {
    steps.push({
      ok: true,
      label: "Bypass dev (token Aurena en .env.local)",
      detail: "IFS_DEV_ACCESS_TOKEN + IFS_DEV_EMAIL",
    });
  }

  const session = await getServerIfsSession();
  steps.push({
    ok: Boolean(session?.email),
    label: "Sesión empleado (login o bypass dev)",
    detail: session?.email ?? "Sin login — /login o token en .env.local",
  });

  if (!session) return steps;

  try {
    const ifs = await openCempPortalSession(session.email, session.accessToken);
    const info = await getUserInfo(ifs);
    steps.push({
      ok: Boolean(info.EmpNo),
      label: "GetUserInfo",
      detail: `${info.EmpName ?? "?"} · ${info.CompanyId ?? "?"} · EmpNo ${info.EmpNo ?? "?"}`,
    });

    const sheet = await getEmployeeTimesheet(ifs);
    steps.push({
      ok: true,
      label: "GetEmployeeTimesheet",
      detail: `Respuesta OK (${JSON.stringify(sheet).length} chars)`,
    });

    const today = new Date().toISOString().slice(0, 10);
    const catalog = await getValidEmpPrjAct(ifs, today);
    steps.push({
      ok: true,
      label: "GetValidEmpPrjAct (catálogo)",
      detail: `Respuesta OK (${JSON.stringify(catalog).length} chars) · fecha ${today}`,
    });
  } catch (err) {
    steps.push({
      ok: false,
      label: "Llamada IFS",
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return steps;
}

export default async function IfsDevPage() {
  const steps = await probeIfs();
  const session = await getServerIfsSession();
  const allOk = steps.every((s) => s.ok);
  const showPasteForm = isLocalDevRuntime() && !session;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
        Diagnóstico integración
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Conexión IFS</h1>
      <p className="mt-2 text-sm text-muted">
        Prueba si el portal puede leer datos reales de IFS.
      </p>

      {showPasteForm && <IfsDevTokenForm />}

      <ul className="mt-6 space-y-3">
        {steps.map((step) => (
          <li
            key={step.label}
            className={`rounded-lg border px-4 py-3 text-sm ${
              step.ok
                ? "border-[#bbf7d0] bg-[#f0fdf4]"
                : "border-[#fecaca] bg-[#fef2f2]"
            }`}
          >
            <div className="font-semibold text-navy">
              {step.ok ? "✓" : "○"} {step.label}
            </div>
            {step.detail && (
              <div className="mt-1 break-all text-xs text-muted">{step.detail}</div>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-muted">
        Estado general:{" "}
        <strong className={allOk ? "text-[#15803d]" : "text-[#b91c1c]"}>
          {allOk ? "IFS conectado" : "Pendiente configuración o login"}
        </strong>
      </p>

      <div className="mt-6 flex gap-4 text-sm">
        <Link href="/login" className="text-navy underline">
          Login IFS
        </Link>
        <Link href="/hoja-tiempo" className="text-navy underline">
          Mi Tiempo
        </Link>
        <Link href="/" className="text-navy underline">
          Inicio
        </Link>
      </div>
    </div>
  );
}
