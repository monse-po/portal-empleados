"use client";

import { useState } from "react";
import { AprobacionLegalizacionesDetalle } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesDetalle";
import { AprobacionLegalizacionesLista } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesLista";
import { useAprobacionLegalizaciones } from "@/src/app/aprobacion-legalizaciones/AprobacionLegalizacionesContext";

type Vista = "lista" | "detalle";

function AprobacionLegalizacionesViewInner() {
  const { getSolicitud, aprobar, rechazar } = useAprobacionLegalizaciones();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);

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
      onAprobar={(nos) => aprobar(nos)}
      onRechazar={(nos) => rechazar(nos, "Rechazado")}
    />
  );
}

export function AprobacionLegalizacionesView() {
  return <AprobacionLegalizacionesViewInner />;
}
