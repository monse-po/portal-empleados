import { LoadingIndicator } from "@/src/components/ui/LoadingIndicator";
import type { IconName } from "@/src/components/ui/Icon";

type LoadingNoticeProps = {
  label: string;
  hint?: string;
  icon?: IconName;
  variant?: "inline" | "banner" | "panel";
  className?: string;
};

const variantClasses = {
  inline: "loading-notice loading-notice--inline",
  banner: "loading-notice loading-notice--banner",
  panel: "loading-notice loading-notice--panel",
} as const;

const indicatorSize = {
  inline: "sm",
  banner: "md",
  panel: "lg",
} as const;

export function LoadingNotice({
  label,
  hint,
  icon = "hourglass",
  variant = "inline",
  className = "",
}: LoadingNoticeProps) {
  const size = indicatorSize[variant];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={hint ? `${label}. ${hint}` : label}
      className={`${variantClasses[variant]} ${className}`.trim()}
    >
      <LoadingIndicator size={size} icon={icon} mode="icon" />
      <div className={variant === "panel" ? "space-y-1" : undefined}>
        <span className="loading-notice-label inline-flex items-center gap-1.5">
          {label}
          <LoadingIndicator size={size} mode="dots" />
        </span>
        {hint ? (
          <p
            className={
              variant === "panel"
                ? "text-[12px] font-normal text-loading-violet-muted"
                : "sr-only"
            }
          >
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
