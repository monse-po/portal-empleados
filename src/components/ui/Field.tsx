import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  /** Control a la derecha del label (radios, enlace…). */
  trailing?: ReactNode;
};

export function Field({
  label,
  required,
  error,
  children,
  htmlFor,
  trailing,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-[18px] items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[12px] font-semibold text-[#374151]">
          {label}
          {required && <span className="ml-0.5 text-red">*</span>}
        </label>
        {trailing}
      </div>
      {children}
      {error && (
        <span className="text-[11px] font-medium text-red">{error}</span>
      )}
    </div>
  );
}
