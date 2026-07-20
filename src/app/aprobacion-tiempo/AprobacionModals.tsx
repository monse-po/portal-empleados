"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Field } from "@/src/components/ui/Field";
import { Modal } from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/Toast";

type RechazarModalProps = {
  open: boolean;
  resumen: string;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
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

  const handleClose = () => {
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
    onConfirm(trimmed);
    setMotivo("");
    setError("");
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Rechazar registro(s)"
      footer={
        <>
          <Button variant="tertiary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Confirmar rechazo
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[13px] text-[#374151]">
        El empleado recibirá una notificación con el motivo del rechazo.
      </p>
      <div className="mb-4 rounded-lg border border-border bg-[#f8fafc] px-4 py-3 text-[12.5px]">
        <span className="text-muted">Selección: </span>
        <span className="font-semibold text-navy">{resumen}</span>
      </div>
      <Field label="Motivo del rechazo" required error={error}>
        <textarea
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            if (error) setError("");
          }}
          placeholder="Ej: Exceden las horas autorizadas para el proyecto..."
          className={`min-h-[88px] w-full resize-y rounded-lg border px-3 py-2 text-[13px] focus:border-navy focus:outline-none ${error ? "border-red bg-[#fff5f5]" : "border-[#c7d2e0]"}`}
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
  onConfirm: () => void;
};

export function AnularModal({
  open,
  registroLabel,
  horas,
  onClose,
  onConfirm,
}: AnularModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Anular registro(s)"
      footer={
        <>
          <Button variant="tertiary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Confirmar anulación
          </Button>
        </>
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
  onConfirm: () => void;
};

export function AprobarModal({
  open,
  registroLabel,
  empleado,
  horas,
  onClose,
  onConfirm,
}: AprobarModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aprobar registro"
      footer={
        <>
          <Button variant="tertiary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="success" onClick={onConfirm}>
            Confirmar aprobación
          </Button>
        </>
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
