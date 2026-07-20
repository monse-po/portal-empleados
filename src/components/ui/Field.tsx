import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
};

export function Field({
  label,
  required,
  error,
  children,
  htmlFor,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[12px] font-semibold text-[#374151]">
        {label}
        {required && <span className="ml-0.5 text-red">*</span>}
      </label>
      {children}
      {error && (
        <span className="text-[11px] font-medium text-red">{error}</span>
      )}
    </div>
  );
}
