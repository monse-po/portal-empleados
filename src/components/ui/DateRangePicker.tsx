"use client";

import { useMemo } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "date-fns/locale";
import {
  DATE_PICKER_ROOT_CLASS,
  DatePickerClearFooter,
  DatePickerShell,
} from "@/src/components/ui/DatePickerShell";
import { dateToIso, isoToDate } from "@/src/lib/date-picker-utils";

type DateRangePickerProps = {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
  /** Cierra el popover cuando el rango queda completo */
  onRangeComplete?: () => void;
  compact?: boolean;
};

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
      className={DATE_PICKER_ROOT_CLASS}
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
      <DatePickerShell footer={<DatePickerClearFooter onClear={handleClear} />}>
        {picker}
      </DatePickerShell>
    );
  }

  return (
    <DatePickerShell wide footer={<DatePickerClearFooter onClear={handleClear} />}>
      {picker}
    </DatePickerShell>
  );
}
