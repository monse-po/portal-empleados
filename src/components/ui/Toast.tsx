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
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/src/components/ui/Icon";

export type ToastVariant = "green" | "danger" | "navy" | "warn";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3500;

const variantStyles: Record<ToastVariant, string> = {
  green: "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]",
  danger: "bg-[#fff5f5] text-[#b91c1c] border-[#fecaca]",
  navy: "bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]",
  warn: "bg-[#fffbeb] text-[#92400e] border-[#fde68a]",
};

const variantIcons: Record<ToastVariant, IconName> = {
  green: "circleCheck",
  danger: "alertCircle",
  navy: "info",
  warn: "triangleAlert",
};

function ToastBubble({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), 10);
    const hideTimer = window.setTimeout(() => setVisible(false), TOAST_DURATION_MS);
    const removeTimer = window.setTimeout(onDone, TOAST_DURATION_MS + 250);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, [onDone]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none flex items-center gap-2 rounded-[6px] border-[1.5px] px-4 py-2.5 text-[12px] font-medium shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all duration-200 ${variantStyles[item.variant]} ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <Icon name={variantIcons[item.variant]} size="sm" className="shrink-0" />
      <span>{item.message}</span>
    </div>
  );
}

function ToastViewport({
  items,
  onRemove,
}: {
  items: ToastItem[];
  onRemove: (id: number) => void;
}) {
  if (typeof document === "undefined" || items.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed right-5 top-[68px] z-[9999] flex w-[min(360px,calc(100vw-40px))] flex-col gap-2">
      {items.map((item) => (
        <ToastBubble
          key={item.id}
          item={item}
          onDone={() => onRemove(item.id)}
        />
      ))}
    </div>,
    document.body,
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "navy") => {
      nextIdRef.current += 1;
      const id = nextIdRef.current;
      setItems((prev) => [...prev, { id, message, variant }]);
    },
    [],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onRemove={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return ctx;
}
