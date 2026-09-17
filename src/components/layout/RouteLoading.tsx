import { LoadingNotice } from "@/src/components/ui/LoadingNotice";
import { LOADING_COPY } from "@/src/lib/copy/loading";
import type { IconName } from "@/src/components/ui/Icon";

type RouteLoadingProps = {
  icon?: IconName;
  label?: string;
};

/** Loading del área de contenido: animación violeta al centro, sin panel. */
export function RouteLoading({
  icon = LOADING_COPY.generic.icon,
  label = LOADING_COPY.generic.label,
}: RouteLoadingProps) {
  return (
    <div className="view-wide flex min-h-[320px] items-center justify-center">
      <LoadingNotice variant="inline" icon={icon} label={label} />
    </div>
  );
}

export default RouteLoading;
