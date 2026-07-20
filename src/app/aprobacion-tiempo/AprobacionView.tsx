"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/src/components/ui/Toast";
import { useAprobacion } from "@/src/app/aprobacion-tiempo/AprobacionContext";
import { AprobacionDetalle, horasLabel } from "@/src/app/aprobacion-tiempo/AprobacionDetalle";
import { AprobacionLista } from "@/src/app/aprobacion-tiempo/AprobacionLista";
import {
  AnularModal,
  AprobarModal,
  RechazarModal,
} from "@/src/app/aprobacion-tiempo/AprobacionModals";
import { toastAprobados, toastAnulados, toastRechazados } from "@/src/lib/tiempo-bridge";

type Vista = "lista" | "detalle";

export function AprobacionView() {
  const { getHoja, aprobar, rechazar, anular } = useAprobacion();
  const { toast } = useToast();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);
  const [rechazarTargets, setRechazarTargets] = useState<string[]>([]);
  const [aprobarTargets, setAprobarTargets] = useState<string[]>([]);
  const [anularTargets, setAnularTargets] = useState<string[]>([]);
  const [aprobarComentario, setAprobarComentario] = useState("");

  const hojaDetalle = detalleNo ? getHoja(detalleNo) : undefined;
  const enDetalle = vista === "detalle" && !!hojaDetalle;

  const rechazarResumen = useMemo(() => {
    if (!rechazarTargets.length) return "";
    if (rechazarTargets.length === 1) {
      const h = getHoja(rechazarTargets[0]);
      return `${h?.solicitante || h?.nombre || rechazarTargets[0]} · ${h?.fecha || ""}`;
    }
    return `${rechazarTargets.length} registros seleccionados`;
  }, [rechazarTargets, getHoja]);

  const aprobarModalData = useMemo(() => {
    if (!aprobarTargets.length) {
      return { registroLabel: "—", empleado: "—", horas: "—" };
    }
    const h = getHoja(aprobarTargets[0]);
    return {
      registroLabel:
        aprobarTargets.length === 1
          ? aprobarTargets[0]
          : `${aprobarTargets.length} registros`,
      empleado: aprobarTargets.length === 1 ? h?.nombre || "—" : "—",
      horas: horasLabel(aprobarTargets, getHoja),
    };
  }, [aprobarTargets, getHoja]);

  const anularModalData = useMemo(() => {
    if (!anularTargets.length) {
      return { registroLabel: "—", horas: "—" };
    }
    return {
      registroLabel:
        anularTargets.length === 1
          ? anularTargets[0]
          : `${anularTargets.length} registros`,
      horas: horasLabel(anularTargets, getHoja),
    };
  }, [anularTargets, getHoja]);

  const openDetalle = (no: string) => {
    setDetalleNo(no);
    setVista("detalle");
  };

  const volverLista = () => {
    setVista("lista");
    setDetalleNo(null);
  };

  const solicitarAprobacion = (nos: string[]) => {
    if (!nos.length) {
      toast("Selecciona al menos un registro", "danger");
      return;
    }
    setAprobarTargets(nos);
    setAprobarComentario("");
  };

  const confirmarRechazo = (motivo: string) => {
    rechazar(rechazarTargets, motivo);
    toast(toastRechazados(rechazarTargets), "danger");
    setRechazarTargets([]);
    if (enDetalle) volverLista();
  };

  const confirmarAprobacion = () => {
    aprobar(aprobarTargets, aprobarComentario);
    toast(toastAprobados(aprobarTargets), "green");
    setAprobarTargets([]);
    setAprobarComentario("");
    if (enDetalle) volverLista();
  };

  const confirmarAnulacion = () => {
    anular(anularTargets);
    toast(toastAnulados(anularTargets), "green");
    setAnularTargets([]);
    if (enDetalle) volverLista();
  };

  if (enDetalle && hojaDetalle) {
    return (
      <>
        <AprobacionDetalle
          hoja={hojaDetalle}
          onVolver={volverLista}
          onAprobar={(comentario) => {
            setAprobarTargets([hojaDetalle.no]);
            setAprobarComentario(comentario || "");
          }}
          onRechazar={(comentario) => {
            rechazar([hojaDetalle.no], comentario);
            toast(toastRechazados([hojaDetalle.no]), "danger");
            volverLista();
          }}
          onAnular={() => setAnularTargets([hojaDetalle.no])}
        />
        <AprobarModal
          open={aprobarTargets.length > 0}
          registroLabel={aprobarModalData.registroLabel}
          empleado={aprobarModalData.empleado}
          horas={aprobarModalData.horas}
          onClose={() => {
            setAprobarTargets([]);
            setAprobarComentario("");
          }}
          onConfirm={confirmarAprobacion}
        />
        <AnularModal
          open={anularTargets.length > 0}
          registroLabel={anularModalData.registroLabel}
          horas={anularModalData.horas}
          onClose={() => setAnularTargets([])}
          onConfirm={confirmarAnulacion}
        />
      </>
    );
  }

  return (
    <>
      <AprobacionLista
        onOpenDetalle={openDetalle}
        onRechazar={setRechazarTargets}
        onAprobar={solicitarAprobacion}
      />
      <RechazarModal
        open={rechazarTargets.length > 0}
        resumen={rechazarResumen}
        onClose={() => setRechazarTargets([])}
        onConfirm={confirmarRechazo}
      />
      <AprobarModal
        open={aprobarTargets.length > 0}
        registroLabel={aprobarModalData.registroLabel}
        empleado={aprobarModalData.empleado}
        horas={aprobarModalData.horas}
        onClose={() => {
          setAprobarTargets([]);
          setAprobarComentario("");
        }}
        onConfirm={confirmarAprobacion}
      />
    </>
  );
}
