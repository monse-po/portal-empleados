"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useRole } from "@/src/components/layout/RoleContext";
import { useToast } from "@/src/components/ui/Toast";
import { IFS_EMPLOYEE_CHANGED_EVENT } from "@/src/lib/ifs/portal-events";
import {
  homePathFromPortalAcceso,
  labelPortalAccesoRol,
  type PortalAccesoRolValue,
  uiRolFromPortalAcceso,
} from "@/src/lib/portal-acceso-rol";

export type AccesoRow = {
  id: string;
  email: string;
  nombre: string | null;
  empNo: string | null;
  rol: PortalAccesoRolValue;
  activo: boolean;
};

export function ConsolaClient({
  operator,
  rows,
}: {
  operator: string;
  rows: AccesoRow[];
}) {
  const router = useRouter();
  const { setRol } = useRole();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [empNo, setEmpNo] = useState("");
  const [rol, setFormRol] = useState<PortalAccesoRolValue>("EMPLEADO");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empleados = useMemo(
    () =>
      rows.filter(
        (r) => r.activo && (r.rol === "EMPLEADO" || r.rol === "AMBOS"),
      ),
    [rows],
  );
  const autorizadores = useMemo(
    () =>
      rows.filter(
        (r) => r.activo && (r.rol === "AUTORIZADOR" || r.rol === "AMBOS"),
      ),
    [rows],
  );
  const inactivos = useMemo(() => rows.filter((r) => !r.activo), [rows]);

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/accesos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nombre, empNo, rol, activo: true }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!res.ok || !data.ok) {
      setError(data.error || "No se pudo guardar.");
      return;
    }
    toast(`Guardado: ${email}`, "green");
    setEmail("");
    setNombre("");
    setEmpNo("");
    setFormRol("EMPLEADO");
    router.refresh();
  };

  const deactivate = async (target: string) => {
    setBusy(true);
    await fetch(`/api/auth/accesos?email=${encodeURIComponent(target)}`, {
      method: "DELETE",
    });
    setBusy(false);
    toast("Desactivado", "warn");
    router.refresh();
  };

  const enterAs = async (row: AccesoRow) => {
    setBusy(true);
    const res = await fetch("/api/auth/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: row.email }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      aviso?: string;
      impersonating?: boolean;
      uiRol?: "empleado" | "gerente";
      homePath?: string;
      effectiveEmail?: string;
    };
    setBusy(false);

    if (!res.ok || !data.ok || !data.impersonating) {
      toast(
        data.error || data.aviso || "No se pudo entrar como ese usuario.",
        "danger",
      );
      return;
    }

    const uiRol = data.uiRol || uiRolFromPortalAcceso(row.rol);
    setRol(uiRol);
    window.dispatchEvent(new Event(IFS_EMPLOYEE_CHANGED_EVENT));
    toast(
      uiRol === "gerente"
        ? `Autorizando como ${data.effectiveEmail}`
        : `Solicitando horas como ${data.effectiveEmail}`,
      "green",
    );
    router.push(data.homePath || homePathFromPortalAcceso(row.rol));
    router.refresh();
  };

  return (
    <div className="mt-6 space-y-8">
      <p className="text-xs text-muted">
        Operador: <strong className="text-navy">{operator}</strong>
      </p>

      <form
        className="space-y-3 rounded-lg border border-[#c7d9ed] bg-[#f8fafc] px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <p className="text-sm font-semibold text-navy">
          Dar de alta empleado o autorizador
        </p>
        <p className="text-xs text-muted">
          El correo debe existir como EmailId en IFS (CEmpPortalUserSet). Luego
          podrás entrar como esa persona para pedir u autorizar horas.
        </p>
        <input
          className="w-full rounded border border-[#c7d9ed] px-3 py-2 text-sm"
          placeholder="correo@empresa.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border border-[#c7d9ed] px-3 py-2 text-sm"
          placeholder="Nombre (opcional)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <input
          className="w-full rounded border border-[#c7d9ed] px-3 py-2 text-sm"
          placeholder="EmpNo IFS (opcional)"
          value={empNo}
          onChange={(e) => setEmpNo(e.target.value)}
        />
        <select
          className="w-full rounded border border-[#c7d9ed] px-3 py-2 text-sm"
          value={rol}
          onChange={(e) => setFormRol(e.target.value as PortalAccesoRolValue)}
        >
          <option value="EMPLEADO">Empleado — solicitar / reportar horas</option>
          <option value="AUTORIZADOR">
            Autorizador — aprobar / rechazar horas
          </option>
          <option value="AMBOS">Ambos roles</option>
        </select>
        {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Guardar
        </button>
      </form>

      <Section
        title="Empleados — solicitar horas"
        empty="Ningún empleado activo. Agrega uno arriba (ej. liz.lino@veyron.com.mx)."
        rows={empleados}
        busy={busy}
        actionLabel="Entrar a solicitar"
        onEnter={enterAs}
        onDeactivate={deactivate}
      />

      <Section
        title="Autorizadores — aprobar horas"
        empty="Ningún autorizador activo. Agrega uno arriba (ej. jcgarcia@h-mv.com)."
        rows={autorizadores}
        busy={busy}
        actionLabel="Entrar a autorizar"
        onEnter={enterAs}
        onDeactivate={deactivate}
      />

      {inactivos.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-muted">Inactivos</h2>
          <ul className="mt-2 space-y-2">
            {inactivos.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-muted"
              >
                {row.email} · {labelPortalAccesoRol(row.rol)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  empty,
  rows,
  busy,
  actionLabel,
  onEnter,
  onDeactivate,
}: {
  title: string;
  empty: string;
  rows: AccesoRow[];
  busy: boolean;
  actionLabel: string;
  onEnter: (row: AccesoRow) => void;
  onDeactivate: (email: string) => void;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      <ul className="mt-2 space-y-2">
        {rows.length === 0 ? (
          <li className="text-sm text-muted">{empty}</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-border bg-green-bg px-4 py-3 text-sm"
            >
              <div>
                <div className="font-semibold text-navy">{row.email}</div>
                <div className="text-xs text-muted">
                  {[
                    row.nombre,
                    row.empNo && `EmpNo ${row.empNo}`,
                    labelPortalAccesoRol(row.rol),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onEnter(row)}
                  className="rounded-full border border-amber-400 bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-950 disabled:opacity-50"
                >
                  {actionLabel}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onDeactivate(row.email)}
                  className="rounded-full border border-[#fecaca] px-3 py-0.5 text-xs font-semibold text-[#991b1b] disabled:opacity-50"
                >
                  Desactivar
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
