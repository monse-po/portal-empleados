"use client";

import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";

type CancelarAnticipoModalProps = {
  open: boolean;
  codigo: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function CancelarAnticipoModal({
  open,
  codigo,
  onClose,
  onConfirm,
}: CancelarAnticipoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancelar solicitud"
      footer={
        <>
          <Button variant="tertiary" onClick={onClose}>
            Volver
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Confirmar cancelación
          </Button>
        </>
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
  onConfirm: () => void;
};

export function EnviarAnticipoModal({
  open,
  resumenHtml,
  onClose,
  onConfirm,
}: EnviarAnticipoModalProps) {
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
