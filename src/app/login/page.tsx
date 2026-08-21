import { LoginIfsForm } from "@/src/app/login/LoginIfsForm";
import { HMV_LOGO_SRC } from "@/src/lib/hmv-logo";
import { getFocusModule, getHomePathForRole } from "@/src/lib/modules";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "No pudimos completar el acceso. Intenta de nuevo.",
  invalid_state: "La sesión se interrumpió. Intenta de nuevo.",
  no_email_in_token:
    "No reconocimos tu correo. Entra con tu cuenta @h-mv.com.",
  system_account_email:
    "Entra con tu correo de empleado, no una cuenta técnica.",
  token_exchange: "No se pudo conectar ahora. Intenta de nuevo en un momento.",
  session_expired: "Tu sesión expiró. Vuelve a entrar.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string; email?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const defaultNext = getFocusModule()
    ? getHomePathForRole("empleado")
    : "/hoja-tiempo";
  const next = params.next?.startsWith("/") ? params.next : defaultNext;
  const defaultEmail = params.email?.includes("@") ? params.email : "";
  const errorKey = params.error ?? "";
  const errorMsg =
    ERROR_MESSAGES[errorKey] ??
    (errorKey ? "No se pudo iniciar sesión. Intenta de nuevo." : undefined);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 max-md:px-3 max-md:py-6">
      <div className="w-full max-w-[520px]">
        <div className="mb-7 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HMV_LOGO_SRC}
            alt="HMV Ingenieros"
            className="block h-11 w-auto md:h-14"
          />
        </div>

        <div className="rounded-lg border border-border bg-white px-7 py-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)] md:px-10 md:py-10">
          <h1 className="text-[22px] font-bold leading-tight text-[#111] md:text-2xl">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[#4b5563]">
            Bienvenido a tu portal de empleados
          </p>

          {errorMsg ? (
            <p
              className="mt-5 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-[13px] leading-snug text-[#b91c1c]"
              role="alert"
            >
              {errorMsg}
            </p>
          ) : null}

          <LoginIfsForm next={next} defaultEmail={defaultEmail} />

          {errorMsg ? (
            <a
              href="/api/auth/ifs-logout"
              className="mt-4 block text-center text-[12px] font-medium text-navy"
            >
              Empezar de nuevo
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
