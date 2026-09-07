"use client";

import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import { es } from "date-fns/locale";
import {
  DATE_PICKER_ROOT_CLASS,
  DatePickerClearFooter,
  DatePickerShell,
} from "@/src/components/ui/DatePickerShell";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { dateInputClassWithError } from "@/src/components/ui/DateInput";
import { Field } from "@/src/components/ui/Field";
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
import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";
import { schedulePickerCssVars } from "@/src/lib/ifs/schedule-day-color";

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
  holidayDates?: string[];
  holidayColor?: string | null;
  weekendColor?: string | null;
  weekdayColor?: string | null;
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
  holidayDates,
  holidayColor,
  weekendColor,
  weekdayColor,
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

  const awaitingEnd = useRef(false);

  const handleSelect = (next: DateRange | undefined) => {
    if (!next?.from && !next?.to) {
      awaitingEnd.current = false;
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

    // El primer clic de rdp suele devolver from===to. Cerrar solo al elegir el fin.
    if (fromIso && toIso && fromIso !== toIso && awaitingEnd.current) {
      awaitingEnd.current = false;
      onRangeComplete?.();
      return;
    }
    awaitingEnd.current = Boolean(fromIso);
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

  const extraHolidays = useMemo(
    () => new Set(holidayDates ?? []),
    [holidayDates],
  );
  const pickerColors = useMemo(
    () =>
      schedulePickerCssVars({ holidayColor, weekendColor, weekdayColor }),
    [holidayColor, weekendColor, weekdayColor],
  );

  const festivoMatcher = useMemo<Matcher>(
    () => (date: Date) => {
      const iso = dateToIso(date);
      return Boolean(
        iso && (FESTIVOS_2026.includes(iso) || extraHolidays.has(iso)),
      );
    },
    [extraHolidays],
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
      <DatePickerShell footer={resolvedFooter} style={pickerColors}>
        {picker}
      </DatePickerShell>
    );
  }

  return (
    <DatePickerShell wide footer={resolvedFooter} style={pickerColors}>
      {picker}
    </DatePickerShell>
  );
}

/** Un día suelto (formularios): mismo calendario navy que Mi Tiempo, sin mes IFS. */
export function DatePickerInput({
  value,
  onChange,
  min,
  max,
  invalid,
  placeholder = "Elegir fecha…",
}: {
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => isoToDate(value), [value]);
  const defaultMonth = useMemo(
    () => selected ?? isoToDate(min) ?? new Date(),
    [selected, min],
  );
  const disabled = useMemo(() => {
    const rules: Matcher[] = [];
    const minDate = isoToDate(min);
    const maxDate = isoToDate(max);
    if (minDate) rules.push({ before: minDate });
    if (maxDate) rules.push({ after: maxDate });
    return rules.length ? rules : undefined;
  }, [min, max]);

  const label = value ? formatFechaCampo(value) : placeholder;

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      portal
      fitContent
      menuClassName="w-[252px] overflow-hidden border-border p-0 shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
      trigger={
        <button
          type="button"
          aria-label="Fecha"
          onClick={() => setOpen((v) => !v)}
          className={`flex w-full cursor-pointer items-center justify-between gap-2 text-left ${dateInputClassWithError(invalid)}`}
        >
          <span
            className={`min-w-0 flex-1 truncate whitespace-nowrap ${
              value ? "text-text" : "text-muted"
            }`}
          >
            {label}
          </span>
          <DropdownChevron />
        </button>
      }
    >
      <DatePickerShell
        footer={
          <DatePickerClearFooter
            onClear={() => {
              onChange("");
              setOpen(false);
            }}
          />
        }
      >
        <DayPicker
          className={DATE_PICKER_ROOT_CLASS}
          mode="single"
          locale={es}
          selected={selected}
          onSelect={(day) => {
            const iso = dateToIso(day);
            if (!iso) return;
            onChange(iso);
            setOpen(false);
          }}
          defaultMonth={defaultMonth}
          startMonth={isoToDate(min)}
          disabled={disabled}
          numberOfMonths={1}
          showOutsideDays={false}
          captionLayout="label"
          navLayout="around"
        />
      </DatePickerShell>
    </Dropdown>
  );
}

const MES_CORTO = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

function formatDiaMesAnio(d: Date): string {
  return `${d.getDate()} ${MES_CORTO[d.getMonth()]} ${d.getFullYear()}`;
}

function formatFechaCampo(iso: string): string {
  return formatFechaRangoCorto(iso, iso);
}

/** Un día → «3 sep 2026»; rango → «3 – 10 sep 2026». */
export function formatFechaRangoCorto(from?: string, to?: string): string {
  if (!from) return "Elegir fecha…";
  const dFrom = isoToDate(from);
  if (!dFrom) return "Elegir fecha…";
  if (!to || to === from) return formatDiaMesAnio(dFrom);
  const dTo = isoToDate(to);
  if (!dTo) return formatDiaMesAnio(dFrom);
  const sameMonth =
    dFrom.getMonth() === dTo.getMonth() &&
    dFrom.getFullYear() === dTo.getFullYear();
  if (sameMonth) {
    return `${dFrom.getDate()} – ${dTo.getDate()} ${MES_CORTO[dTo.getMonth()]} ${dTo.getFullYear()}`;
  }
  if (dFrom.getFullYear() === dTo.getFullYear()) {
    return `${dFrom.getDate()} ${MES_CORTO[dFrom.getMonth()]} – ${dTo.getDate()} ${MES_CORTO[dTo.getMonth()]} ${dTo.getFullYear()}`;
  }
  return `${formatDiaMesAnio(dFrom)} – ${formatDiaMesAnio(dTo)}`;
}

