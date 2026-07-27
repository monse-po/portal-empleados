import Link from "next/link";
import { getIfsConfig, isIfsAuthEnabled, isIfsAuthReady, isIfsDevTokenBypass } from "@/src/lib/ifs/config";
import { isLocalDevRuntime } from "@/src/lib/ifs/dev-local";
import { formatIfsError, IfsApiError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import { getServerIfsSession, isSystemPortalEmail } from "@/src/lib/ifs/session";
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
  const systemEmail = session?.email && isSystemPortalEmail(session.email);

  steps.push({
    ok: Boolean(session?.email) && !systemEmail,
    label: "Sesión empleado (login o bypass dev)",
    detail: !session?.email
      ? "Sin sesión — entra en /login (misma pestaña, no incógnito distinta)"
      : systemEmail
        ? `${session.email} — cuenta técnica IFS, no empleado. Entra con tu @h-mv.com (incógnito si IFS da 400).`
        : session.email,
  });

  if (!session || systemEmail) return steps;

  try {
    return await withValidIfsSession(async (liveSession) => {
      let ifs;
      try {
        ifs = await openCempPortalSession(
          liveSession.email,
          liveSession.accessToken,
        );
        steps.push({
          ok: true,
          label: "CEmpPortalUserSet",
          detail: `${ifs.user.CompanyId ?? "?"} · EmpId ${ifs.user.EmpId ?? "?"}`,
        });
      } catch (err) {
        if (err instanceof IfsApiError && err.status === 401) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        const hint =
          liveSession.email && isSystemPortalEmail(liveSession.email)
            ? " Email del token no es empleado."
            : " Verifica que exista en CEmpPortalUserSet con EmailId = tu @h-mv.com.";
        steps.push({
          ok: false,
          label: "CEmpPortalUserSet",
          detail: `${msg}.${hint}`,
        });
        return steps;
      }

      try {
        const info = await getUserInfo(ifs);
        steps.push({
          ok: Boolean(info.EmpNo),
          label: "GetUserInfo",
          detail: `${info.EmpName ?? "?"} · ${info.CompanyId ?? "?"} · EmpNo ${info.EmpNo ?? "?"}`,
        });
      } catch (err) {
        steps.push({
          ok: false,
          label: "GetUserInfo",
          detail: err instanceof Error ? err.message : String(err),
        });
      }

      try {
        const sheet = await getEmployeeTimesheet(ifs);
        steps.push({
          ok: true,
          label: "GetEmployeeTimesheet",
          detail: `Respuesta OK (${JSON.stringify(sheet).length} chars)`,
        });
      } catch (err) {
        steps.push({
          ok: false,
          label: "GetEmployeeTimesheet",
          detail: err instanceof Error ? err.message : String(err),
        });
      }

      const today = new Date().toISOString().slice(0, 10);
      try {
        const catalog = await getValidEmpPrjAct(ifs, today);
        const rows =
          (catalog as { value?: unknown[] }).value ??
          (Array.isArray(catalog) ? catalog : []);
        steps.push({
          ok: true,
          label: "GetValidEmpPrjAct (catálogo)",
          detail: `${rows.length} proyecto(s)/actividad(es) · fecha ${today}`,
        });
      } catch (err) {
        steps.push({
          ok: false,
          label: "GetValidEmpPrjAct (catálogo)",
          detail: `${err instanceof Error ? err.message : String(err)} · Si lo anterior está verde, pide a TI proyectos válidos para tu empleado en IFS (no es fallo de login).`,
        });
      }

      return steps;
    });
  } catch (err) {
    if (err instanceof IfsSessionExpiredError) {
      steps.push({
        ok: false,
        label: "CEmpPortalUserSet",
        detail: `${err.message}. Vuelve a /login con tu @h-mv.com.`,
      });
      return steps;
    }
    throw err;
  }
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
                ? "border-green-border bg-green-bg"
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
        <strong className={allOk ? "text-green" : "text-[#b91c1c]"}>
          {allOk ? "IFS conectado" : "Pendiente configuración o login"}
        </strong>
      </p>

      {!session && isIfsAuthReady() && (
        <p className="mt-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-3 text-sm text-[#92400e]">
          No hay cookie de sesión.{" "}
          <Link
            href="/api/auth/login?next=/dev/ifs"
            className="font-semibold underline"
          >
            Entrar con IFS
          </Link>{" "}
          en esta misma pestaña (incógnito si IFS da error 400).
        </p>
      )}

      {session && isSystemPortalEmail(session.email) && (
        <p className="mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-3 text-sm text-[#991b1b]">
          El OAuth devolvió <strong>{session.email}</strong> (cuenta técnica de
          IFS, no un empleado).{" "}
          <Link href="/api/auth/ifs-logout" className="font-semibold underline">
            Limpiar sesión
          </Link>{" "}
          y vuelve a entrar con tu correo <strong>@h-mv.com</strong> (ventana de
          incógnito recomendada).
        </p>
      )}

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
