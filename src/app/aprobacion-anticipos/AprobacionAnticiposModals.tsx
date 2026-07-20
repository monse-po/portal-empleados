"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Icon } from "@/src/components/ui/Icon";
import { Modal } from "@/src/components/ui/Modal";

type AprobarAnticipoModalProps = {
  open: boolean;
  codigo: string;
  empleado: string;
  monto: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function AprobarAnticipoModal({
  open,
  codigo,
  empleado,
  monto,
  onClose,
  onConfirm,
}: AprobarAnticipoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Aprobar solicitud"
      icon="circleCheck"
      footer={
        <>
          <Button variant="tertiary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="success" onClick={onConfirm}>
            <Icon name="check" size="xs" />
            Confirmar aprobación
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[13px] text-[#374151]">
        Al confirmar, IFS procesará el pago. Esta acción no se puede deshacer.
      </p>
      <div className="space-y-2 rounded-lg border border-border bg-[#f8fafc] px-4 py-3 text-[12.5px]">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Código</span>
          <span className="font-semibold text-navy">{codigo}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Empleado</span>
          <span className="font-medium">{empleado}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Monto</span>
          <span className="font-bold text-navy">{monto}</span>
        </div>
      </div>
    </Modal>
  );
}

type RechazarAnticipoModalProps = {
  open: boolean;
  codigo: string;
  empleado: string;
  motivo: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function RechazarAnticipoModal({
  open,
  codigo,
  empleado,
  motivo,
  onClose,
  onConfirm,
}: RechazarAnticipoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rechazar solicitud"
      icon="x"
      footer={
        <>
          <Button variant="tertiary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Confirmar rechazo
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[13px] text-[#374151]">
        El rechazo es definitivo; de requerir el anticipo, el empleado deberá
        generar una nueva solicitud.
      </p>
      <div className="space-y-2 rounded-lg border border-border bg-[#f8fafc] px-4 py-3 text-[12.5px]">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Código</span>
          <span className="font-semibold text-navy">{codigo}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted">Empleado</span>
          <span className="font-medium">{empleado}</span>
        </div>
        <div>
          <span className="text-muted">Motivo</span>
          <p className="mt-1 text-[13px] text-[#374151]">{motivo}</p>
        </div>
      </div>
    </Modal>
  );
}

type RechazarAnticiposLoteModalProps = {
  open: boolean;
  resumen: string;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
};

export function RechazarAnticiposLoteModal({
  open,
  resumen,
  onClose,
  onConfirm,
}: RechazarAnticiposLoteModalProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const handleClose = () => {
    setMotivo("");
    setError("");
    onClose();
  };

  const handleConfirm = () => {
    const trimmed = motivo.trim();
    if (!trimmed) {
      setError("Agrega un motivo de rechazo");
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
      title="Rechazar solicitud(es)"
      icon="x"
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
        El rechazo es definitivo; de requerir el anticipo, el empleado deberá
        generar una nueva solicitud.
      </p>
      <div className="mb-4 rounded-lg border border-border bg-[#f8fafc] px-4 py-3 text-[12.5px]">
        <span className="text-muted">Selección: </span>
        <span className="font-semibold text-navy">{resumen}</span>
      </div>
      <label className="mb-1.5 block text-[12px] font-semibold text-[#374151]">
        Motivo del rechazo <span className="text-red">*</span>
      </label>
      <textarea
        value={motivo}
        onChange={(e) => {
          setMotivo(e.target.value);
          if (error) setError("");
        }}
        placeholder="Ej: Excede el presupuesto disponible del proyecto..."
        className={`min-h-[88px] w-full resize-y rounded-lg border px-3 py-2 text-[13px] focus:border-navy focus:outline-none ${error ? "border-red bg-[#fff5f5]" : "border-[#c7d2e0]"}`}
      />
      {error && <p className="mt-1 text-[11px] text-red">{error}</p>}
    </Modal>
  );
}
