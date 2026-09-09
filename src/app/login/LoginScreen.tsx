import { HMV_LOGO_SRC } from "@/src/lib/hmv-logo";
import { LoginIfsForm } from "./LoginIfsForm";
import "./login.css";

type LoginScreenProps = {
  next: string;
  defaultEmail: string;
  canOauth: boolean;
  errorText: string | null;
};

export function LoginScreen({
  next,
  defaultEmail,
  canOauth,
  errorText,
}: LoginScreenProps) {
  return (
    <div className="login-shell">
      <section className="login-panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HMV_LOGO_SRC}
          alt="HMV Ingenieros"
          className="login-logo"
        />
        <header className="login-header">
          <h1 className="login-form-title">
            Bienvenido a tu portal de empleados
          </h1>
          <p className="login-form-action">Inicia sesión</p>
          <p className="login-form-copy">
            Entra con tu cuenta Microsoft. El correo y contraseña de abajo es solo para usuario IFS.
          </p>
        </header>

        {errorText ? (
          <p className="alert-warn login-error mt-5 px-3 py-2 text-[13px]">
            {errorText}
          </p>
        ) : null}

        {canOauth ? (
          <LoginIfsForm next={next} defaultEmail={defaultEmail} />
        ) : (
          <p className="alert-warn mt-6 px-3 py-2 text-[13px]">
            El inicio de sesión no está disponible en este momento. Avisa a
            soporte.
          </p>
        )}

        <p className="login-footer">
          Si no puedes entrar, avisa a soporte.
        </p>
      </section>
    </div>
  );
}
