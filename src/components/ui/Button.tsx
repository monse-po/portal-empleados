import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "@/src/components/ui/Spinner";

const variants = {
  primary:
    "bg-navy text-white hover:bg-navy-mid active:bg-navy-mid border-none",
  success:
    "bg-green text-white hover:bg-green-dark active:bg-green-dark border-none",
  danger:
    "bg-[#fde8e8] text-[#9b1c1c] hover:bg-[#fbd5d5] active:bg-[#fbd5d5] border-none",
  secondary:
    "bg-[#eef3f9] text-navy border border-[#c7d9ed] hover:bg-[#dbeafe] hover:border-[#bfdbfe] active:bg-[#dbeafe]",
  tertiary:
    "bg-white text-[#6b7280] border-[1.5px] border-[#e5e9f0] hover:border-[#d1d5db] hover:bg-[#f3f4f6] hover:text-[#374151] active:bg-[#f3f4f6]",
  /** @deprecated Usar `tertiary` */
  ghost:
    "bg-white text-[#6b7280] border-[1.5px] border-[#e5e9f0] hover:border-[#d1d5db] hover:bg-[#f3f4f6] hover:text-[#374151] active:bg-[#f3f4f6]",
} as const;

type ButtonVariant = keyof typeof variants;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
  loading?: boolean;
  loadingLabel?: ReactNode;
};

export function Button({
  variant = "primary",
  type = "button",
  className = "",
  children,
  loading = false,
  loadingLabel,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`inline-flex items-center gap-1.5 rounded-[7px] px-4 py-[9px] text-xs font-semibold whitespace-nowrap transition-all duration-150 font-sans cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 max-md:min-h-11 max-md:justify-center max-md:py-2.5 max-md:text-[13px] max-md:touch-manipulation max-md:select-none ${variants[variant]} ${className}`}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size="xs" />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
