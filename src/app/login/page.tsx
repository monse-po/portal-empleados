import Link from "next/link";
import {
  getIfsConfig,
  isIfsAuthReady,
  isIfsDevTokenBypass,
} from "@/src/lib/ifs/config";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>;
};

const LOGIN_ERRORS: Record<string, string> = {
  no_email_in_token:
    "IFS te dejó entrar, pero el token no trae un EmailId de empleado. Escribe el correo asociado en CEmpPortalUserSet (puede ser @h-mv.com o un correo de prueba como liz.lino@veyron.com.mx) e inténtalo de nuevo. Si IFS ya abrió otra cuenta, usa una ventana de incógnito.",
  system_account_email:
    "IFS devolvió una cuenta técnica, no un empleado. Entra con el correo asociado al empleado en DEV (ventana de incógnito).",
  token_exchange:
    "No se pudo canjear el código de IFS. Vuelve a intentar desde este login (no pegues la URL de IFS a mano).",
  session_store:
    "IFS respondió bien, pero el portal no pudo guardar la sesión. Avisa a soporte (tabla PortalIfsSession).",
  invalid_state:
    "La sesión de login expiró o se abrió la URL de IFS en otra pestaña. No copies/pegues el link de IFS: vuelve a pulsar «Entrar con IFS» aquí.",
  missing_code: "IFS no devolvió el código de autorización. Vuelve a intentar.",
  cookie_too_large:
    "El navegador mandó cookies demasiado grandes (suele ser una sesión vieja). Limpia cookies del sitio o usa incógnito.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next: nextRaw, error, email: emailRaw } = await searchParams;
  const next =
    nextRaw?.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/inicio";
  const canOauth = isIfsAuthReady();
  const hasBypass = isIfsDevTokenBypass();
  const errorText = error ? LOGIN_ERRORS[error] ?? `Error IFS: ${error}` : null;
  const defaultEmail = emailRaw?.trim() || getIfsConfig().portalTestEmailId || "";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
        Portal de empleados
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Conexión IFS</h1>
      <p className="mt-2 text-sm text-muted">
        Una sesión IFS vale para <strong>todo el portal</strong> (Mi Tiempo,
        Aprobar Tiempo, anticipos). Los datos salen de IFS Cloud, no de
        localhost.
      </p>

      {errorText ? (
        <p className="alert-warn mt-6 px-3 py-2 text-sm">{errorText}</p>
      ) : null}

      {canOauth ? (
        <form action="/api/auth/login" method="get" className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block text-[13px] font-medium text-navy" htmlFor="login-email">
            Correo asociado al empleado (EmailId IFS)
          </label>
          <p className="text-[12px] text-muted">
            El que está en CEmpPortalUserSet: correo HMV o de prueba Veyron
            (por ejemplo liz.lino@veyron.com.mx) ligado a un empleado en DEV.
          </p>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="username"
            inputMode="email"
            defaultValue={defaultEmail}
            placeholder="liz.lino@veyron.com.mx"
            className="h-12 w-full rounded-[5px] border border-border bg-white px-3.5 text-[14px] text-text focus:border-navy focus:outline-none max-md:text-[16px]"
          />
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-[5px] bg-navy px-4 text-sm font-semibold text-white"
          >
            Entrar con IFS
          </button>
        </form>
      ) : (
        <p className="alert-warn mt-8 px-3 py-2 text-sm">
          OAuth de IFS no está configurado en este entorno
          {hasBypass
            ? " (hay bypass de desarrollo en .env.local)."
            : "."}{" "}
          Revisa{" "}
          <Link href="/dev/ifs" className="font-semibold underline">
            /dev/ifs
          </Link>
          .
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link href="/api/auth/clear" className="text-navy underline">
          Limpiar cookies del portal y volver a intentar
        </Link>
        <Link href="/dev/ifs" className="text-navy underline">
          Diagnóstico de APIs IFS
        </Link>
        <Link href={next} className="text-muted underline">
          Continuar sin IFS (pantallas vacías)
        </Link>
      </div>
    </div>
  );
}
