"use client";

import { useEffect, useState } from "react";
import { getIfsSessionStatusAction } from "@/src/server/mi-tiempo-catalog-actions";

type IfsSurface =
  | "timesheet"
  | "approval"
  | "anticipos"
  | "anticipos-approval"
  | "historico";

type IfsStatusBannerProps = {
  connected: boolean;
  fromIfs: boolean;
  email?: string | null;
  warning?: string | null;
  surface: IfsSurface;
  loginNext?: string;
};

const IFS_AUTH_ENABLED = process.env.NEXT_PUBLIC_IFS_AUTH_ENABLED === "true";

const SURFACE_LOGIN_NEXT: Record<IfsSurface, string> = {
  timesheet: "/hoja-tiempo",
  approval: "/aprobacion-tiempo-proyectos",
  anticipos: "/mis-anticipos",
  "anticipos-approval": "/aprobacion-anticipos",
  historico: "/historico-tiempo",
};

function loginHref(surface: IfsSurface, loginNext?: string): string {
  const next = loginNext ?? SURFACE_LOGIN_NEXT[surface];
  return `/login?next=${encodeURIComponent(next)}`;
}

function isConnectedOk(
  connected: boolean,
  fromIfs: boolean,
  surface: IfsSurface,
  warning?: string | null,
): boolean {
  if (!IFS_AUTH_ENABLED || !connected || warning) return false;
  return fromIfs || surface === "approval" || surface === "historico";
}

export function IfsConnectedChip({
  connected,
  fromIfs,
  warning,
  surface,
}: Pick<IfsStatusBannerProps, "connected" | "fromIfs" | "warning" | "surface">) {
  if (!isConnectedOk(connected, fromIfs, surface, warning)) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted"
      title="Conexión activa"
      aria-label="Conexión activa"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-green" />
      Conectado
    </span>
  );
}

export function IfsStatusBanner({
  connected,
  fromIfs,
  warning,
  surface,
  loginNext,
}: IfsStatusBannerProps) {
  const [probe, setProbe] = useState({
    ready: !IFS_AUTH_ENABLED,
    connected: false,
  });

  useEffect(() => {
    if (!IFS_AUTH_ENABLED) return;
    let cancelled = false;
    void getIfsSessionStatusAction()
      .then((status) => {
        if (!cancelled) {
          setProbe({ ready: true, connected: Boolean(status.connected) });
        }
      })
      .catch(() => {
        if (!cancelled) setProbe({ ready: true, connected: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!IFS_AUTH_ENABLED) {
    return (
      <p className="mb-2 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1.5 text-[13px] text-[#1e40af]">
        <strong>Ambiente DEMO (DEV).</strong> Puedes registrar y probar sin
        login IFS. Los datos son locales de este ambiente.
      </p>
    );
  }

  const knownConnected = connected || probe.connected;

  if (isConnectedOk(knownConnected, fromIfs, surface, warning)) {
    return null;
  }

  if (knownConnected && warning) {
    return (
      <p className="alert-warn mb-2 px-3 py-2 text-[13px]">
        No se pudieron cargar los datos. Inténtalo de nuevo o avisa a soporte.
      </p>
    );
  }

  if (!probe.ready || knownConnected) {
    return null;
  }

  return (
    <p className="alert-warn mb-2 px-3 py-1.5 text-[13px]">
      <strong>Sin sesión.</strong> No se muestran datos de ejemplo. Esta
      pantalla queda vacía a propósito hasta que inicies sesión.{" "}
      <a href={loginHref(surface, loginNext)} className="font-semibold underline">
        Iniciar sesión
      </a>
    </p>
  );
}
