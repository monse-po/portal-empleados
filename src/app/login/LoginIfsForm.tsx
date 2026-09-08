"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Field } from "@/src/components/ui/Field";
import { Icon } from "@/src/components/ui/Icon";

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password || submitting) return;

    setSubmitting(true);
    const params = new URLSearchParams({ email: trimmed, next });
    window.location.href = `/api/auth/login?${params.toString()}`;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
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
