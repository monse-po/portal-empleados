"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/src/components/ui/Icon";
import { useNotificationsOptional } from "@/src/components/notifications/NotificationContext";
import { useRole } from "@/src/components/layout/RoleContext";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationBell() {
  const { isGerente, roleReady } = useRole();
  const ctx = useNotificationsOptional();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!roleReady || !isGerente || !ctx) return null;

  const { items, unreadCount, loading, markRead, markAllRead } = ctx;

  const handleOpenItem = async (id: string, href: string) => {
    await markRead(id);
    setOpen(false);
    router.push(href);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        title="Notificaciones"
        aria-label={
          unreadCount > 0
            ? `Notificaciones, ${unreadCount} sin leer`
            : "Notificaciones"
        }
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#e5e9f0] bg-white text-navy transition-colors hover:border-[#c7d9ed] hover:bg-[#f4f7fb]"
      >
        <Icon name="bell" size="md" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#2563eb] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[1200] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-xl border border-border bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-[13px] font-bold text-navy">Notificaciones</p>
              <p className="text-[11px] text-muted">Tiempo · envíos a aprobación</p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="cursor-pointer text-[11px] font-semibold text-[#2563eb] hover:underline"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-muted">
                Cargando…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-muted">
                No hay notificaciones recientes.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleOpenItem(item.id, item.href)}
                  className={`flex w-full cursor-pointer gap-3 border-b border-[#f1f5f9] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#f8fafc] ${
                    item.leida ? "opacity-75" : "bg-[#f4f7fb]/60"
                  }`}
                >
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      item.leida ? "bg-transparent" : "bg-[#2563eb]"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold text-[#111827]">
                      {item.titulo}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-[#4b5563]">
                      {item.mensaje}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted">
                      {formatWhen(item.createdAt)}
                    </span>
                  </span>
                  <Icon name="chevronRight" size="sm" className="mt-1 shrink-0 text-muted" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
