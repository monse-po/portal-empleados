"use client";

import { Icon } from "@/src/components/ui/Icon";

export function MiTiempoLoading() {
  return (
    <div className="view-wide flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
      <Icon name="clock" size="lg" className="animate-pulse text-navy" />
      <p className="text-[13px] font-medium text-[#374151]">
        Cargando registros de tiempo…
      </p>
      <p className="text-[12px] text-muted">Conectando con la base de datos</p>
    </div>
  );
}
