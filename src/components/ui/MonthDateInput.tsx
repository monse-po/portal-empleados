"use client";

import { useRef, type ChangeEvent } from "react";
import {
  clampFechaMes,
  type MesActualBounds,
} from "@/src/lib/mi-tiempo-mock";

export const inputClass =
  "h-9 w-full rounded-lg border border-[#c7d2e0] bg-white px-3 text-[13px] text-[#1a1a2e] transition-colors focus:border-navy focus:outline-none disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-muted";

export function inputClassWithError(invalid?: boolean) {
  return `${inputClass}${invalid ? " border-red bg-[#fff5f5] shadow-[0_0_0_1px_#fca5a5]" : ""}`;
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
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    if (!next) return;
    onChange(clampFechaMes(next, bounds));
  };

  return (
    <input
      ref={inputRef}
      id={id}
      name={name}
      type="date"
      value={value}
      min={bounds.min}
      max={bounds.max}
      onChange={handleChange}
      onClick={openPicker}
      className={`${inputClassWithError(invalid)} cursor-pointer`}
    />
  );
}
