"use client";

import { useMemo, useState, type ReactNode } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import { es } from "date-fns/locale";
import {
  DATE_PICKER_ROOT_CLASS,
  DatePickerClearFooter,
  DatePickerShell,
} from "@/src/components/ui/DatePickerShell";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { dateInputClassWithError } from "@/src/components/ui/DateInput";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";
import {
  dateToIso,
  eachIsoDateInclusive,
  isoToDate,
} from "@/src/lib/date-picker-utils";
import {
  clampFechaMes,
  FESTIVOS_2026,
  type MesActualBounds,
} from "@/src/lib/mi-tiempo-mock";

type DateRangePickerProps = {
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
  /** Cierra el popover cuando el rango queda completo (filtros). */
  onRangeComplete?: () => void;
  compact?: boolean;
  min?: string;
  max?: string;
  /** Días no laborables del programa (además de min/max). */
  disabledMatchers?: Matcher[];
  /** Sustituye el footer por defecto (Limpiar). `null` oculta el footer. */
  footer?: ReactNode | null;
};

export function DateRangePicker({
  from,
  to,
  onChange,
  onRangeComplete,
  compact = false,
  min,
  max,
  disabledMatchers,
  footer,
}: DateRangePickerProps) {
  const selected = useMemo<DateRange | undefined>(() => {
    const fromDate = isoToDate(from);
    const toDate = isoToDate(to);
    if (!fromDate && !toDate) return undefined;
    return { from: fromDate, to: toDate };
  }, [from, to]);

  const defaultMonth = useMemo(
    () => isoToDate(from) ?? isoToDate(to) ?? isoToDate(min) ?? new Date(),
    [from, to, min],
  );

  const disabled = useMemo(() => {
    const rules: Matcher[] = [];
    const minDate = isoToDate(min);
    const maxDate = isoToDate(max);
    if (minDate) rules.push({ before: minDate });
    if (maxDate) rules.push({ after: maxDate });
    if (disabledMatchers?.length) rules.push(...disabledMatchers);
    return rules.length ? rules : undefined;
  }, [min, max, disabledMatchers]);

  const handleSelect = (next: DateRange | undefined) => {
    if (!next?.from && !next?.to) {
      onChange(undefined, undefined);
      return;
    }

    let fromIso = dateToIso(next.from);
    let toIso = dateToIso(next.to);

    if (fromIso && min) fromIso = fromIso < min ? min : fromIso;
    if (fromIso && max) fromIso = fromIso > max ? max : fromIso;
    if (toIso && min) toIso = toIso < min ? min : toIso;
    if (toIso && max) toIso = toIso > max ? max : toIso;

    onChange(fromIso, toIso);

    if (fromIso && toIso) {
      onRangeComplete?.();
    }
  };

  const handleClear = () => {
    onChange(undefined, undefined);
  };

  const resolvedFooter =
    footer === null
      ? undefined
      : footer !== undefined
        ? footer
        : <DatePickerClearFooter onClear={handleClear} />;

  const festivoMatcher = useMemo<Matcher>(
    () => (date: Date) => {
      const iso = dateToIso(date);
      return Boolean(iso && FESTIVOS_2026.includes(iso));
    },
    [],
  );

  const finSemanaMatcher = useMemo<Matcher>(
    () => (date: Date) => {
      const day = date.getDay();
      return day === 0 || day === 6;
    },
    [],
  );

  const picker = (
    <DayPicker
      className={DATE_PICKER_ROOT_CLASS}
      mode="range"
      locale={es}
      selected={selected}
      onSelect={handleSelect}
      defaultMonth={defaultMonth}
      startMonth={isoToDate(min)}
      endMonth={isoToDate(max)}
      disabled={disabled}
      modifiers={{
        festivo: festivoMatcher,
        finSemana: finSemanaMatcher,
      }}
      modifiersClassNames={{
        festivo: "ds-day-festivo",
        finSemana: "ds-day-finsemana",
      }}
      numberOfMonths={1}
      showOutsideDays={false}
      captionLayout="label"
      navLayout="around"
      resetOnSelect
    />
  );

  if (compact) {
    return (
      <DatePickerShell footer={resolvedFooter}>
        {picker}
      </DatePickerShell>
    );
  }

  return (
    <DatePickerShell wide footer={resolvedFooter}>
      {picker}
    </DatePickerShell>
  );
}

