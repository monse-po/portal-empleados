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
};

export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  widthClass = "max-w-[520px]",
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[92vh] w-full ${widthClass} flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-2.5">
            {icon && <Icon name={icon} size="md" className="text-navy" />}
            <span id={titleId} className="text-[15px] font-bold text-navy">
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded px-1.5 py-0.5 text-lg leading-none text-[#9ca3af] hover:text-muted"
            title="Cerrar"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-between border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
