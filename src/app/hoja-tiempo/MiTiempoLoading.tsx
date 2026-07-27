"use client";

import { useEffect, useState } from "react";
import { LoadingNotice } from "@/src/components/ui/LoadingNotice";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
import { LOADING_COPY } from "@/src/lib/copy/loading";
import { registrosLoadingHint } from "@/src/lib/ifs/tiempo-timesheet";
import { getIfsSessionStatusAction } from "@/src/server/mi-tiempo-catalog-actions";

export function MiTiempoLoading() {
  const { ifsConnected } = useMiTiempo();
  const [hintFromIfs, setHintFromIfs] = useState(ifsConnected);

  useEffect(() => {
    if (ifsConnected) {
      setHintFromIfs(true);
      return;
    }
    void getIfsSessionStatusAction().then((status) => {
      setHintFromIfs(status.connected);
    });
  }, [ifsConnected]);

  return (
    <div className="view-wide">
      <LoadingNotice
        variant="panel"
        icon={LOADING_COPY.timeRecords.icon}
        label={LOADING_COPY.timeRecords.label}
        hint={registrosLoadingHint(hintFromIfs)}
        className="min-h-[320px]"
      />
    </div>
  );
}
