import Link from "next/link";
import { isIfsAuthReady } from "@/src/lib/ifs/config";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "IFS no devolvió código de autorización.",
  invalid_state: "Sesión OAuth inválida. Intenta de nuevo.",
  no_email_in_token: "El token no incluye email. Revisa CEmpPortalUserSet.",
  token_exchange: "No se pudo intercambiar el código por token.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const ready = isIfsAuthReady();
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

        {!ready ? (
          <div className="mt-6 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-3 text-sm text-[#92400e]">
            Login IFS aún no activado. Sigue usando el portal en modo desarrollo
            (sin <code className="text-xs">IFS_AUTH_ENABLED</code>).
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
      </div>
    </div>
  );
}
