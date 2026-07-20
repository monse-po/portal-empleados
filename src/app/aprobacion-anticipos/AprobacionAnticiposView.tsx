"use client";

import { useMemo, useState } from "react";
import { AprobacionAnticiposDetalle } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposDetalle";
import { AprobacionAnticiposLista } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposLista";
import {
  AprobarAnticipoModal,
  RechazarAnticipoModal,
  RechazarAnticiposLoteModal,
} from "@/src/app/aprobacion-anticipos/AprobacionAnticiposModals";
import { useAprobacionAnticipos } from "@/src/app/aprobacion-anticipos/AprobacionAnticiposContext";
import { useToast } from "@/src/components/ui/Toast";
import { formatMonto } from "@/src/lib/mis-anticipos-mock";

type Vista = "lista" | "detalle";

function toastAprobados(nos: string[]) {
  if (nos.length === 1) {
    return `Solicitud ${nos[0]} aprobada · IFS procesará el pago`;
  }
  return `${nos.length} solicitudes aprobadas · IFS procesará los pagos`;
}

function toastRechazados(nos: string[]) {
  if (nos.length === 1) {
    return `Solicitud ${nos[0]} rechazada · El empleado fue notificado`;
  }
  return `${nos.length} solicitudes rechazadas · Los empleados fueron notificados`;
}

export function AprobacionAnticiposView() {
  const { getSolicitud, aprobar, rechazar } = useAprobacionAnticipos();
  const { toast } = useToast();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);
  const [aprobarTargets, setAprobarTargets] = useState<string[]>([]);
  const [rechazarTargets, setRechazarTargets] = useState<string[]>([]);
  const [comentarioAprobar, setComentarioAprobar] = useState("");
  const [comentarioRechazarDetalle, setComentarioRechazarDetalle] = useState("");

  const solicitud = detalleNo ? getSolicitud(detalleNo) : undefined;
  const enDetalle = vista === "detalle" && !!solicitud;

  const aprobarModalData = useMemo(() => {
    if (!aprobarTargets.length) {
      return { codigo: "—", empleado: "—", monto: "—" };
    }
    if (aprobarTargets.length === 1) {
      const s = getSolicitud(aprobarTargets[0]);
      return {
        codigo: aprobarTargets[0],
        empleado: s?.nombre || "—",
        monto: s ? formatMonto(s.monto, s.divisa) : "—",
      };
    }
    return {
      codigo: `${aprobarTargets.length} solicitudes`,
      empleado: "—",
      monto: "Varios montos",
    };
  }, [aprobarTargets, getSolicitud]);

  const rechazarResumen = useMemo(() => {
    if (!rechazarTargets.length) return "";
    if (rechazarTargets.length === 1) {
      const s = getSolicitud(rechazarTargets[0]);
      return `${s?.nombre || rechazarTargets[0]} · ${s?.fecha || ""}`;
    }
    return `${rechazarTargets.length} solicitudes seleccionadas`;
  }, [rechazarTargets, getSolicitud]);

  const rechazarDetalleModal = useMemo(() => {
    if (!solicitud) {
      return { codigo: "—", empleado: "—", motivo: "" };
    }
    return {
      codigo: solicitud.no,
      empleado: solicitud.nombre,
      motivo: comentarioRechazarDetalle,
    };
  }, [solicitud, comentarioRechazarDetalle]);

  const volverLista = () => {
    setVista("lista");
    setDetalleNo(null);
    setAprobarTargets([]);
    setRechazarTargets([]);
    setComentarioAprobar("");
    setComentarioRechazarDetalle("");
  };

  const solicitarAprobacion = (nos: string[]) => {
    if (!nos.length) {
      toast("Selecciona al menos una solicitud", "danger");
      return;
    }
    setAprobarTargets(nos);
  };

  const confirmarAprobacion = () => {
    aprobar(aprobarTargets, comentarioAprobar);
    toast(toastAprobados(aprobarTargets), "green");
    setAprobarTargets([]);
    setComentarioAprobar("");
    if (enDetalle) volverLista();
  };

  const confirmarRechazoLote = (motivo: string) => {
    rechazar(rechazarTargets, motivo);
    toast(toastRechazados(rechazarTargets), "danger");
    setRechazarTargets([]);
    if (enDetalle) volverLista();
  };

  const confirmarRechazoDetalle = () => {
    if (!solicitud) return;
    rechazar([solicitud.no], comentarioRechazarDetalle);
    toast(toastRechazados([solicitud.no]), "danger");
    volverLista();
  };

  if (enDetalle && solicitud) {
    return (
      <>
        <AprobacionAnticiposDetalle
          solicitud={solicitud}
          onVolver={volverLista}
          onAprobar={(comentario) => {
            setComentarioAprobar(comentario || "");
            solicitarAprobacion([solicitud.no]);
          }}
          onRechazar={(comentario) => {
            setComentarioRechazarDetalle(comentario);
            setRechazarTargets([solicitud.no]);
          }}
        />
        <AprobarAnticipoModal
          open={aprobarTargets.length > 0}
          codigo={aprobarModalData.codigo}
          empleado={aprobarModalData.empleado}
          monto={aprobarModalData.monto}
          onClose={() => {
            setAprobarTargets([]);
            setComentarioAprobar("");
          }}
          onConfirm={confirmarAprobacion}
        />
        <RechazarAnticipoModal
          open={rechazarTargets.length > 0}
          codigo={rechazarDetalleModal.codigo}
          empleado={rechazarDetalleModal.empleado}
          motivo={rechazarDetalleModal.motivo}
          onClose={() => {
            setRechazarTargets([]);
            setComentarioRechazarDetalle("");
          }}
          onConfirm={confirmarRechazoDetalle}
        />
      </>
    );
  }

  return (
    <>
      <AprobacionAnticiposLista
        onOpenDetalle={(no) => {
          setDetalleNo(no);
          setVista("detalle");
        }}
        onAprobar={solicitarAprobacion}
        onRechazar={setRechazarTargets}
      />
      <AprobarAnticipoModal
        open={aprobarTargets.length > 0}
        codigo={aprobarModalData.codigo}
        empleado={aprobarModalData.empleado}
        monto={aprobarModalData.monto}
        onClose={() => {
          setAprobarTargets([]);
          setComentarioAprobar("");
        }}
        onConfirm={confirmarAprobacion}
      />
      <RechazarAnticiposLoteModal
        open={rechazarTargets.length > 0}
        resumen={rechazarResumen}
        onClose={() => setRechazarTargets([])}
        onConfirm={confirmarRechazoLote}
      />
    </>
  );
}
