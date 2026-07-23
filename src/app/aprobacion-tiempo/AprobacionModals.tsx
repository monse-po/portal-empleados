"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Field } from "@/src/components/ui/Field";
import { Modal } from "@/src/components/ui/Modal";
import { ModalConfirmFooter } from "@/src/components/ui/ModalConfirmFooter";
import { useToast } from "@/src/components/ui/Toast";
import { useAsyncAction } from "@/src/lib/use-async-action";
import { BULK_COMENTARIO_APLICA_TODOS } from "@/src/lib/bulk-action-copy";

type RechazarModalProps = {
  open: boolean;
  resumen: string;
  onClose: () => void;
  onConfirm: (motivo: string) => void | Promise<void>;
};

export function RechazarModal({
  open,
  resumen,
  onClose,
  onConfirm,
}: RechazarModalProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const { loading, run } = useAsyncAction(onConfirm);

  const handleClose = () => {
    if (loading) return;
    setMotivo("");
    setError("");
    onClose();
  };

  const handleConfirm = () => {
    const trimmed = motivo.trim();
    if (!trimmed) {
      setError("Agrega un motivo de rechazo");
      toast("Escribe el motivo del rechazo", "danger");
      return;
    }
    void run(trimmed).then(() => {
      setMotivo("");
      setError("");
    });
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      busy={loading}
      title="Rechazar registro(s)"
      footer={
        <>
          <Button variant="tertiary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={loading}
            loadingLabel="Rechazando…"
          >
            Confirmar rechazo
          </Button>
        </>
      }
    >
      <p className="mb-3 text-[13px] text-[#374151]">
        El empleado recibirá una notificación con el motivo del rechazo.
      </p>
      <div className="mb-4 rounded-lg border border-border bg-[#f8fafc] px-4 py-3 text-[12.5px]">
        <span className="text-muted">Selección: </span>
        <span className="font-semibold text-navy">{resumen}</span>
      </div>
      <p className="mb-4 text-[13px] font-semibold text-[#374151]">
        {BULK_COMENTARIO_APLICA_TODOS}
      </p>
      <Field label="Motivo del rechazo" required error={error}>
        <textarea
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            if (error) setError("");
          }}
          disabled={loading}
          placeholder="Ej: Exceden las horas autorizadas para el proyecto..."
          className={`min-h-[88px] w-full resize-y rounded-lg border px-3 py-2 text-[13px] focus:border-navy focus:outline-none disabled:opacity-60 ${error ? "border-red bg-[#fff5f5]" : "border-[#c7d2e0]"}`}
        />
      </Field>
    </Modal>
  );
}

type AnularModalProps = {
  open: boolean;
  registroLabel: string;
  horas: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function AnularModal({
  open,
  registroLabel,
  horas,
  onClose,
  onConfirm,
}: AnularModalProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Anular registro(s)"
      footer={
        <ModalConfirmFooter
          onCancel={onClose}
          onConfirm={onConfirm}
          confirmLabel="Confirmar anulación"
          loadingLabel="Anulando…"
          onBusyChange={setBusy}
        />
      }
    >
      <p className="mb-4 text-[13px] text-[#374151]">
        Al anular, el registro queda sin efecto y regresa a la bandeja de
        pendientes.
      </p>
      <div className="space-y-2 rounded-lg border border-border bg-[#f8fafc] px-4 py-3 text-[12.5px]">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Registro</span>
          <span className="font-semibold text-navy">{registroLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Horas</span>
          <span className="font-bold text-navy">{horas}</span>
        </div>
      </div>
    </Modal>
  );
}

type AprobarModalProps = {
  open: boolean;
  registroLabel: string;
  empleado: string;
  horas: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function AprobarModal({
  open,
  registroLabel,
  empleado,
  horas,
  onClose,
  onConfirm,
}: AprobarModalProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Aprobar registro"
      footer={
        <ModalConfirmFooter
          onCancel={onClose}
          onConfirm={onConfirm}
          confirmLabel="Confirmar aprobación"
          confirmVariant="success"
          loadingLabel="Aprobando…"
          onBusyChange={setBusy}
        />
      }
    >
      <p className="mb-4 text-[13px] text-[#374151]">
        Al confirmar, las horas quedan aprobadas en IFS y se notifica al
        empleado. Esta acción no se puede deshacer.
      </p>
      <div className="space-y-2 rounded-lg border border-border bg-[#f8fafc] px-4 py-3 text-[12.5px]">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Registro</span>
          <span className="font-semibold text-navy">{registroLabel}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Empleado</span>
          <span className="font-medium">{empleado}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Horas</span>
          <span className="font-bold text-navy">{horas}</span>
        </div>
      </div>
    </Modal>
  );
}
