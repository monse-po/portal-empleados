"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { Icon } from "@/src/components/ui/Icon";
import { LoadingNotice } from "@/src/components/ui/LoadingNotice";
import { LOADING_COPY } from "@/src/lib/copy/loading";
import { useNotificationsOptional } from "@/src/components/notifications/NotificationContext";
import { useRole } from "@/src/components/layout/RoleContext";
import type { NotificacionUi } from "@/src/lib/notificacion-tiempo";

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

function NotificacionRow({
  item,
  onOpen,
}: {
  item: NotificacionUi;
  onOpen: (item: NotificacionUi) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`flex w-full touch-manipulation items-start gap-3 border-b border-[#eef2f6] px-4 py-4 text-left last:border-b-0 active:bg-[#f4f7fb] ${
        item.leida ? "bg-white" : "bg-[#f4f7fb]"
      }`}
    >
      <span
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
          item.leida ? "bg-[#d1d5db]" : "bg-[#2563eb]"
        }`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[15px] leading-snug ${
            item.leida ? "font-medium text-[#374151]" : "font-bold text-[#111]"
          }`}
        >
          {item.titulo}
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-[#4b5563]">
          {item.mensaje}
        </span>
        <span className="mt-2 block text-[12px] text-muted">
          {formatWhen(item.createdAt)}
        </span>
      </span>
      <Icon name="chevronRight" size="md" className="mt-1 shrink-0 text-[#c0c7d4]" />
    </button>
  );
}

export function NotificacionesView() {
  const { isGerente } = useRole();
  const ctx = useNotificationsOptional();
  const router = useRouter();

  const subtitle = isGerente
    ? "Envíos a aprobación de tiempo"
    : "Aprobaciones y rechazos de tu tiempo";

  if (!ctx) return null;

  const { items, unreadCount, loading, markRead, markAllRead } = ctx;

  const handleOpen = async (item: NotificacionUi) => {
    if (!item.leida) await markRead(item.id);
    router.push(item.href);
  };

  return (
    <div className="view-wide">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111]">Notificaciones</h1>
          <p className="mt-1 text-[13px] text-[#4b5563]">{subtitle}</p>
        </div>
        {unreadCount > 0 ? (
          <Button variant="tertiary" onClick={() => void markAllRead()}>
            Marcar todas como leídas
          </Button>
        ) : null}
      </div>

      <Card className="!mb-0 overflow-hidden p-0">
        {loading && items.length === 0 ? (
          <div className="px-4 py-8">
            <LoadingNotice
              variant="panel"
              icon={LOADING_COPY.notifications.icon}
              label={LOADING_COPY.notifications.label}
            />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Icon name="bell" size="xl" className="text-[#c0c7d4]" />
            <p className="mt-3 text-[15px] font-semibold text-[#374151]">
              No hay notificaciones
            </p>
            <p className="mt-1 text-[13px] text-muted">
              Cuando haya novedades de tiempo, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <NotificacionRow key={item.id} item={item} onOpen={handleOpen} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
