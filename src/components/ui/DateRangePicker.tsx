"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
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
import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";

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
          className={`flex min-h-[38px] w-full cursor-pointer items-center justify-between gap-2 text-left ${dateInputClassWithError(invalid)}`}
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
  /** false = solo un día (modo edición) */
  allowRange?: boolean;
  /** Cuántos días se registrarán (ya filtrados por programa + tipo). */
  laborableCount?: number;
  onChange: (from: string, to: string) => void;
};

type FechaPickPhase = "day" | "rangeEnd" | "preview";

function useFechaMatchers(min?: string, max?: string) {
  return useMemo(() => {
    const rules: Matcher[] = [];
    const minDate = isoToDate(min);
    const maxDate = isoToDate(max);
    if (minDate) rules.push({ before: minDate });
    if (maxDate) rules.push({ after: maxDate });

    const festivo: Matcher = (date: Date) => {
      const iso = dateToIso(date);
      return Boolean(iso && FESTIVOS_2026.includes(iso));
    };
    const finSemana: Matcher = (date: Date) => {
      const day = date.getDay();
      return day === 0 || day === 6;
    };
    return {
      disabled: rules.length ? rules : undefined,
      festivo,
      finSemana,
    };
  }, [min, max]);
}

/** Tiempo para ver el rango resaltado antes de cerrar. */
const RANGE_PREVIEW_MS = 750;

/**
 * Fecha en Mi Tiempo (alta):
 * - 1er clic = primer día (el calendario se queda abierto).
 * - 2º clic = último día; se ve el rango y luego cierra.
 * - Listo / clic fuera = un solo día.
 * Edición (`allowRange=false`): siempre un día.
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
  const [phase, setPhase] = useState<FechaPickPhase>("day");
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchers = useFechaMatchers(bounds.min, bounds.max);

  const clearPreview = () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  useEffect(() => () => clearPreview(), []);

  const close = () => {
    clearPreview();
    setOpen(false);
    setPhase("day");
  };

  const commit = (nextFrom?: string, nextTo?: string) => {
    if (!nextFrom && !nextTo) return;
    const a = clampFechaMes(nextFrom || nextTo || bounds.defaultFecha, bounds);
    const b = clampFechaMes(nextTo || nextFrom || a, bounds);
    const desde = a <= b ? a : b;
    const hasta = allowRange ? (a <= b ? b : a) : desde;
    onChange(desde, hasta);
  };

  const finishWithPreview = (nextFrom: string, nextTo: string) => {
    commit(nextFrom, nextTo);
    if (nextFrom !== nextTo) {
      setPhase("preview");
      clearPreview();
      previewTimerRef.current = setTimeout(() => {
        previewTimerRef.current = null;
        close();
      }, RANGE_PREVIEW_MS);
      return;
    }
    close();
  };

  const handleDayClick = (day: Date, _mods: unknown, event: MouseEvent) => {
    const iso = dateToIso(day);
    if (!iso) return;
    event.preventDefault();
    event.stopPropagation();

    if (!allowRange) {
      commit(iso, iso);
      close();
      return;
    }

    if (phase === "preview") return;

    if (phase === "rangeEnd") {
      if (!from) return;
      finishWithPreview(from, iso);
      return;
    }

    commit(iso, iso);
    setPhase("rangeEnd");
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

  const defaultMonth = useMemo(
    () =>
      isoToDate(phase === "rangeEnd" ? from : from || to) ??
      isoToDate(bounds.min) ??
      new Date(),
    [phase, from, to, bounds.min],
  );

  const inicioMatcher = useMemo<Matcher | undefined>(() => {
    if (phase !== "rangeEnd" || !from) return undefined;
    return (date: Date) => dateToIso(date) === from;
  }, [phase, from]);

  const selectedDay = useMemo(() => {
    if (phase === "rangeEnd" || phase === "preview") return undefined;
    if (hasRange) return undefined;
    return isoToDate(from);
  }, [phase, hasRange, from]);

  return (
    <Dropdown
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          clearPreview();
          setPhase("day");
          setOpen(false);
          return;
        }
        setOpen(true);
      }}
      portal
      fitContent
      menuClassName="w-[252px] overflow-hidden border-border p-0 shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
      trigger={
        <button
          type="button"
          aria-label="Fecha"
          onClick={() => setOpen((value) => !value)}
          className={`flex min-h-[38px] w-full cursor-pointer items-center justify-between gap-2 text-left ${dateInputClassWithError(invalid)}`}
        >
          <span
            className={`min-w-0 flex-1 truncate whitespace-nowrap ${
              from ? "text-text" : "text-muted"
            }`}
          >
            {from ? label : "Elegir fecha…"}
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
      <DatePickerShell
        footer={
          <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2">
            <p className="text-[11px] leading-snug text-muted">
              {phase === "rangeEnd" ? (
                <>
                  {TIEMPO_UI_COPY.fechaHintRangoFin}
                  {from ? (
                    <>
                      {" "}
                      · inicio{" "}
                      <strong className="font-semibold text-navy">
                        {formatFechaRangoCorto(from, from)}
                      </strong>
                    </>
                  ) : null}
                </>
              ) : phase === "preview" ? (
                <>
                  Rango:{" "}
                  <strong className="font-semibold text-navy">{label}</strong>
                </>
              ) : allowRange ? (
                TIEMPO_UI_COPY.fechaUnClic
              ) : (
                "Un clic elige el día."
              )}
            </p>
            <div className="flex items-center justify-between gap-2">
              {phase === "rangeEnd" ? (
                <>
                  <button
                    type="button"
                    className="ds-date-picker-clear"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setPhase("day");
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-navy hover:underline"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (from) finishWithPreview(from, from);
                    }}
                  >
                    Listo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ds-date-picker-clear"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    clearPreview();
                    onChange("", "");
                    setPhase("day");
                  }}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        }
      >
        <DayPicker
          className={DATE_PICKER_ROOT_CLASS}
          mode="single"
          locale={es}
          selected={selectedDay}
          onSelect={() => {
            /* La selección la maneja onDayClick (clic vs doble clic). */
          }}
          onDayClick={handleDayClick}
          defaultMonth={defaultMonth}
          startMonth={isoToDate(bounds.min)}
          endMonth={isoToDate(bounds.max)}
          disabled={matchers.disabled}
          modifiers={{
            festivo: matchers.festivo,
            finSemana: matchers.finSemana,
            ...(inicioMatcher ? { inicioRango: inicioMatcher } : {}),
            ...(hasRange && phase !== "rangeEnd"
              ? {
                  rangoStart: (date: Date) => dateToIso(date) === from,
                  rangoEnd: (date: Date) => dateToIso(date) === to,
                  rango: (date: Date) => {
                    const iso = dateToIso(date);
                    return Boolean(iso && from && to && iso > from && iso < to);
                  },
                }
              : {}),
          }}
          modifiersClassNames={{
            festivo: "ds-day-festivo",
            finSemana: "ds-day-finsemana",
            inicioRango: "rdp-range_start",
            rangoStart: "rdp-range_start",
            rangoEnd: "rdp-range_end",
            rango: "rdp-range_middle",
          }}
          numberOfMonths={1}
          showOutsideDays={false}
          captionLayout="label"
          navLayout="around"
        />
      </DatePickerShell>
    </Dropdown>
  );
}
