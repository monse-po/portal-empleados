"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getNotificacionesGerenteAction,
  marcarNotificacionLeidaAction,
  marcarTodasNotificacionesLeidasAction,
} from "@/src/server/notificacion-actions";
import { useRole } from "@/src/components/layout/RoleContext";
import type { NotificacionUi } from "@/src/lib/notificacion-tiempo";

type NotificationContextValue = {
  items: NotificacionUi[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const POLL_MS = 20_000;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isGerente, roleReady } = useRole();
  const [items, setItems] = useState<NotificacionUi[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!roleReady || !isGerente) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const data = await getNotificacionesGerenteAction();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error("[notificaciones] error al cargar", error);
      setItems([]);
      setUnreadCount(0);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [isGerente, roleReady]);

  useEffect(() => {
    void refresh();
    if (!roleReady || !isGerente) return;
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh, isGerente, roleReady]);

  const markRead = useCallback(async (id: string) => {
    await marcarNotificacionLeidaAction(id);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, leida: true } : item)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await marcarTodasNotificacionesLeidasAction();
    setItems((prev) => prev.map((item) => ({ ...item, leida: true })));
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [items, unreadCount, loading, refresh, markRead, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationsOptional() {
  return useContext(NotificationContext);
}
