"use client";

import { useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { ModalConfirmFooter } from "@/src/components/ui/ModalConfirmFooter";

type CancelarAnticipoModalProps = {
  open: boolean;
  codigo: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function CancelarAnticipoModal({
  open,
  codigo,
  onClose,
  onConfirm,
}: CancelarAnticipoModalProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Cancelar solicitud"
      footer={
        <ModalConfirmFooter
          onCancel={onClose}
          onConfirm={onConfirm}
          cancelLabel="Volver"
          confirmLabel="Confirmar cancelación"
          confirmVariant="danger"
          loadingLabel="Cancelando…"
          onBusyChange={setBusy}
        />
      }
    >
      <p className="text-[13px] text-[#374151]">
        La solicitud <strong className="text-navy">{codigo}</strong> pasará a
        estado <strong>Cancelado</strong> y quedará registrada en el historial.
      </p>
    </Modal>
  );
}

type EnviarAnticipoModalProps = {
  open: boolean;
  resumenHtml: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function EnviarAnticipoModal({
  open,
  resumenHtml,
  onClose,
  onConfirm,
}: EnviarAnticipoModalProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Confirmar envío"
      footer={
        <ModalConfirmFooter
          onCancel={onClose}
          onConfirm={onConfirm}
          cancelLabel="Volver"
          confirmLabel="Enviar a Aprobación"
          confirmVariant="success"
          loadingLabel="Enviando…"
          onBusyChange={setBusy}
        />
      }
    >
      <div
        className="text-[13px] text-[#374151]"
        dangerouslySetInnerHTML={{ __html: resumenHtml }}
      />
    </Modal>
  );
}
