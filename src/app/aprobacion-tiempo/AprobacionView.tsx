"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { getHojasPendientesAprobacionAction } from "@/src/server/mi-tiempo-actions";
import { getIfsSessionStatusAction } from "@/src/server/mi-tiempo-catalog-actions";

type Vista = "lista" | "detalle";

export function AprobacionView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getHoja, aprobar, rechazar, anular, syncPendientesDesdeDb, hojas, retirarHojas } =
    useAprobacion();
  const { toast } = useToast();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);
  const [rechazarTargets, setRechazarTargets] = useState<string[]>([]);
  const [aprobarTargets, setAprobarTargets] = useState<string[]>([]);
  const [anularTargets, setAnularTargets] = useState<string[]>([]);
  const [aprobarComentario, setAprobarComentario] = useState("");
  const [pendientesLoaded, setPendientesLoaded] = useState(false);
  const [ifsConnected, setIfsConnected] = useState(false);
  const [ifsEmail, setIfsEmail] = useState<string | null>(null);
  const [fromIfs, setFromIfs] = useState(false);
  const [ifsWarning, setIfsWarning] = useState<string | null>(null);
  const deepLinkNo = searchParams.get("no");
  const deepLinkHandled = useRef<string | null>(null);

  const refrescarBandeja = async () => {
    const result = await getHojasPendientesAprobacionAction();
    setIfsWarning(result.warning ?? null);
    syncPendientesDesdeDb(result.hojas);
    setFromIfs(result.fromIfs);
    if (result.warning) toast(result.warning, "warn");
  };

  useEffect(() => {
    void getIfsSessionStatusAction().then((status) => {
      setIfsConnected(status.connected);
      setIfsEmail(status.email ?? null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getHojasPendientesAprobacionAction()
      .then((result) => {
        if (cancelled) return;
        setIfsWarning(result.warning ?? null);
        syncPendientesDesdeDb(result.hojas);
        setFromIfs(result.fromIfs);
        if (result.warning) {
          toast(result.warning, "warn");
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast("No se pudo cargar la bandeja de aprobación.", "danger");
        }
      })
      .finally(() => {
        if (!cancelled) setPendientesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [syncPendientesDesdeDb, toast]);

  useEffect(() => {
    if (!pendientesLoaded || !deepLinkNo || deepLinkHandled.current === deepLinkNo) {
      return;
    }
    if (!hojas[deepLinkNo]) return;
    deepLinkHandled.current = deepLinkNo;
    setDetalleNo(deepLinkNo);
    setVista("detalle");
  }, [deepLinkNo, hojas, pendientesLoaded]);

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
    deepLinkHandled.current = deepLinkNo ?? "dismissed";
    router.replace("/aprobacion-tiempo");
  };

  const solicitarAprobacion = (nos: string[]) => {
    if (!nos.length) {
      toast("Selecciona al menos un registro", "danger");
      return;
    }
    setAprobarTargets(nos);
    setAprobarComentario("");
  };

  const handleDecisionError = async (
    result: { error?: string; stale?: boolean },
    targets: string[],
    verb: "aprobar" | "rechazar",
  ) => {
    if (result.stale) {
      const ids = targets
        .map((no) => getHoja(no)?.registroId)
        .filter((id): id is string => !!id);
      if (ids.length) retirarHojas(ids);
      toast(
        "Ese registro ya no está pendiente en IFS (fue resuelto o eliminado). Actualizamos la bandeja.",
        "warn",
      );
      await refrescarBandeja();
      if (enDetalle) volverLista();
      return;
    }
    toast(result.error || `No se pudo ${verb} en IFS.`, "danger");
  };

  const confirmarRechazo = async (motivo: string) => {
    const targets = [...rechazarTargets];
    const result = await rechazar(targets, motivo);
    if (!result.ok) {
      await handleDecisionError(result, targets, "rechazar");
      return;
    }
    toast(toastRechazados(targets), "danger");
    setRechazarTargets([]);
    if (enDetalle) volverLista();
  };

  const confirmarAprobacion = async () => {
    const targets = [...aprobarTargets];
    const result = await aprobar(targets, aprobarComentario);
    if (!result.ok) {
      await handleDecisionError(result, targets, "aprobar");
      setAprobarTargets([]);
      setAprobarComentario("");
      return;
    }
    toast(
      result.sentToIfs
        ? `${toastAprobados(targets)} (IFS)`
        : toastAprobados(targets),
      "green",
    );
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

  if (!pendientesLoaded) {
    return (
      <div className="content-standard flex min-h-[240px] items-center justify-center">
        <p className="text-[13px] text-muted">Cargando datos…</p>
      </div>
    );
  }

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
          onRechazar={async (comentario) => {
            const result = await rechazar([hojaDetalle.no], comentario);
            if (!result.ok) {
              await handleDecisionError(result, [hojaDetalle.no], "rechazar");
              return;
            }
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
        ifsConnected={ifsConnected}
        fromIfs={fromIfs}
        ifsEmail={ifsEmail}
        ifsWarning={ifsWarning}
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
