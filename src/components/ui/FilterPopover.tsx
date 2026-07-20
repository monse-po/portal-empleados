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

export const FILTER_POPOVER_MAIN_W = 260;
export const FILTER_POPOVER_SIDE_W = 240;
const GAP = 8;

type FilterPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
  /** Panel externo (nivel 2) — a la derecha del menú de columnas */
  sidePanel?: ReactNode;
  sideOpen?: boolean;
  /** Fila de columna activa — alinea verticalmente el panel 2 */
  sideAnchorEl?: HTMLElement | null;
};

const panelClass =
  "rounded-[10px] border border-[#E5E7EB] bg-white py-1 shadow-[0_4px_16px_rgba(0,0,0,0.10)]";

export function FilterPopover({
  open,
  anchorEl,
  onClose,
  children,
  sidePanel,
  sideOpen = false,
  sideAnchorEl,
}: FilterPopoverProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const [mainStyle, setMainStyle] = useState<CSSProperties>({});
  const [sideStyle, setSideStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open || !anchorEl) return;

    const update = () => {
      const rect = anchorEl.getBoundingClientRect();
      const mainLeft = rect.left;
      const mainTop = rect.bottom + 4;

      setMainStyle({
        position: "fixed",
        top: mainTop,
        left: mainLeft,
        width: FILTER_POPOVER_MAIN_W,
        zIndex: 1200,
      });

      if (sideOpen && sideAnchorEl) {
        const rowRect = sideAnchorEl.getBoundingClientRect();
        setSideStyle({
          position: "fixed",
          top: rowRect.top,
          left: mainLeft + FILTER_POPOVER_MAIN_W + GAP,
          width: FILTER_POPOVER_SIDE_W,
          zIndex: 1201,
        });
      }
    };

    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorEl, sideOpen, sideAnchorEl]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorEl?.contains(target)) return;
      if (mainRef.current?.contains(target)) return;
      if (sideRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose, anchorEl]);

  if (!open || !anchorEl || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div ref={mainRef} className={panelClass} style={mainStyle}>
        {children}
      </div>
      {sideOpen && sidePanel && (
        <div ref={sideRef} className={panelClass} style={sideStyle}>
          {sidePanel}
        </div>
      )}
    </>,
    document.body,
  );
}
