type SpinnerProps = {
  className?: string;
  size?: "xs" | "sm" | "md";
};

const sizeClasses = {
  xs: "h-3 w-3 border",
  sm: "h-3.5 w-3.5 border-[1.5px]",
  md: "h-4 w-4 border-2",
} as const;

export function Spinner({ className = "", size = "sm" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-hidden="true"
      className={`inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent ${sizeClasses[size]} ${className}`.trim()}
    />
  );
}
