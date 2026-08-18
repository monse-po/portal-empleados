"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    return `Solicitud ${nos[0]} aprobada y pagada · Historial del empleado`;
  }
  return `${nos.length} solicitudes aprobadas y pagadas`;
}

function toastRechazados(nos: string[]) {
  if (nos.length === 1) {
    return `Solicitud ${nos[0]} rechazada · El empleado fue notificado`;
  }
  return `${nos.length} solicitudes rechazadas · Los empleados fueron notificados`;
}

export function AprobacionAnticiposView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getSolicitud, aprobar, rechazar, solicitudes } =
    useAprobacionAnticipos();
  const { toast } = useToast();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);
  const [aprobarTargets, setAprobarTargets] = useState<string[]>([]);
  const [rechazarTargets, setRechazarTargets] = useState<string[]>([]);
  const [comentarioAprobar, setComentarioAprobar] = useState("");
  const [comentarioRechazarDetalle, setComentarioRechazarDetalle] = useState("");
  const deepLinkNo = searchParams.get("no");
  const deepLinkHandled = useRef<string | null>(null);

  useEffect(() => {
    if (!deepLinkNo || deepLinkHandled.current === deepLinkNo) return;
    if (!solicitudes[deepLinkNo]) return;
    deepLinkHandled.current = deepLinkNo;
    setDetalleNo(deepLinkNo);
    setVista("detalle");
  }, [deepLinkNo, solicitudes]);

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
    deepLinkHandled.current = deepLinkNo ?? "dismissed";
    router.replace("/aprobacion-anticipos");
  };

  const solicitarAprobacion = (nos: string[]) => {
    if (!nos.length) {
      toast("Selecciona al menos una solicitud", "danger");
      return;
    }
    setAprobarTargets(nos);
  };

  const confirmarAprobacion = async () => {
    const nos = [...aprobarTargets];
    const result = await aprobar(nos, comentarioAprobar);
    if (!result.ok) {
      toast(result.error || "No se pudo aprobar en IFS", "danger");
      return;
    }
    toast(toastAprobados(nos), "green");
    setAprobarTargets([]);
    setComentarioAprobar("");
    if (enDetalle) volverLista();
  };

  const confirmarRechazoLote = async (motivo: string) => {
    const nos = [...rechazarTargets];
    const result = await rechazar(nos, motivo);
    if (!result.ok) {
      toast(result.error || "No se pudo rechazar en IFS", "danger");
      return;
    }
    toast(toastRechazados(nos), "danger");
    setRechazarTargets([]);
    if (enDetalle) volverLista();
  };

  const confirmarRechazoDetalle = async () => {
    if (!solicitud) return;
    const result = await rechazar([solicitud.no], comentarioRechazarDetalle);
    if (!result.ok) {
      toast(result.error || "No se pudo rechazar en IFS", "danger");
      return;
    }
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
