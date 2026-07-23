"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const AURENA_URL =
  "https://hmvdev.ifs360.cloud/main/ifsapplications/web/";

export function IfsDevTokenForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dev/ifs-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accessToken }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar la sesión");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de red. ¿Estás en localhost?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[#c7d9ed] bg-[#f8fbff] p-5">
      <h2 className="text-base font-semibold text-navy">
        Conectar IFS en 2 minutos (solo local)
      </h2>
      <p className="mt-1 text-sm text-muted">
        Sin OAuth, sin .env.local. Solo para probar la API en tu Mac.
      </p>

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-navy">
        <li>
          Abre{" "}
          <a
            href={AURENA_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Aurena DEV
          </a>{" "}
          e inicia sesión.
        </li>
        <li>
          Pulsa <kbd className="rounded bg-white px-1.5 py-0.5 text-xs">F12</kbd> →
          pestaña <strong>Red / Network</strong> → recarga la página (
          <kbd className="rounded bg-white px-1.5 py-0.5 text-xs">F5</kbd>).
        </li>
        <li>
          Clic en cualquier fila que diga{" "}
          <code className="text-xs">ifs360.cloud</code> →{" "}
          <strong>Encabezados / Headers</strong> → busca{" "}
          <code className="text-xs">authorization</code> → copia el valor
          completo (incluye <code className="text-xs">Bearer …</code>).
        </li>
        <li>Pégalo abajo con tu correo.</li>
      </ol>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <label className="block text-sm">
          <span className="font-medium text-navy">Tu correo</span>
          <input
            type="email"
            required
            placeholder="nombre@h-mv.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-navy">Authorization (de Network)</span>
          <textarea
            required
            rows={4}
            placeholder="Bearer eyJhbGciOi…"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 font-mono text-xs"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Conectando…" : "Probar conexión IFS"}
        </button>
      </form>
    </div>
  );
}
