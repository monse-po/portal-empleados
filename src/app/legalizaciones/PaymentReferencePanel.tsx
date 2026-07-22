"use client";

import {
  DetailGrid,
  ReadOnlyField,
} from "@/src/components/ui/DetailView";
import { formatMonto } from "@/src/lib/mis-anticipos-mock";
import type { PaymentReference } from "@/src/lib/legalizaciones-mock";

type PaymentReferencePanelProps = {
  reference: PaymentReference;
};

function PaymentReferenceFields({ reference }: PaymentReferencePanelProps) {
  return (
    <>
      <ReadOnlyField label="Referencia de pago">
        {reference.paymentReferenceId}
      </ReadOnlyField>
      <ReadOnlyField label="Empleado">{reference.empleadoNombre}</ReadOnlyField>
      <ReadOnlyField label="Identificación">
        {reference.empleadoIdentificacion}
      </ReadOnlyField>
      <ReadOnlyField label="Compañía">{reference.compania}</ReadOnlyField>
      <ReadOnlyField label="Monto del anticipo pagado">
        {formatMonto(reference.montoPagado, reference.moneda)}
      </ReadOnlyField>
      <ReadOnlyField label="Moneda">{reference.moneda}</ReadOnlyField>
      <ReadOnlyField label="Fecha de pago">{reference.fechaPago}</ReadOnlyField>
      <ReadOnlyField label="Proyecto">{reference.proyectoId}</ReadOnlyField>
      <ReadOnlyField label="Nombre proyecto">
        {reference.proyectoNombre}
      </ReadOnlyField>
    </>
  );
}

export function PaymentReferencePanel({ reference }: PaymentReferencePanelProps) {
  return (
    <DetailGrid>
      <PaymentReferenceFields reference={reference} />
    </DetailGrid>
  );
}

type AnticipoReconciliacionBarProps = {
  totalLineas: number;
  reference: PaymentReference;
};

export function AnticipoReconciliacionBar({
  totalLineas,
  reference,
}: AnticipoReconciliacionBarProps) {
  const diferencia = totalLineas - reference.montoPagado;
  const diferenciaLabel =
    diferencia > 0
      ? "reembolso"
      : diferencia < 0
        ? "devolución"
        : "cuadrado";

  const diferenciaClass =
    diferencia > 0
      ? "text-[#b45309]"
      : diferencia < 0
        ? "text-[#15803d]"
        : "text-navy";

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-border bg-white px-4 py-3 text-[12.5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
      <div>
        <span className="font-medium text-[#374151]">Total declarado: </span>
        <span className="font-semibold text-navy">
          {formatMonto(totalLineas, reference.moneda)}
        </span>
      </div>
      <div>
        <span className="font-medium text-[#374151]">Diferencia: </span>
        <span className={`font-bold ${diferenciaClass}`}>
          {formatMonto(diferencia, reference.moneda)}
        </span>
        <span className="ml-1 text-[11px] text-muted">({diferenciaLabel})</span>
      </div>
    </div>
  );
}

/** Campos read-only para incrustar en FormGrid del formulario. */
export function PaymentReferenceFormFields({
  reference,
}: PaymentReferencePanelProps) {
  return <PaymentReferenceFields reference={reference} />;
}
