"use client";

import { useState } from "react";
import { AprobacionLegalizacionesDetalle } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesDetalle";
import { AprobacionLegalizacionesLista } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesLista";
import { useAprobacionLegalizaciones } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesContext";
import { useAsyncAction } from "@/src/lib/use-async-action";

type Vista = "lista" | "detalle";

function AprobacionLegalizacionesViewInner() {
  const { getSolicitud, aprobar, rechazar } = useAprobacionLegalizaciones();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);
  const { loading: aprobando, run: runAprobar } = useAsyncAction(
    async (nos: string[]) => {
      await Promise.resolve(aprobar(nos));
    },
  );
  const { loading: rechazando, run: runRechazar } = useAsyncAction(
    async (nos: string[]) => {
      await Promise.resolve(rechazar(nos, "Rechazado"));
    },
  );

  const volverLista = () => {
    setVista("lista");
    setDetalleNo(null);
  };

  if (vista === "detalle" && detalleNo) {
    const solicitud = getSolicitud(detalleNo);
    if (solicitud) {
      return (
        <AprobacionLegalizacionesDetalle
          solicitud={solicitud}
          onVolver={volverLista}
        />
      );
    }
  }

  return (
    <AprobacionLegalizacionesLista
      onOpenDetalle={(no) => {
        setDetalleNo(no);
        setVista("detalle");
      }}
      onAprobar={(nos) => void runAprobar(nos)}
      onRechazar={(nos) => void runRechazar(nos)}
      loadingAprobar={aprobando}
      loadingRechazar={rechazando}
    />
  );
}

export function AprobacionLegalizacionesView() {
  return <AprobacionLegalizacionesViewInner />;
}
