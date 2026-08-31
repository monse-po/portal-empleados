"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/src/components/ui/Toast";
import { AnticiposDetalle } from "@/src/app/mis-anticipos/AnticiposDetalle";
import { AnticiposFormulario } from "@/src/app/mis-anticipos/AnticiposFormulario";
import { AnticiposLista } from "@/src/app/mis-anticipos/AnticiposLista";
import { CancelarAnticipoModal } from "@/src/app/mis-anticipos/AnticiposModals";
import { useAnticipos } from "@/src/app/mis-anticipos/AnticiposContext";

import type { AnticipoTipo } from "@/src/lib/mis-anticipos-mock";

type Vista = "lista" | "detalle" | "form";

function AnticiposViewInner() {
  const {
    getAnticipo,
    getExtra,
    lanzarAnticipo,
    cancelarAnticipo,
    sessionIds,
    loaded,
  } = useAnticipos();
  const { toast } = useToast();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);
  const [cancelarNo, setCancelarNo] = useState<string | null>(null);
  const [formInicial, setFormInicial] = useState<{
    tipo?: AnticipoTipo;
    proyId?: string;
  }>();
  const queryOpened = useRef(false);

  useEffect(() => {
    if (queryOpened.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("nueva") === "1") {
      queryOpened.current = true;
      const tipo = params.get("tipo");
      const proyId = params.get("proy") || undefined;
      setFormInicial({
        tipo: tipo === "Viaje" || tipo === "Gasto" ? tipo : undefined,
        proyId,
      });
      setVista("form");
      return;
    }
    if (!loaded) return;
    const no = params.get("no");
    if (!no || !getAnticipo(no)) return;
    queryOpened.current = true;
    setDetalleNo(no);
    setVista("detalle");
  }, [loaded, getAnticipo]);

  const anticipoDetalle = detalleNo ? getAnticipo(detalleNo) : undefined;
  const extraDetalle = detalleNo ? getExtra(detalleNo) : undefined;

  const volverLista = () => {
    setVista("lista");
    setDetalleNo(null);
    setFormInicial(undefined);
  };

  const handleCancelar = async () => {
    if (!cancelarNo) return;
    const ok = await cancelarAnticipo(cancelarNo);
    if (!ok) {
      toast("No se pudo cancelar la solicitud", "danger");
      return;
    }
    toast(`Solicitud ${cancelarNo} cancelada — queda en el historial`, "danger");
    setCancelarNo(null);
    volverLista();
  };

  if (vista === "form") {
    return (
      <AnticiposFormulario
        onVolver={volverLista}
        onLanzar={lanzarAnticipo}
        inicial={formInicial}
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
          sessionIds={sessionIds}
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
  return <AnticiposViewInner />;
}
