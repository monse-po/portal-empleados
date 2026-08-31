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

/** Etiqueta corta: un día → «12 ago»; rango → «12 – 16». */
export function formatFechaRangoCorto(from?: string, to?: string): string {
  if (!from) return "Elegir fecha…";
  const dFrom = isoToDate(from);
  if (!dFrom) return "Elegir fecha…";
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

type FechaPickPhase = "day" | "rangeEnd";

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

/** Espera antes de confirmar un solo día; también ventana para detectar doble clic. */
const SINGLE_CLICK_MS = 350;

/**
 * Fecha en Mi Tiempo (alta):
 * - 1 clic = un día (cierra el calendario).
 * - Doble clic = inicio de rango; el siguiente clic = fin del rango.
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
  const [pendingIso, setPendingIso] = useState<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickRef = useRef<{ iso: string; at: number } | null>(null);
  const matchers = useFechaMatchers(bounds.min, bounds.max);

  const clearPendingSingle = () => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    setPendingIso(null);
  };

  useEffect(() => () => clearPendingSingle(), []);

  const close = () => {
    clearPendingSingle();
    lastClickRef.current = null;
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

  const handleDayClick = (day: Date, _mods: unknown, event: MouseEvent) => {
    const iso = dateToIso(day);
    if (!iso) return;

    if (phase === "rangeEnd") {
      if (!from) return;
      clearPendingSingle();
      lastClickRef.current = null;
      commit(from, iso);
      close();
      return;
    }

    if (!allowRange) {
      clearPendingSingle();
      lastClickRef.current = null;
      commit(iso, iso);
      close();
      return;
    }

    const now = Date.now();
    const prev = lastClickRef.current;
    // detail>=2 (dblclick nativo) o dos clics rápidos en el mismo día.
    const isDouble =
      event.detail >= 2 ||
      Boolean(prev && prev.iso === iso && now - prev.at < SINGLE_CLICK_MS + 80);

    if (isDouble) {
      clearPendingSingle();
      lastClickRef.current = null;
      commit(iso, iso);
      setPhase("rangeEnd");
      return;
    }

    lastClickRef.current = { iso, at: now };
    clearPendingSingle();
    setPendingIso(iso);
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      setPendingIso(null);
      lastClickRef.current = null;
      commit(iso, iso);
      close();
    }, SINGLE_CLICK_MS);
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
    if (phase === "rangeEnd") return undefined;
    if (pendingIso) return isoToDate(pendingIso);
    if (hasRange) return undefined;
    return isoToDate(from);
  }, [phase, pendingIso, hasRange, from]);

  return (
    <Dropdown
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          clearPendingSingle();
          setPhase("day");
        }
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
              ) : allowRange ? (
                TIEMPO_UI_COPY.fechaUnClic
              ) : (
                "Un clic elige el día."
              )}
            </p>
            <div className="flex items-center justify-between gap-2">
              {phase === "rangeEnd" ? (
                <button
                  type="button"
                  className="ds-date-picker-clear"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    clearPendingSingle();
                    setPhase("day");
                  }}
                >
                  Cancelar
                </button>
              ) : (
                <button
                  type="button"
                  className="ds-date-picker-clear"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    clearPendingSingle();
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
            ...(hasRange && phase === "day"
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
