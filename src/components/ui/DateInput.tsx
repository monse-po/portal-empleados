"use client";

import { useRef, type InputHTMLAttributes } from "react";

export const dateInputClass =
  "ds-date-input h-9 w-full cursor-pointer rounded-[5px] border border-border bg-white px-2.5 text-[13px] text-text transition-colors focus:border-navy focus:outline-none disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-muted";

export function dateInputClassWithError(invalid?: boolean) {
  return `${dateInputClass}${invalid ? " ds-date-input--error" : ""}`;
}

type DateInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> & {
  invalid?: boolean;
  className?: string;
};

export function DateInput({
  invalid,
  className = "",
  onClick,
  ...props
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input || input.disabled) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  return (
    <input
      ref={inputRef}
      type="date"
      className={`${dateInputClassWithError(invalid)} ${className}`.trim()}
      onClick={(event) => {
        openPicker();
        onClick?.(event);
      }}
      {...props}
    />
  );
}
