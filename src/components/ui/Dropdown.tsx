"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type DropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  menuClassName?: string;
  /** Sin límite de altura — p. ej. calendario de rango de fechas */
  fitContent?: boolean;
  /** Ancho del menú cuando `fitContent` (default 252). */
  menuWidth?: number;
  /** Render menu in a portal to escape overflow containers (e.g. modals) */
  portal?: boolean;
};

export function Dropdown({
  open,
  onOpenChange,
  trigger,
  children,
  className = "",
  menuClassName = "",
  fitContent = false,
  menuWidth = 252,
  portal = false,
}: DropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open || !portal) return;

    const updatePosition = () => {
      const triggerEl = triggerWrapRef.current;
      const menuEl = menuRef.current;
      if (!triggerEl || !menuEl) return;

      const rect = triggerEl.getBoundingClientRect();
      const menuHeight = menuEl.offsetHeight || 280;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const openUp =
        spaceBelow < Math.min(menuHeight, 180) && rect.top > spaceBelow;
      const width = fitContent ? menuWidth : rect.width;
      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - width - 8),
      );

      setMenuStyle({
        position: "fixed",
        left,
        width,
        minWidth: fitContent ? menuWidth : undefined,
        top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
        zIndex: 1200,
      });
    };

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, portal, fitContent, menuWidth, children]);

  useEffect(() => {
    if (!open) return;

    const isInside = (event: Event) => {
      const nodes =
        typeof event.composedPath === "function"
          ? event.composedPath()
          : event.target
            ? [event.target]
            : [];
      return nodes.some(
        (node) =>
          node instanceof Node &&
          (rootRef.current?.contains(node) || menuRef.current?.contains(node)),
      );
    };

    // Capture en window: el dialog del Modal hace stopPropagation y el menú
    // va por portal (fuera del dialog). Sin esto, clic fuera no cierra.
    const onPointerDown = (event: Event) => {
      if (isInside(event)) return;
      onOpenChange(false);
    };

    const onFocusIn = (event: FocusEvent) => {
      if (isInside(event)) return;
      onOpenChange(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onOpenChange(false);
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("mousedown", onPointerDown, true);
    window.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("mousedown", onPointerDown, true);
      window.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onOpenChange]);

  const menuClasses = (
    fitContent
      ? "overflow-visible rounded-[10px] border border-border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
      : "max-h-[280px] overflow-y-auto rounded-[10px] border border-border bg-white p-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.14)]"
  )
    .concat(menuClassName ? ` ${menuClassName}` : "")
    .trim();

  const menuNode = open ? (
    <div ref={menuRef} className={menuClasses} style={portal ? menuStyle : undefined}>
      {children}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <div ref={triggerWrapRef} className="w-full">
        {trigger}
      </div>
      {!portal && open && (
        <div className={`absolute left-0 right-0 z-10 mt-1 ${menuClasses}`}>
          {children}
        </div>
      )}
      {portal &&
        menuNode &&
        typeof document !== "undefined" &&
        createPortal(menuNode, document.body)}
    </div>
  );
}
