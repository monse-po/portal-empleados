"use client";

import { useState } from "react";
import { useToast } from "@/src/components/ui/Toast";
import { AnticiposDetalle } from "@/src/app/mis-anticipos/AnticiposDetalle";
import { AnticiposFormulario } from "@/src/app/mis-anticipos/AnticiposFormulario";
import { AnticiposLista } from "@/src/app/mis-anticipos/AnticiposLista";
import { CancelarAnticipoModal } from "@/src/app/mis-anticipos/AnticiposModals";
import {
  AnticiposProvider,
  useAnticipos,
} from "@/src/app/mis-anticipos/AnticiposContext";

type Vista = "lista" | "detalle" | "form";

function AnticiposViewInner() {
  const { getAnticipo, getExtra, lanzarAnticipo, cancelarAnticipo } =
    useAnticipos();
  const { toast } = useToast();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);
  const [cancelarNo, setCancelarNo] = useState<string | null>(null);

  const anticipoDetalle = detalleNo ? getAnticipo(detalleNo) : undefined;
  const extraDetalle = detalleNo ? getExtra(detalleNo) : undefined;

  const volverLista = () => {
    setVista("lista");
    setDetalleNo(null);
  };

  const handleCancelar = () => {
    if (!cancelarNo) return;
    cancelarAnticipo(cancelarNo);
    toast(
      `Solicitud ${cancelarNo} cancelada — queda registrada en IFS`,
      "danger",
    );
    setCancelarNo(null);
    volverLista();
  };

  if (vista === "form") {
    return (
      <AnticiposFormulario
        onVolver={volverLista}
        onLanzar={lanzarAnticipo}
        onLanzarOtro={(nombre) => {
          toast(
            `Solicitud registrada para ${nombre} — visible en tu lista`,
            "green",
          );
          volverLista();
        }}
      />
    );
  }

  if (vista === "detalle" && anticipoDetalle) {
    return (
      <>
        <AnticiposDetalle
          anticipo={anticipoDetalle}
          extra={extraDetalle}
          onVolver={volverLista}
          onCancelar={
            anticipoDetalle.estado === "Lanzado"
              ? () => setCancelarNo(anticipoDetalle.no)
              : undefined
          }
        />
        <CancelarAnticipoModal
          open={!!cancelarNo}
          codigo={cancelarNo || "—"}
          onClose={() => setCancelarNo(null)}
          onConfirm={handleCancelar}
        />
      </>
    );
  }

  return (
    <AnticiposLista
      onOpenDetalle={(no) => {
        setDetalleNo(no);
        setVista("detalle");
      }}
      onNuevaSolicitud={() => setVista("form")}
    />
  );
}

export function AnticiposView() {
  return (
    <AnticiposProvider>
      <AnticiposViewInner />
    </AnticiposProvider>
  );
}
