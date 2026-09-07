"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/src/components/ui/Icon";
import { LoadingNotice } from "@/src/components/ui/LoadingNotice";
import { LOADING_COPY } from "@/src/lib/copy/loading";
import { useNotificationsOptional } from "@/src/components/notifications/NotificationContext";
import { useRole } from "@/src/components/layout/RoleContext";
import { formatNotifWhen } from "@/src/lib/notificacion-tiempo";

function MobileBellLink({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const active = pathname.startsWith("/notificaciones");

  return (
    <Link
      href="/notificaciones"
      title="Notificaciones de hoy"
      aria-label={
        unreadCount > 0
          ? `Notificaciones de hoy, ${unreadCount} sin leer`
          : "Notificaciones de hoy"
      }
      className={`relative inline-flex h-10 w-10 cursor-pointer touch-manipulation items-center justify-center rounded-md md:hidden ${
        active ? "text-navy active:bg-[#eef3f9]" : "text-[#4b5563] active:bg-[#eef3f9]"
      }`}
    >
      <Icon name="bell" size="md" />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#dbeafe] px-0.5 text-[9px] font-bold leading-none text-[#1d4ed8]">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
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

  if (!roleReady || !ctx) return null;

  const { items, unreadCount, loading, markRead, markAllRead } = ctx;
  const subtitle = isGerente
    ? "Hoy · envíos de tu equipo"
    : "Hoy · novedades de tus solicitudes";

  const handleOpenItem = async (id: string, href: string) => {
    await markRead(id);
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <MobileBellLink unreadCount={unreadCount} />
      <div ref={wrapRef} className="relative hidden md:block">
        <button
          type="button"
          title="Notificaciones de hoy"
          aria-label={
            unreadCount > 0
              ? `Notificaciones de hoy, ${unreadCount} sin leer`
              : "Notificaciones de hoy"
          }
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-white text-navy transition-colors hover:border-[#c7d9ed] hover:bg-[#eef3f9]"
        >
          <Icon name="bell" size="md" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#dbeafe] px-1 text-[10px] font-bold text-[#1d4ed8]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-[1200] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-xl border border-border bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-[13px] font-bold text-navy">Notificaciones</p>
                <p className="text-[11px] text-muted">{subtitle}</p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="btn-link"
                >
                  Marcar todas
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="border-b border-loading-violet-border bg-loading-violet-soft px-4 py-5">
                  <LoadingNotice
                    variant="inline"
                    icon={LOADING_COPY.notifications.icon}
                    label={LOADING_COPY.notifications.label}
                  />
                </div>
              ) : items.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12px] text-muted">
                  No hay notificaciones de hoy.
                </p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleOpenItem(item.id, item.href)}
                    className={`flex w-full cursor-pointer gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-[#fafbfc] ${
                      item.leida ? "bg-white" : "bg-[#eef3f9]"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.leida ? "bg-transparent" : "bg-navy"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-semibold text-navy">
                        {item.titulo}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-[#4b5563]">
                        {item.mensaje}
                      </span>
                      <span className="mt-1 block text-[10px] text-muted">
                        {formatNotifWhen(item.createdAt)}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
