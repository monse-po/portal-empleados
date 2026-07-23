"use client";

import type { ChangeEvent } from "react";
import { DateInput, dateInputClass, dateInputClassWithError } from "@/src/components/ui/DateInput";
import {
  clampFechaMes,
  type MesActualBounds,
} from "@/src/lib/mi-tiempo-mock";

/** @deprecated Usar `dateInputClass` desde `DateInput`. */
export const inputClass = dateInputClass;

/** @deprecated Usar `dateInputClassWithError` desde `DateInput`. */
export function inputClassWithError(invalid?: boolean) {
  return dateInputClassWithError(invalid);
}

type MonthDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  bounds: MesActualBounds;
  invalid?: boolean;
  id?: string;
  name?: string;
};

export function MonthDateInput({
  value,
  onChange,
  bounds,
  invalid,
  id,
  name,
}: MonthDateInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    if (!next) return;
    onChange(clampFechaMes(next, bounds));
  };

  return (
    <DateInput
      id={id}
      name={name}
      value={value}
      min={bounds.min}
      max={bounds.max}
      invalid={invalid}
      onChange={handleChange}
    />
  );
}
