"use client";

import { useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { ModalConfirmFooter } from "@/src/components/ui/ModalConfirmFooter";

type EnviarLegalizacionModalProps = {
  open: boolean;
  resumenHtml: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function EnviarLegalizacionModal({
  open,
  resumenHtml,
  onClose,
  onConfirm,
}: EnviarLegalizacionModalProps) {
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
