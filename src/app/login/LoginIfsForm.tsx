"use client";

import { useState } from "react";

type LoginIfsFormProps = {
  next: string;
  defaultEmail?: string;
};

export function LoginIfsForm({ next, defaultEmail = "" }: LoginIfsFormProps) {
  const [email, setEmail] = useState(defaultEmail);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    const params = new URLSearchParams({ next });
    params.set("email", trimmed);
    window.location.href = `/api/auth/login?${params.toString()}`;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <label className="block text-sm">
        <span className="font-medium text-navy">Correo corporativo</span>
        <input
          type="email"
          required
          autoComplete="username"
          placeholder="csruiz@h-mv.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:border-navy focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-navy px-4 py-3 text-sm font-semibold text-white hover:bg-[#1e3a5f]"
      >
        Entrar con IFS
      </button>
      <p className="text-center text-xs text-muted">
        Te llevamos a IFS con ese correo. Ahí pones tu contraseña.
      </p>
    </form>
  );
}