type FechaDiaORangoInputProps = {
  from: string;
  to: string;
  bounds: MesActualBounds;
  invalid?: boolean;
  error?: string;
  required?: boolean;
  /** false = solo un día (modo edición) */
  allowRange?: boolean;
  /** Cuántos días se registrarán (ya filtrados por programa + tipo). */
  laborableCount?: number;
  holidayDates?: string[];
  holidayColor?: string | null;
  weekendColor?: string | null;
  weekdayColor?: string | null;
  onChange: (from: string, to: string) => void;
};

/**
 * Fecha en Mi Tiempo (alta): radio Un día | Intervalo de fechas.
 * Mismo calendario de un mes; el intervalo solo admite días de ese mes.
 */
export function FechaDiaORangoInput({
  from,
  to,
  bounds,
  invalid,
  error,
  required = true,
  allowRange = true,
  laborableCount,
  holidayDates,
  holidayColor,
  weekendColor,
  weekdayColor,
  onChange,
}: FechaDiaORangoInputProps) {
  const radioName = useId();
  const [modo, setModo] = useState<"dia" | "rango">("dia");
  const [open, setOpen] = useState(false);
  const esRango = allowRange && modo === "rango";

  const commit = (nextFrom?: string, nextTo?: string) => {
    if (!nextFrom && !nextTo) {
      onChange("", "");
      return;
    }
    const a = clampFechaMes(nextFrom || nextTo || bounds.defaultFecha, bounds);
    let b = clampFechaMes(nextTo || nextFrom || a, bounds);
    if (a.slice(0, 7) !== b.slice(0, 7)) b = a;
    onChange(a <= b ? a : b, a <= b ? b : a);
  };

  if (!allowRange) {
    return (
      <Field label="Fecha" required={required} error={error}>
        <DatePickerInput
          value={from}
          onChange={(iso) => onChange(iso, iso)}
          min={bounds.min}
          max={bounds.max}
          invalid={invalid}
        />
      </Field>
    );
  }

  const label = formatFechaRangoCorto(from || undefined, to || undefined);
  const countLabel =
    typeof laborableCount === "number" && laborableCount > 0
      ? laborableCount
      : from && to
        ? eachIsoDateInclusive(from, to).length
        : 0;

  const radios = (
    <div
      role="radiogroup"
      aria-label="Modo de fecha"
      className="flex shrink-0 items-center gap-3.5"
    >
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[#374151]">
        <input
          type="radio"
          name={radioName}
          checked={modo === "dia"}
          onChange={() => {
            setModo("dia");
            setOpen(false);
            const dia = from || bounds.defaultFecha;
            onChange(dia, dia);
          }}
          className="h-3.5 w-3.5 shrink-0 accent-navy"
        />
        {TIEMPO_UI_COPY.fechaUnDia}
      </label>
      <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-[#374151]">
        <input
          type="radio"
          name={radioName}
          checked={modo === "rango"}
          onChange={() => setModo("rango")}
          className="h-3.5 w-3.5 shrink-0 accent-navy"
        />
        {TIEMPO_UI_COPY.fechaRango}
      </label>
    </div>
  );

  return (
    <Field label="Fecha" required={required} error={error} trailing={radios}>
      {esRango ? (
        <Dropdown
          open={open}
          onOpenChange={setOpen}
          portal
          fitContent
          menuClassName="overflow-hidden border-border p-0 shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
          trigger={
            <button
              type="button"
              aria-label="Intervalo de fechas"
              onClick={() => setOpen((value) => !value)}
              className={`flex w-full cursor-pointer items-center justify-between gap-2 text-left ${dateInputClassWithError(invalid)}`}
            >
              <span
                className={`min-w-0 flex-1 truncate whitespace-nowrap ${
                  from ? "text-text" : "text-muted"
                }`}
              >
                {from ? label : "Elegir intervalo…"}
                {from && countLabel > 0 ? (
                  <span className="text-muted">
                    {" "}
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
            to={to && to !== from ? to : undefined}
            min={bounds.min}
            max={bounds.max}
            holidayDates={holidayDates}
            holidayColor={holidayColor}
            weekendColor={weekendColor}
            weekdayColor={weekdayColor}
            onChange={(nextFrom, nextTo) => commit(nextFrom, nextTo)}
            onRangeComplete={() => setOpen(false)}
          />
        </Dropdown>
      ) : (
        <DatePickerInput
          value={from}
          onChange={(iso) => onChange(iso, iso)}
          min={bounds.min}
          max={bounds.max}
          invalid={invalid}
          placeholder="Elegir fecha…"
        />
      )}
    </Field>
  );
}
