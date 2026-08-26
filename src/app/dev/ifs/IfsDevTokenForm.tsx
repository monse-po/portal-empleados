"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-green-border bg-green-bg p-5">
        <h2 className="text-base font-semibold text-navy">
          Forma recomendada: login OAuth desde el portal
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-green-text">
          Aurena web <strong>no expone</strong> el Bearer en DevTools (solo cookies
          como <code className="text-xs">JSESSIONID</code>). El portal obtiene el token
          por OAuth en el servidor, no copiándolo de Network.
        </p>

        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-navy">
          <li>
            En IFS Solution Manager → IAM Clients →{" "}
            <code className="text-xs">IFS_EMP_PORTAL_USER</code> → agrega redirect:{" "}
            <code className="text-xs">
              http://localhost:3000/api/auth/callback/ifs
            </code>
          </li>
          <li>
            En <code className="text-xs">.env.local</code> (ver{" "}
            <code className="text-xs">docs/PENDIENTE-IFS.md</code>):{" "}
            <code className="text-xs">IFS_AUTH_ENABLED=true</code> + client secret +
            redirect.
          </li>
          <li>
            Reinicia <code className="text-xs">npm run dev</code> →{" "}
            <Link href="/login" className="font-semibold underline">
              /login
            </Link>{" "}
            → <strong>Entrar con IFS</strong> → vuelve aquí.
          </li>
        </ol>

        <Link
          href="/login"
          className="mt-4 inline-flex rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white no-underline"
        >
          Ir a login IFS
        </Link>
      </div>

      <details className="rounded-xl border border-[#c7d9ed] bg-[#f8fbff] p-5">
        <summary className="cursor-pointer text-sm font-semibold text-navy">
          Alternativa avanzada: pegar token manual (casi nunca funciona con Aurena)
        </summary>
        <p className="mt-3 text-sm text-muted">
          Si filtrar <code className="text-xs">token</code> o{" "}
          <code className="text-xs">openid-connect</code> no muestra nada, es esperado.
          Solo sirve si TI te entrega un <code className="text-xs">access_token</code>{" "}
          por otro medio (Postman, script, etc.).
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-navy">Tu correo</span>
            <input
              type="email"
              required
              placeholder="liz.lino@veyron.com.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-navy">access_token</span>
            <textarea
              required
              rows={4}
              placeholder="eyJhbGciOi…"
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
            className="w-full rounded-lg border border-navy bg-white px-4 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
          >
            {loading ? "Conectando…" : "Probar con token manual"}
          </button>
        </form>
      </details>
    </div>
  );
}
