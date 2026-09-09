"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Field } from "@/src/components/ui/Field";
import { Icon } from "@/src/components/ui/Icon";
import { loginErrorMessage } from "@/src/lib/ifs/login-messages";

type LoginIfsFormProps = {
  next: string;
  defaultEmail?: string;
};

export function LoginIfsForm({
  next,
  defaultEmail = "",
}: LoginIfsFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: trimmed, password, next }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        next?: string;
        error?: string;
        oauth?: string;
      };
      if (data.ok) {
        window.location.assign(data.next?.startsWith("/") ? data.next : next);
        return;
      }
      // liz y cuentas federadas: IFS no acepta la clave aquí; entra en su pantalla.
      if (data.oauth?.startsWith("/api/auth/login")) {
        window.location.assign(data.oauth);
        return;
      }
      setError(loginErrorMessage(data.error));
      setSubmitting(false);
    } catch {
      setError(loginErrorMessage("token_exchange"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      {error ? (
        <p className="alert-warn login-error px-3 py-2 text-[13px]">{error}</p>
      ) : null}
      <Field label="Correo corporativo" required htmlFor="login-email">
        <div className="login-field-shell">
          <span className="login-field-icon">
            <Icon name="mail" size="sm" />
          </span>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="username"
            inputMode="email"
            placeholder="correo@h-mv.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input max-md:text-[16px]"
          />
        </div>
      </Field>
      <Field label="Contraseña" required htmlFor="login-password">
        <div className="login-field-shell">
          <span className="login-field-icon">
            <Icon name="lock" size="sm" />
          </span>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input max-md:text-[16px]"
          />
          <button
            type="button"
            className="login-toggle"
            onClick={() => setShowPassword((open) => !open)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} size="sm" />
          </button>
        </div>
        <p className="login-hint">
          La misma de tu acceso corporativo.
        </p>
      </Field>
      <Button
        type="submit"
        variant="primary"
        className="h-12 w-full justify-center text-[14px] max-md:min-h-12 max-md:text-[15px]"
        loading={submitting}
        loadingLabel="Entrando…"
      >
        Iniciar sesión
      </Button>
    </form>
  );
}
