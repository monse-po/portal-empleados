"use client";

import { useMemo } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "date-fns/locale";
import "react-day-picker/style.css";

type DateRangePickerProps = {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
  /** Cierra el popover cuando el rango queda completo */
  onRangeComplete?: () => void;
  compact?: boolean;
};

function isoToDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if ([y, m, d].some(Number.isNaN)) return undefined;
  return new Date(y, m - 1, d);
}

function dateToIso(d?: Date): string | undefined {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ClearFooter({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex justify-end border-t border-border px-3 py-1.5">
      <button
        type="button"
        onClick={onClear}
        className="cursor-pointer border-none bg-transparent px-1 text-[12px] font-semibold text-muted hover:text-navy"
      >
        Limpiar
      </button>
    </div>
  );
}

export function DateRangePicker({
  from,
  to,
  onChange,
  onRangeComplete,
  compact = false,
}: DateRangePickerProps) {
  const selected = useMemo<DateRange | undefined>(() => {
    const fromDate = isoToDate(from);
    const toDate = isoToDate(to);
    if (!fromDate && !toDate) return undefined;
    return { from: fromDate, to: toDate };
  }, [from, to]);

  const defaultMonth = useMemo(
    () => isoToDate(from) ?? isoToDate(to) ?? new Date(),
    [from, to],
  );

  const handleSelect = (next: DateRange | undefined) => {
    if (!next?.from && !next?.to) {
      onChange(undefined, undefined);
      return;
    }

    const fromIso = dateToIso(next.from);
    const toIso = dateToIso(next.to);
    onChange(fromIso, toIso);

    if (fromIso && toIso) {
      onRangeComplete?.();
    }
  };

  const handleClear = () => {
    onChange(undefined, undefined);
  };

  const picker = (
    <DayPicker
      className={compact ? "rdp-hmv-filter" : "rdp-root"}
      mode="range"
      locale={es}
      selected={selected}
      onSelect={handleSelect}
      defaultMonth={defaultMonth}
      numberOfMonths={1}
      showOutsideDays={false}
      captionLayout="label"
      navLayout="around"
      resetOnSelect
    />
  );

  if (compact) {
    return (
      <div className="rdp-hmv-filter-shell">
        {picker}
        <ClearFooter onClear={handleClear} />
      </div>
    );
  }

  return (
    <div>
      {picker}
      <div className="mt-2 px-1">
        <ClearFooter onClear={handleClear} />
      </div>
    </div>
  );
}
