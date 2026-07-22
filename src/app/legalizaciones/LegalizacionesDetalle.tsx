"use client";

import { Card, CardBody } from "@/src/components/ui/Card";
import {
  DataTable,
  dataTd,
  dataThWithAlign,
} from "@/src/components/ui/DataTable";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import {
  DetailGrid,
  DetailSection,
  ReadOnlyField,
} from "@/src/components/ui/DetailView";
import { EstadoLegalizacionPill } from "@/src/components/ui/Pill";
import { PaymentReferencePanel } from "@/src/app/legalizaciones/PaymentReferencePanel";
import { labelTipoLegalizacion } from "@/src/components/ui/TipoLegalizacionPill";
import {
  formatMontoLegal,
  getPaymentReference,
  labelCostCategory,
  labelVoucherType,
  resolveCompaniaId,
  type Legalizacion,
} from "@/src/lib/legalizaciones-mock";
import { EMP_DET, formatMonto } from "@/src/lib/mis-anticipos-mock";

type LegalizacionesDetalleProps = {
  legalizacion: Legalizacion;
  onVolver: () => void;
};

export function LegalizacionesDetalle({
  legalizacion,
  onVolver,
}: LegalizacionesDetalleProps) {
  const paymentRef = legalizacion.anticipoNo
    ? getPaymentReference(legalizacion.anticipoNo)
    : null;
  const companiaId = paymentRef
    ? paymentRef.companiaId
    : resolveCompaniaId(EMP_DET.empresa);

  return (
    <div className="view-wide">
      <PortalSubpageHeader
        parentLabel="Mis Legalizaciones"
        onVolver={onVolver}
        title={legalizacion.no}
      />

      {paymentRef ? (
        <Card className="mb-3">
          <CardBody className="py-4">
            <DetailSection icon="wallet" title="Anticipo legalizado">
              <PaymentReferencePanel reference={paymentRef} />
            </DetailSection>
          </CardBody>
        </Card>
      ) : null}

      {legalizacion.destino ? (
        <Card className="mb-3">
          <CardBody className="py-4">
            <DetailSection icon="flag" title="Destino de la legalización">
              <DetailGrid>
                <ReadOnlyField label="Subproyecto">
                  {legalizacion.destino.subproyecto}
                </ReadOnlyField>
                <ReadOnlyField label="Actividad">
                  {legalizacion.destino.actividad}
                </ReadOnlyField>
              </DetailGrid>
            </DetailSection>
          </CardBody>
        </Card>
      ) : null}

      <Card className="mb-3">
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted">
                Tipo
              </div>
              <div className="mt-1 text-[14px]">
                {labelTipoLegalizacion(legalizacion.tipo)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted">
                Estado
              </div>
              <div className="mt-1">
                <EstadoLegalizacionPill estado={legalizacion.estado} />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted">
                Total legalizado
              </div>
              <div className="mt-1 text-[14px] font-semibold text-navy">
                {formatMontoLegal(legalizacion.monto, legalizacion.div)}
              </div>
            </div>
          </div>
          {legalizacion.comentario ? (
            <div>
              <div className="text-[11px] font-semibold uppercase text-muted">
                Comentario
              </div>
              <div className="mt-1 text-[13px] text-[#374151]">
                {legalizacion.comentario}
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="py-4">
          <h2 className="mb-3 text-[13px] font-bold text-navy">
            Líneas de gasto
          </h2>
          <div className="overflow-x-auto">
            <DataTable
              colWidths={[
                "100px",
                "100px",
                "90px",
                "130px",
                "100px",
                "90px",
                "80px",
                "120px",
                "100px",
                "90px",
                "100px",
              ]}
              className="min-w-[1100px]"
            >
              <thead>
                <tr>
                  {[
                    ["Tipo doc.", "text-left"],
                    ["No. factura", "text-left"],
                    ["Fecha", "text-left"],
                    ["Proveedor", "text-left"],
                    ["Categoría", "text-left"],
                    ["Monto", "text-right"],
                    ["Divisa", "text-left"],
                    ["Nota", "text-left"],
                    ["Adjunto", "text-left"],
                    ["CUFE", "text-left"],
                    ["Asiento IFS", "text-left"],
                  ].map(([col, align]) => (
                    <th key={col} className={dataThWithAlign(align)}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {legalizacion.lineas.map((l) => (
                  <tr key={l.id}>
                    <td className={dataTd}>
                      {labelVoucherType(l.voucherType, companiaId)}
                    </td>
                    <td className={dataTd}>{l.invoiceNo}</td>
                    <td className={`${dataTd} text-muted`}>{l.invoiceDate}</td>
                    <td className={`${dataTd} text-[12px]`}>
                      <div>{l.supplierName}</div>
                      <div className="text-muted">{l.supplierId}</div>
                    </td>
                    <td className={dataTd}>
                      {labelCostCategory(l.costCategory, companiaId)}
                    </td>
                    <td className={`${dataTd} text-right font-semibold`}>
                      {formatMonto(l.netAmount, l.currencyCode)}
                    </td>
                    <td className={dataTd}>{l.currencyCode}</td>
                    <td className={`${dataTd} text-[12px] text-muted`}>
                      {l.lineDescription || "—"}
                    </td>
                    <td className={`${dataTd} text-[12px] text-navy`}>
                      {l.documentAttachment || "—"}
                    </td>
                    <td className={`${dataTd} text-[11px] text-muted`}>
                      {l.cufe || "—"}
                    </td>
                    <td className={`${dataTd} font-medium text-navy`}>
                      {l.voucherNo || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
