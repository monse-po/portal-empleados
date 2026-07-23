"use client";

import { useState } from "react";
import {
  AnticipoDetailHeader,
  type AnticipoEventBanner,
} from "@/src/components/ui/AnticipoDetailHeader";
import { Card, CardBody } from "@/src/components/ui/Card";
import {
  DetailGrid,
  DetailSection,
  ReadOnlyBlock,
  ReadOnlyField,
} from "@/src/components/ui/DetailView";
import { GerenteAccionBar } from "@/src/components/ui/GerenteAccionBar";
import { TipoAnticipoPill } from "@/src/components/ui/TipoAnticipoPill";
import { useToast } from "@/src/components/ui/Toast";
import { useAsyncAction } from "@/src/lib/use-async-action";
import type { AnticipoAprobacion } from "@/src/lib/aprobacion-anticipos-mock";
import {
  formatMonto,
  getDirectorProyecto,
} from "@/src/lib/mis-anticipos-mock";

type AprobacionAnticiposDetalleProps = {
  solicitud: AnticipoAprobacion;
  onVolver: () => void;
  onAprobar: (comentario?: string) => void;
  onRechazar: (comentario: string) => void;
};

function getAprobacionEventBanner(
  solicitud: AnticipoAprobacion,
): AnticipoEventBanner | null {
  if (!solicitud.estadoApro) return null;
  return {
    autor: solicitud.aprobador,
    fecha: solicitud.fechaApro || "—",
    motivo: solicitud.comentarioApro || "—",
  };
}

export function AprobacionAnticiposDetalle({
  solicitud,
  onVolver,
  onAprobar,
  onRechazar,
}: AprobacionAnticiposDetalleProps) {
  const [comentario, setComentario] = useState(solicitud.comentarioApro || "");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const resuelto = !!solicitud.estadoApro;
  const director = getDirectorProyecto(solicitud.proy);
  const aprobadorLabel = director
    ? `${director.nombre} (${director.codigo})`
    : solicitud.aprobador || "—";
  const estadoPill = resuelto ? solicitud.estadoApro : "Pendiente";
  const muestraSolicitante = solicitud.solicitante !== solicitud.nombre;
  const banner = getAprobacionEventBanner(solicitud);

  const handleRechazar = () => {
    const trimmed = comentario.trim();
    if (!trimmed) {
      setError("Agrega un motivo de rechazo");
      toast("Escribe el motivo del rechazo", "danger");
      return;
    }
    onRechazar(trimmed);
  };

  const { loading: rechazando, run: runRechazar } =
    useAsyncAction(handleRechazar);

  return (
    <div className="content-standard">
      <AnticipoDetailHeader
        parentLabel="Aprobación de Anticipos"
        codigo={solicitud.no}
        nombre={solicitud.nombre}
        estado={estadoPill}
        onVolver={onVolver}
        banner={banner}
      />

      {!resuelto && (
        <Card className="mb-3 border-[#c7d9ed] bg-[#fafcff]">
          <CardBody className="py-3">
            <GerenteAccionBar
              comentario={comentario}
              onComentarioChange={(value) => {
                setComentario(value);
                if (error) setError("");
              }}
              error={error}
              onRechazar={() => void runRechazar()}
              onAprobar={() => onAprobar(comentario.trim() || undefined)}
              loadingRechazar={rechazando}
              aprobarLabel="Aprobar solicitud"
              hint="Al aprobar, IFS procesará el pago. Esta acción no se puede deshacer."
              placeholder="Ej: Aprobado conforme / Rechazado — excede presupuesto"
            />
          </CardBody>
        </Card>
      )}

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <DetailSection icon="userCircle" title="Empleado beneficiario">
            {muestraSolicitante && (
              <p className="mb-3 text-[12px] leading-snug text-muted">
                Solicitado por{" "}
                <span className="font-semibold text-[#374151]">
                  {solicitud.solicitante}
                </span>
              </p>
            )}
            <DetailGrid>
              <ReadOnlyField label="Fecha de solicitud">
                {solicitud.fecha}
              </ReadOnlyField>
              <ReadOnlyField label="Proyecto asociado">
                {solicitud.proy} – {solicitud.proyN}
              </ReadOnlyField>
              <ReadOnlyField label="Aprobador">{aprobadorLabel}</ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyField label="Compañía que asume el gasto">
                {solicitud.compania}
              </ReadOnlyField>
              <ReadOnlyField label="Cédula">{solicitud.cedula}</ReadOnlyField>
              <ReadOnlyField label="Nombre">{solicitud.nombre}</ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyField label="Cuenta">{solicitud.cuenta}</ReadOnlyField>
              <ReadOnlyField label="Banco">{solicitud.banco}</ReadOnlyField>
              <ReadOnlyField label="Tipo de cuenta">
                {solicitud.tipoCuenta}
              </ReadOnlyField>
            </DetailGrid>
          </DetailSection>
        </CardBody>
      </Card>

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <DetailSection icon="wallet" title="Tipo y monto de la solicitud">
            <DetailGrid>
              <ReadOnlyField label="Tipo de solicitud">
                <TipoAnticipoPill tipo={solicitud.tipo} />
              </ReadOnlyField>
              <ReadOnlyField label="Divisa">{solicitud.divisa}</ReadOnlyField>
              <ReadOnlyField label="Monto" highlight>
                {formatMonto(solicitud.monto, solicitud.divisa)}
              </ReadOnlyField>
            </DetailGrid>

            {solicitud.esViaje && (
              <DetailGrid className="mt-3">
                <ReadOnlyField label="Fecha salida">
                  {solicitud.fechaIda || "—"}
                </ReadOnlyField>
                <ReadOnlyField label="Fecha regreso">
                  {solicitud.fechaReg || "—"}
                </ReadOnlyField>
                <ReadOnlyField label="Destino">
                  {solicitud.destino || "—"}
                </ReadOnlyField>
              </DetailGrid>
            )}

            <DetailGrid className="mt-3">
              <ReadOnlyBlock label="Motivo">{solicitud.motivo}</ReadOnlyBlock>
            </DetailGrid>
          </DetailSection>
        </CardBody>
      </Card>
    </div>
  );
}
