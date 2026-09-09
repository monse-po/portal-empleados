export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
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
  invalid_credentials:
    "Correo o contraseña incorrectos. Inténtalo de nuevo.",
  grant_disabled:
    "IFS no acepta este tipo de inicio de sesión. Avisa a soporte.",
  auth_unavailable:
    "El inicio de sesión no está disponible en este momento. Avisa a soporte.",
};

export function loginErrorMessage(code: string | null | undefined): string {
  if (!code) return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  return (
    LOGIN_ERROR_MESSAGES[code] ??
    "No se pudo iniciar sesión. Inténtalo de nuevo."
  );
}
