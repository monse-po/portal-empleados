"use client";

import { Button } from "@/src/components/ui/Button";
import { RecordDetailHeader } from "@/src/components/ui/AnticipoDetailHeader";
import { Card, CardBody } from "@/src/components/ui/Card";
import {
  DetailGrid,
  DetailSection,
  ReadOnlyBlock,
  ReadOnlyField,
} from "@/src/components/ui/DetailView";
import { Icon } from "@/src/components/ui/Icon";
import {
  EstadoDocumentoSoportePill,
  estadoDocumentoSoportePillProps,
} from "@/src/components/ui/Pill";
import {
  formatMontoDs,
  formatSizeKb,
  type DocumentoSoporte,
} from "@/src/lib/documento-soporte-mock";

type DocumentoSoporteDetalleProps = {
  documento: DocumentoSoporte;
  onVolver: () => void;
  onContinuarEdicion?: () => void;
};

function getDocumentoBanner(documento: DocumentoSoporte) {
  if (documento.estado === "Rechazado" && documento.notaSolicitud) {
    return {
      autor: documento.aprobadoPorNombre || "Contabilidad",
      fecha: documento.fechaAprobacion || documento.fecha,
      motivo: documento.notaSolicitud,
    };
  }
  if (documento.estado === "Aprobado" && documento.aprobadoPorNombre) {
    return {
      autor: documento.aprobadoPorNombre,
      fecha: documento.fechaAprobacion || documento.fecha,
      motivo: "—",
    };
  }
  if (documento.estado === "Cancelado") {
    return {
      autor: documento.aprobadoPorNombre || "Contabilidad",
      fecha: documento.fechaAprobacion || documento.fecha,
      motivo: documento.notaSolicitud || "Solicitud cancelada",
    };
  }
  return null;
}

export function DocumentoSoporteDetalle({
  documento,
  onVolver,
  onContinuarEdicion,
}: DocumentoSoporteDetalleProps) {
  const banner = getDocumentoBanner(documento);

  return (
    <div className="content-standard">
      <RecordDetailHeader
        parentLabel="Mis DSE"
        codigo={documento.no}
        nombre={documento.solicitadoPorNombre || documento.no}
        estado={documento.estado}
        onVolver={onVolver}
        banner={banner}
        resolvePillVariant={(estado) =>
          estadoDocumentoSoportePillProps(estado).variant
        }
        renderEstadoPill={(estado) => (
          <EstadoDocumentoSoportePill estado={estado} />
        )}
        trailingAction={
          onContinuarEdicion ? (
            <Button variant="primary" onClick={onContinuarEdicion}>
              <Icon name="pencil" size="xs" />
              Continuar edición
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <DetailSection icon="send" title="Datos de la solicitud">
            {documento.registradoPorId.replace(/\D/g, "") !==
            documento.solicitadoPorId.replace(/\D/g, "") ? (
              <p className="mb-3 text-[12px] leading-snug text-muted">
                Registrado por{" "}
                <span className="font-semibold text-[#374151]">
                  {documento.registradoPorNombre}
                </span>
              </p>
            ) : null}
            <DetailGrid>
              <ReadOnlyField label="Fecha de solicitud">
                {documento.fecha}
              </ReadOnlyField>
              <ReadOnlyField label="Empresa">
                {documento.empresaLabel}
              </ReadOnlyField>
              <ReadOnlyField label="Beneficiario">
                {documento.solicitadoPorNombre}
              </ReadOnlyField>
            </DetailGrid>
          </DetailSection>
        </CardBody>
      </Card>

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <DetailSection icon="pencil" title="Documento del proveedor">
            <DetailGrid>
              <ReadOnlyField label="NIF">{documento.nif}</ReadOnlyField>
              <ReadOnlyField label="No. Documento Original">
                {documento.noDocumentoOriginal}
              </ReadOnlyField>
              <ReadOnlyField label="Fecha Documento">
                {documento.fechaDocumento}
              </ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyField label="Forma de pago">
                {documento.tarjetaUltimos4
                  ? "Pagado con tarjeta corporativa"
                  : "—"}
              </ReadOnlyField>
              <ReadOnlyField label="Últimos 4 dígitos">
                {documento.tarjetaUltimos4
                  ? `•••• ${documento.tarjetaUltimos4}`
                  : "—"}
              </ReadOnlyField>
              <ReadOnlyField label="Monto" highlight>
                {formatMontoDs(documento.monto, documento.divisa)}
              </ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyBlock label="Concepto">
                {documento.concepto}
              </ReadOnlyBlock>
            </DetailGrid>
          </DetailSection>
        </CardBody>
      </Card>

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <DetailSection icon="folderOpen" title="Archivo adjunto">
            {documento.adjunto ? (
              <DetailGrid>
                <ReadOnlyField label="Nombre">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="paperclip" size="xs" className="text-navy" />
                    {documento.adjunto.nombre}
                  </span>
                </ReadOnlyField>
                <ReadOnlyField label="Tamaño">
                  {formatSizeKb(documento.adjunto.sizeKb)}
                </ReadOnlyField>
                <ReadOnlyField label="Tipo MIME">
                  {documento.adjunto.mime}
                </ReadOnlyField>
              </DetailGrid>
            ) : (
              <p className="text-[13px] text-muted">Sin archivo adjunto.</p>
            )}
          </DetailSection>
        </CardBody>
      </Card>
    </div>
  );
}
