import { isIfsAuthReady } from "@/src/lib/ifs/config";
import { LoginScreen } from "./LoginScreen";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>;
};

const LOGIN_ERRORS: Record<string, string> = {
  no_email_in_token:
    "No pudimos identificar tu correo. Escríbelo de nuevo e inténtalo otra vez.",
  system_account_email:
    "Esa cuenta no corresponde a un empleado. Entra con tu correo corporativo.",
  token_exchange:
    "No se pudo completar el inicio de sesión. Inténtalo de nuevo.",
  session_store:
    "El portal no pudo guardar tu sesión. Avisa a soporte.",
  invalid_state:
    "La sesión expiró. Vuelve a iniciar sesión desde aquí.",
  missing_code: "No se pudo completar el inicio de sesión. Inténtalo de nuevo.",
  cookie_too_large:
    "Hay una sesión anterior en el navegador. Limpia las cookies del sitio o usa una ventana privada.",
  session_expired: "Tu sesión expiró. Vuelve a iniciar sesión.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next: nextRaw, error, email: emailRaw } = await searchParams;
  const next =
    nextRaw?.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/hoja-tiempo";
  const canOauth = isIfsAuthReady();
  const errorText = error
    ? LOGIN_ERRORS[error] ?? "No se pudo iniciar sesión. Inténtalo de nuevo."
    : null;

  return (
    <LoginScreen
      next={next}
      defaultEmail={emailRaw?.trim() || ""}
      canOauth={canOauth}
      errorText={errorText}
    />
  );
}
