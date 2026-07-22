"use client";

import { Card, CardBody } from "@/src/components/ui/Card";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import { Pill } from "@/src/components/ui/Pill";
import type { LegalizacionApro } from "@/src/lib/aprobacion-legalizaciones-mock";
import { formatMontoLegal } from "@/src/lib/legalizaciones-mock";

type AprobacionLegalizacionesDetalleProps = {
  solicitud: LegalizacionApro;
  onVolver: () => void;
};

export function AprobacionLegalizacionesDetalle({
  solicitud,
  onVolver,
}: AprobacionLegalizacionesDetalleProps) {
  return (
    <div className="view-wide">
      <PortalSubpageHeader
        parentLabel="Aprobación de Legalizaciones"
        onVolver={onVolver}
        title={solicitud.no}
      />
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted">
                Solicitante
              </div>
              <div className="mt-1 text-[14px]">{solicitud.solicitante}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted">
                Estado
              </div>
              <div className="mt-1">
                <Pill variant={solicitud.estadoApro ? "aprobado" : "revision"}>
                  {solicitud.estadoApro || "Pendiente"}
                </Pill>
              </div>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase text-muted">
              Concepto
            </div>
            <div className="mt-1 text-[14px] font-medium text-navy">
              {solicitud.concepto}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted">
                Monto
              </div>
              <div className="mt-1 text-[14px]">
                {formatMontoLegal(solicitud.monto, solicitud.div)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted">
                Motivo
              </div>
              <div className="mt-1 text-[13px] text-[#374151]">
                {solicitud.motivo}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
