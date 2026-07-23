import Link from "next/link";
import { cookies } from "next/headers";
import { isIfsAuthReady, isIfsDevTokenBypass } from "@/src/lib/ifs/config";

const OAUTH_COOKIES = ["hmv_oauth_pkce", "hmv_oauth_state", "hmv_oauth_next"] as const;

async function clearStaleOAuthCookies() {
  const jar = await cookies();
  for (const name of OAUTH_COOKIES) {
    jar.delete(name);
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "IFS no devolvió código de autorización.",
  invalid_state:
    "Sesión OAuth inválida (cookies perdidas o URL distinta). Borra cookies del portal e intenta de nuevo en una pestaña.",
  no_email_in_token: "El token no incluye email. Revisa CEmpPortalUserSet.",
  token_exchange: "No se pudo intercambiar el código por token.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await clearStaleOAuthCookies();

  const params = await searchParams;
  const ready = isIfsAuthReady();
  const devBypass = isIfsDevTokenBypass();
  const next = params.next?.startsWith("/") ? params.next : "/";
  const loginHref = `/api/auth/login?next=${encodeURIComponent(next)}`;
  const errorKey = params.error ?? "";
  const errorMsg =
    ERROR_MESSAGES[errorKey] ??
    (errorKey ? `Error de login: ${errorKey}` : undefined);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-border bg-white p-8 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          Portal de empleados HMV
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-navy">Iniciar sesión</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Entra con tu correo corporativo. Cuando IFS responda bien, el portal
          validará tu identidad automáticamente.
        </p>

        {errorMsg && (
          <p className="mt-4 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
            {errorMsg}
          </p>
        )}

        {devBypass && (
          <div className="mt-4 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-sm text-[#166534]">
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
          <a
            href={loginHref}
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-navy px-4 py-3 text-sm font-semibold text-white no-underline hover:bg-[#1e3a5f]"
          >
            Entrar con IFS
          </a>
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
              Limpiar sesión IFS (si ves error 400)
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
