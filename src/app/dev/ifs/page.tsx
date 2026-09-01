import Link from "next/link";
import {
  getIfsConfig,
  getIfsTargetEmpNo,
  isIfsAuthEnabled,
  isIfsAuthReady,
  isIfsDevTokenBypass,
} from "@/src/lib/ifs/config";
import { isLocalDevRuntime } from "@/src/lib/ifs/dev-local";
import { formatIfsError, IfsApiError } from "@/src/lib/ifs/errors";
import {
  IfsSessionExpiredError,
  withValidIfsSession,
} from "@/src/lib/ifs/ifs-session-runtime";
import { getServerIfsSession, isSystemPortalEmail } from "@/src/lib/ifs/session";
import { IfsDevTokenForm } from "@/src/app/dev/ifs/IfsDevTokenForm";
import {
  findPortalUserByEmpId,
  getEmployeeTimesheetForEmp,
  getUserInfo,
  getValidEmpPrjAct,
  openCempPortalActor,
} from "@/src/lib/ifs/cemp-portal";
import { probeHistoricoIfsAction } from "@/src/server/historico-ifs-probe";
import { probeDestinoIfsAction } from "@/src/server/anticipos-catalog-actions";

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
        ? `${session.email} — cuenta técnica IFS, no empleado. Entra con el EmailId asociado al empleado en DEV (incógnito si IFS da 400).`
        : session.email,
  });

  if (!session || systemEmail) return steps;

  try {
    return await withValidIfsSession(async (liveSession) => {
      let ifs;
      try {
        ifs = await openCempPortalActor(
          liveSession.email,
          liveSession.accessToken,
        );
        const targetEmpNo = getIfsTargetEmpNo();
        steps.push({
          ok: true,
          label: "CEmpPortalUserSet",
          detail: `${ifs.user.EmailId} · ${ifs.user.CompanyId ?? "?"} · EmpId ${ifs.user.EmpId ?? "?"}${
            targetEmpNo ? ` · filtro EmpNo ${targetEmpNo}` : ""
          }`,
        });
        if (targetEmpNo && ifs.user.EmpId !== targetEmpNo) {
          const mapped = await findPortalUserByEmpId(
            liveSession.accessToken,
            targetEmpNo,
          ).catch(() => null);
          steps.push({
            ok: Boolean(mapped?.EmailId),
            label: `CEmpPortalUserSet EmpId=${targetEmpNo}`,
            detail: mapped
              ? `${mapped.EmailId} · ${mapped.CompanyId}`
              : "No hay EmailId asociado a ese EmpNo en CEmpPortalUserSet",
          });
        }
      } catch (err) {
        if (err instanceof IfsApiError && err.status === 401) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        const hint =
          liveSession.email && isSystemPortalEmail(liveSession.email)
            ? " Email del token no es empleado."
            : " Verifica que ese correo exista en CEmpPortalUserSet como EmailId (HMV o Veyron asociado al empleado).";
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
        const sheet = await getEmployeeTimesheetForEmp(
          ifs,
          getIfsTargetEmpNo() || ifs.user.EmpId,
        );
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
        detail: `${err.message}. Vuelve a /login con el EmailId asociado al empleado en DEV.`,
      });
      return steps;
    }
    throw err;
  }
}