/** Etiqueta corta: un día → «12 ago»; rango → «12 – 16». */
export function formatFechaRangoCorto(from?: string, to?: string): string {
  if (!from) return "Elegir fecha o rango…";
  const dFrom = isoToDate(from);
  if (!dFrom) return "Elegir fecha o rango…";
  const dayFrom = dFrom.getDate();
  if (!to || to === from) {
    const mes = dFrom
      .toLocaleDateString("es-ES", { month: "short" })
      .replace(/\./g, "");
    return `${dayFrom} ${mes}`;
  }
  const dTo = isoToDate(to);
  if (!dTo) return `${dayFrom}`;
  const dayTo = dTo.getDate();
  if (
    dFrom.getMonth() === dTo.getMonth() &&
    dFrom.getFullYear() === dTo.getFullYear()
  ) {
    return `${dayFrom} – ${dayTo}`;
  }
  const mesTo = dTo
    .toLocaleDateString("es-ES", { month: "short" })
    .replace(/\./g, "");
  return `${dayFrom} – ${dayTo} ${mesTo}`;
}

type FechaDiaORangoInputProps = {
  from: string;
  to: string;
  bounds: MesActualBounds;
  invalid?: boolean;
  /** false = solo un día (modo edición) */
  allowRange?: boolean;
  /** Cuántos días se registrarán (ya filtrados por programa + tipo). */
  laborableCount?: number;
  onChange: (from: string, to: string) => void;
};

/**
 * Un solo campo: clic abre calendario (rango se puede completar con «Listo»).
 * Cierra con «Listo», clic fuera o al enfocar otro control.
 */
export function FechaDiaORangoInput({
  from,
  to,
  bounds,
  invalid,
  allowRange = true,
  laborableCount,
  onChange,
}: FechaDiaORangoInputProps) {
  const [open, setOpen] = useState(false);

  const commit = (nextFrom?: string, nextTo?: string) => {
    if (!nextFrom && !nextTo) return;
    const a = clampFechaMes(nextFrom || nextTo || bounds.defaultFecha, bounds);
    const b = clampFechaMes(nextTo || nextFrom || a, bounds);
    const desde = a <= b ? a : b;
    const hasta = allowRange ? (a <= b ? b : a) : desde;
    onChange(desde, hasta);
  };

  const label = formatFechaRangoCorto(from || undefined, to || undefined);
  const hasRange = Boolean(from && to && to !== from);
  const spanCount = hasRange
    ? eachIsoDateInclusive(from, to).length
    : from
      ? 1
      : 0;
  const countLabel =
    typeof laborableCount === "number" && laborableCount > 0
      ? laborableCount
      : spanCount;

  return (
    <Dropdown
      open={open}
      onOpenChange={(next) => {
        if (!next && from && !to) {
          commit(from, from);
        }
        setOpen(next);
      }}
      portal
      fitContent
      menuClassName="w-[252px] overflow-hidden border-border p-0 shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
      trigger={
        <button
          type="button"
          aria-label="Fecha o rango"
          onClick={() => setOpen((value) => !value)}
          className={`flex min-h-[38px] w-full cursor-pointer items-center justify-between gap-2 text-left ${dateInputClassWithError(invalid)}`}
        >
          <span
            className={`min-w-0 flex-1 truncate whitespace-nowrap ${
              from ? "text-text" : "text-muted"
            }`}
          >
            {from ? label : "Elegir fecha o rango…"}
            {from && countLabel > 0 ? (
              <span className="ml-1.5 text-muted">
                ({countLabel} {countLabel === 1 ? "día" : "días"})
              </span>
            ) : null}
          </span>
          <DropdownChevron />
        </button>
      }
    >
      <DateRangePicker
        compact
        from={from || undefined}
        to={to || undefined}
        min={bounds.min}
        max={bounds.max}
        onChange={(nextFrom, nextTo) => {
          if (!nextFrom && !nextTo) {
            onChange("", "");
            return;
          }
          if (!allowRange) {
            const day = nextTo || nextFrom;
            if (day) {
              commit(day, day);
              setOpen(false);
            }
            return;
          }
          if (nextFrom && nextTo) {
            commit(nextFrom, nextTo);
            return;
          }
          if (nextFrom) {
            onChange(clampFechaMes(nextFrom, bounds), "");
          }
        }}
        footer={
          <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
            <button
              type="button"
              className="ds-date-picker-clear"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChange("", "");
              }}
            >
              Limpiar
            </button>
            <button
              type="button"
              className="shrink-0 cursor-pointer text-[12px] font-semibold text-[#2563eb] hover:underline"
              onClick={() => {
                if (from && !to) commit(from, from);
                setOpen(false);
              }}
            >
              Listo
            </button>
          </div>
        }
      />
    </Dropdown>
  );
}
