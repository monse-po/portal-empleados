"use client";

import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";

type EnviarLegalizacionModalProps = {
  open: boolean;
  resumenHtml: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function EnviarLegalizacionModal({
  open,
  resumenHtml,
  onClose,
  onConfirm,
}: EnviarLegalizacionModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar envío"
      footer={
        <>
          <Button variant="tertiary" onClick={onClose}>
            Volver
          </Button>
          <Button variant="success" onClick={onConfirm}>
            Enviar a Aprobación
          </Button>
        </>
      }
    >
      <div
        className="text-[13px] text-[#374151]"
        dangerouslySetInnerHTML={{ __html: resumenHtml }}
      />
    </Modal>
  );
}
