import { Icon, type IconName } from "@/src/components/ui/Icon";

type LoadingIndicatorProps = {
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  /** `full` = icono + puntos (legacy); `icon` | `dots` para separarlos en el texto */
  mode?: "full" | "icon" | "dots";
  className?: string;
};

const sizeClasses = {
  sm: "loading-indicator--sm",
  md: "loading-indicator--md",
  lg: "loading-indicator--lg",
} as const;

const iconSizes = {
  sm: "xs",
  md: "sm",
  lg: "md",
} as const;

function LoadingDots({ size }: { size: LoadingIndicatorProps["size"] }) {
  return (
    <span className={`loading-indicator-dots ${sizeClasses[size ?? "sm"]}`}>
      <span className="loading-indicator-dot" />
      <span className="loading-indicator-dot" />
      <span className="loading-indicator-dot" />
    </span>
  );
}

export function LoadingIndicator({
  size = "sm",
  icon = "hourglass",
  mode = "full",
  className = "",
}: LoadingIndicatorProps) {
  if (mode === "dots") {
    return (
      <span
        className={`loading-indicator loading-indicator--dots-only ${sizeClasses[size]} ${className}`.trim()}
        aria-hidden="true"
      >
        <LoadingDots size={size} />
      </span>
    );
  }

  if (mode === "icon") {
    return (
      <span
        className={`loading-indicator loading-indicator--icon-only ${sizeClasses[size]} ${className}`.trim()}
        aria-hidden="true"
      >
        <span className="loading-indicator-icon">
          <Icon name={icon} size={iconSizes[size]} />
        </span>
      </span>
    );
  }

  return (
    <span
      className={`loading-indicator ${sizeClasses[size]} ${className}`.trim()}
      aria-hidden="true"
    >
      <span className="loading-indicator-icon">
        <Icon name={icon} size={iconSizes[size]} />
      </span>
      <LoadingDots size={size} />
    </span>
  );
}