export default async function IfsDevPage() {
  const steps = await probeIfs();
  const historicoProbe = await probeHistoricoIfsAction();
  const destinoProbe = await probeDestinoIfsAction();
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

      {session && (
        <div className="mt-8 rounded-lg border border-[#c7d9ed] bg-[#f8fafc] px-4 py-4 text-sm">
          <h2 className="font-semibold text-navy">Mi Histórico — qué lee la API</h2>
          <p className="mt-1 text-xs text-muted">
            Compara con lo que ves en IFS Aurena. EmpNo {historicoProbe.empNo ?? "?"} ·
            ventana desde {historicoProbe.desdeIso}
          </p>
          <ul className="mt-3 space-y-1.5 font-mono text-[11px] text-[#374151]">
            <li>ActivePeriod: {historicoProbe.activePeriod ?? "?"}</li>
            <li>ConfirmedHours (IFS): {historicoProbe.confirmedHours ?? "?"}</li>
            <li>
              GetEmployeeTimesheet: raw={historicoProbe.timesheetRaw} mapped=
              {historicoProbe.timesheetMapped} aprobados=
              {historicoProbe.timesheetAprobados}
            </li>
            <li>
              ReportItemSet: raw={historicoProbe.reportItemRaw} (sin expand=
              {historicoProbe.reportItemNoExpandRaw}) aprobados=
              {historicoProbe.reportItemAprobados}
            </li>
            <li>
              Reference_EmpReportItem: raw={historicoProbe.referenceRaw}{" "}
              aprobados={historicoProbe.referenceAprobados}
            </li>
            <li>
              ProjectTransaction Confirmado (lista):{" "}
              {historicoProbe.confirmedProjectTxCount ?? "?"}
            </li>
            <li>
              Canal /main/: {historicoProbe.mainChannelDetail ?? "?"}
            </li>
          </ul>
          {historicoProbe.bySeqProjectTx && (
            <p className="mt-2 break-all text-xs text-muted">
              Por seq Aurena (ProjectTransaction): {historicoProbe.bySeqProjectTx}
            </p>
          )}
          {historicoProbe.bySeqEmpReport && (
            <p className="mt-2 break-all text-xs text-muted">
              Por seq Aurena (EmpReportItem): {historicoProbe.bySeqEmpReport}
            </p>
          )}
          {historicoProbe.sampleReportItem && (
            <p className="mt-2 text-xs text-muted">
              Muestra ReportItem: {JSON.stringify(historicoProbe.sampleReportItem)}
            </p>
          )}
          {historicoProbe.sampleTimesheet && historicoProbe.timesheetRaw > 0 && (
            <p className="mt-2 text-xs text-muted">
              Muestra Timesheet: {JSON.stringify(historicoProbe.sampleTimesheet)}
            </p>
          )}
          {historicoProbe.errors.length > 0 && (
            <ul className="mt-2 text-xs text-[#b91c1c]">
              {historicoProbe.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {historicoProbe.timesheetJsonPreview &&
            historicoProbe.timesheetRaw === 0 && (
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-white p-2 text-[10px] text-muted">
                {historicoProbe.timesheetJsonPreview}
              </pre>
            )}
        </div>
      )}

      {session && (
        <div className="mt-8 rounded-lg border border-[#c7d9ed] bg-[#f8fafc] px-4 py-4 text-sm">
          <h2 className="font-semibold text-navy">
            Destino anticipos — EntitySets en CEmpPortalServices
          </h2>
          <p className="mt-1 text-xs text-muted">
            País / región / municipio deben salir de aquí si el portal los
            expone. Buscamos StateCode, CityCode, CountyCode.
          </p>
          {destinoProbe.error ? (
            <p className="mt-2 text-xs text-[#b91c1c]">{destinoProbe.error}</p>
          ) : (
            <>
              <p className="mt-2 text-xs text-[#374151]">
                Relacionados a geo:{" "}
                <strong>
                  {destinoProbe.geoRelated.length
                    ? destinoProbe.geoRelated.join(", ")
                    : "ninguno (solo lo documentado: IsoCountry)"}
                </strong>
              </p>
              <p className="mt-1 text-[10px] text-muted">
                Total EntitySets: {destinoProbe.entitySets.length}
              </p>
              {destinoProbe.entitySets.length > 0 && (
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-white p-2 text-[10px] text-muted">
                  {destinoProbe.entitySets.join("\n")}
                </pre>
              )}
            </>
          )}
        </div>
      )}

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
          y vuelve a entrar con el correo asociado al empleado en DEV (ventana de
          incógnito recomendada).
        </p>
      )}

      <div className="mt-6 flex gap-4 text-sm">
        <Link href="/consola" className="text-navy underline">
          Consola UAT
        </Link>
        <Link href="/login" className="text-navy underline">
          Login IFS
        </Link>
        <Link href="/hoja-tiempo" className="text-navy underline">
          Mi Tiempo
        </Link>
        <Link href="/historico-tiempo" className="text-navy underline">
          Mi Histórico
        </Link>
      </div>
    </div>
  );
}
