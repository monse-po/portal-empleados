"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Field } from "@/src/components/ui/Field";

const inputClass =
  "h-12 w-full rounded-[5px] border border-border bg-white px-3.5 text-[14px] text-text transition-colors focus:border-navy focus:outline-none max-md:text-[16px]";

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
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password || submitting) return;

    setSubmitting(true);
    window.location.href = next;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <Field label="Correo corporativo" required htmlFor="login-email">
        <input
          id="login-email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          placeholder="cn@h-mv.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Contraseña" required htmlFor="login-password">
        <input
          id="login-password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Button
        type="submit"
        variant="primary"
        className="h-12 w-full justify-center text-[14px] max-md:min-h-12 max-md:text-[15px]"
        loading={submitting}
        loadingLabel="Entrando…"
      >
        Entrar
      </Button>
    </form>
  );
}
