"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/src/components/ui/Icon";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: IconName;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
  /** Bloquea cierre mientras una acción async está en curso */
  busy?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  widthClass = "max-w-[520px]",
  busy = false,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, busy]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/45 p-4 max-md:items-stretch max-md:p-0"
      onPointerDown={(event) => {
        if (busy) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[92vh] w-full ${widthClass} flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:rounded-none`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5 max-md:px-4 max-md:py-3.5">
          <div className="flex items-center gap-2.5 max-md:min-w-0">
            {icon && <Icon name={icon} size="md" className="text-navy max-md:shrink-0" />}
            <span id={titleId} className="text-[15px] font-bold text-navy max-md:truncate">
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="cursor-pointer rounded px-1.5 py-0.5 text-lg leading-none text-[#9ca3af] hover:text-muted disabled:cursor-not-allowed disabled:opacity-50 max-md:inline-flex max-md:h-11 max-md:w-11 max-md:shrink-0 max-md:items-center max-md:justify-center max-md:rounded-lg max-md:text-2xl max-md:touch-manipulation"
            title="Cerrar"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4 max-md:py-4">
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 items-center justify-between border-t border-border px-6 py-4 max-md:flex-col-reverse max-md:gap-2 max-md:px-4 max-md:py-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:[&>div]:w-full max-md:[&_button]:min-h-12 max-md:[&_button]:w-full">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
