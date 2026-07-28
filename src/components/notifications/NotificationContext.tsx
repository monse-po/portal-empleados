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
    if (!roleReady || !isGerente) return;
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
    if (!roleReady || !isGerente) return;

    let cancelled = false;

    const load = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setLoading(true);
      try {
        const data = await getNotificacionesGerenteAction();
        if (!cancelled) {
          setItems(data.items);
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error("[notificaciones] error al cargar", error);
        if (!cancelled) {
          setItems([]);
          setUnreadCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
        inFlight.current = false;
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [isGerente, roleReady]);

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

  const value = useMemo(() => {
    const visibleItems = roleReady && isGerente ? items : [];
    const visibleUnread = roleReady && isGerente ? unreadCount : 0;
    return {
      items: visibleItems,
      unreadCount: visibleUnread,
      loading: roleReady && isGerente ? loading : false,
      refresh,
      markRead,
      markAllRead,
    };
  }, [items, unreadCount, loading, roleReady, isGerente, refresh, markRead, markAllRead]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationsOptional() {
  return useContext(NotificationContext);
}
