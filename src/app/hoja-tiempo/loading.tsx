import { RouteLoading } from "@/src/components/layout/RouteLoading";
import { LOADING_COPY } from "@/src/lib/copy/loading";

export default function HojaTiempoLoading() {
  return (
    <RouteLoading
      icon={LOADING_COPY.timeRecords.icon}
      label={LOADING_COPY.timeRecords.label}
    />
  );
}
