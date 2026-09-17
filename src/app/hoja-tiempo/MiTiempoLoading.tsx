"use client";

import { RouteLoading } from "@/src/components/layout/RouteLoading";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
import { LOADING_COPY } from "@/src/lib/copy/loading";

export function MiTiempoLoading() {
  const { ifsConnected } = useMiTiempo();

  return (
    <RouteLoading
      icon={LOADING_COPY.timeRecords.icon}
      label={
        ifsConnected
          ? LOADING_COPY.timeRecordsIfs.label
          : LOADING_COPY.timeRecords.label
      }
    />
  );
}
