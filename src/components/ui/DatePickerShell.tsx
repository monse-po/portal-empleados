import type { ReactNode } from "react";

/** Ancho estándar del calendario en filtros / popovers. */
export const DATE_PICKER_WIDTH = 252;

/** className del root de react-day-picker — emparejar con `date-picker.css`. */
export const DATE_PICKER_ROOT_CLASS = "ds-date-picker";

type DatePickerShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

export function DatePickerShell({
  children,
  footer,
  wide = false,
}: DatePickerShellProps) {
  return (
    <div
      className={`ds-date-picker-shell${wide ? " ds-date-picker-shell--wide" : ""}`}
    >
      {children}
      {footer}
    </div>
  );
}

export function DatePickerClearFooter({ onClear }: { onClear: () => void }) {
  return (
    <div className="ds-date-picker-footer">
      <button type="button" onClick={onClear} className="ds-date-picker-clear">
        Limpiar
      </button>
    </div>
  );
}
