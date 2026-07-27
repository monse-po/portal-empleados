import Link from "next/link";
import { LoginIfsForm } from "@/src/app/login/LoginIfsForm";
import { IfsDevTokenForm } from "@/src/app/dev/ifs/IfsDevTokenForm";
import { getIfsConfig, isIfsAuthReady, isIfsDevTokenBypass } from "@/src/lib/ifs/config";
import { isLocalDevRuntime } from "@/src/lib/ifs/dev-local";
import { getFocusModule, getHomePathForRole } from "@/src/lib/modules";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "IFS no devolvió código de autorización.",
  invalid_state:
    "Sesión OAuth inválida (cookies perdidas o URL distinta). Borra cookies del portal e intenta de nuevo en una pestaña.",
  no_email_in_token:
    "IFS no envió email en el token (solo usuario corto tipo csruiz). Prueba el atajo de abajo o pide a TI el scope/mapper de email.",
  system_account_email:
    "IFS devolvió una cuenta técnica (ifsapp@local), no tu correo de empleado. Entra con tu usuario @h-mv.com en Aurena o pide a TI mapear el email en el client OAuth.",
  token_exchange: "No se pudo intercambiar el código por token.",
  session_expired:
    "Tu sesión expiró. Vuelve a entrar con IFS (usa incógnito si IFS muestra error 400).",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string; hint?: string; email?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const ready = isIfsAuthReady();
  const redirectUri = getIfsConfig().oauthRedirectUri;
  const devBypass = isIfsDevTokenBypass();
  const defaultNext = getFocusModule()
    ? getHomePathForRole("empleado")
    : "/hoja-tiempo";
  const next = params.next?.startsWith("/") ? params.next : defaultNext;
  const defaultEmail = params.email?.includes("@") ? params.email : "";
  const errorKey = params.error ?? "";
  const errorMsg =
    ERROR_MESSAGES[errorKey] ??
    (errorKey ? `Error de login: ${errorKey}` : undefined);
  const showCookieHelp = ready;
  const showDevBypass = isLocalDevRuntime() && ready && Boolean(errorMsg);

  return (
    <div className={`mx-auto flex min-h-[70vh] flex-col justify-center px-4 ${ready ? "max-w-xl" : "max-w-md"}`}>
      <div className="rounded-2xl border border-border bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Portal de empleados HMV
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-navy">Iniciar sesión</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Entra con tu correo corporativo. Cuando IFS responda bien, el portal
          validará tu identidad automáticamente.
        </p>

        {showCookieHelp && !errorMsg && (
          <div className="mt-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs text-[#92400e]">
            Si IFS da <strong>400</strong>, abre esta página en ventana de incógnito.
          </div>
        )}

        {errorMsg && (
          <p className="mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
            {errorMsg}
          </p>
        )}

        {showDevBypass && <IfsDevTokenForm />}

        {ready && redirectUri && (
          <div className="mt-4 rounded-lg border border-[#c7d9ed] bg-[#f8fbff] px-3 py-3 text-sm leading-relaxed text-navy">
            <strong>Redirect URI</strong> que debe existir en Solution Manager →{" "}
            <code className="text-xs">IFS_EMP_PORTAL_USER</code> (copiar exacto):
            <code className="mt-2 block break-all rounded bg-white px-2 py-1.5 text-xs">
              {redirectUri}
            </code>
            <span className="mt-2 block text-xs text-muted">
              Si IFS dice <em>Invalid parameter: redirect_uri</em>, esa URL no está
              registrada igual (revisa http vs https, puerto 3000, sin barra final).
            </span>
          </div>
        )}

        {devBypass && (
          <div className="mt-4 rounded-lg border border-green-border bg-green-bg px-3 py-2 text-sm text-green-text">
            Bypass dev activo en localhost. Prueba{" "}
            <Link href="/dev/ifs" className="font-semibold underline">
              /dev/ifs
            </Link>{" "}
            sin OAuth.
          </div>
        )}

        {!ready ? (
          <div className="mt-6 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-3 text-sm text-[#92400e]">
            Login IFS aún no activado en este deploy. Revisa en Vercel que{" "}
            <code className="text-xs">IFS_AUTH_ENABLED=true</code> y el resto de{" "}
            <code className="text-xs">IFS_OAUTH_*</code> estén en{" "}
            <strong>Preview y Production</strong>, luego haz <strong>Redeploy</strong>.
          </div>
        ) : (
          <LoginIfsForm next={next} defaultEmail={defaultEmail} />
        )}

        {process.env.IFS_AUTH_ENABLED !== "true" && (
          <Link
            href="/"
            className="mt-4 block text-center text-sm text-navy underline"
          >
            Continuar sin login (modo desarrollo)
          </Link>
        )}

        {ready && (
          <>
            <a
              href="/api/auth/ifs-logout"
              className="mt-3 block text-center text-sm text-muted underline"
            >
              Limpiar sesión del portal
            </a>
            <div className="mt-4 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-3 text-xs leading-relaxed text-[#92400e]">
              <strong>Error 400 en hmvdev.ifs360.cloud:</strong> son cookies viejas
              de IFS/Aurena en el navegador. Cierra pestañas, borra cookies de{" "}
              <code>ifs360.cloud</code>, o usa ventana de incógnito. En localhost
              puedes usar token manual (ver abajo).
            </div>
          </>
        )}

        {ready && (
          <details className="mt-4 text-xs text-muted">
            <summary className="cursor-pointer font-medium text-navy">
              Desarrollo local sin OAuth (token Aurena)
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4 leading-relaxed">
              <li>
                Entra a Aurena DEV y abre DevTools → Network → cualquier llamada
                API → copia el Bearer token.
              </li>
              <li>
                En <code>.env.local</code>:{" "}
                <code>IFS_DEV_ACCESS_TOKEN</code> y{" "}
                <code>IFS_DEV_EMAIL=tu@h-mv.com</code>
              </li>
              <li>
                <code>npm run dev</code> →{" "}
                <Link href="/dev/ifs" className="underline">
                  /dev/ifs
                </Link>
              </li>
            </ol>
          </details>
        )}

        {ready && (
          <details className="mt-4 text-xs text-muted">
            <summary className="cursor-pointer font-medium text-navy">
              Más ayuda error 400
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4 leading-relaxed">
              <li>Cierra todas las pestañas con error 400.</li>
              <li>
                En Chrome: Configuración → Privacidad → Borrar datos → Cookies
                (o DevTools → Application → Cookies).
              </li>
              <li>
                Elimina cookies de{" "}
                <code className="text-[11px]">hmvdev.ifs360.cloud</code> y de la
                URL del portal (Vercel).
              </li>
              <li>Vuelve a intentar en una sola pestaña o ventana de incógnito.</li>
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}
