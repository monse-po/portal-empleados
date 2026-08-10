"use client";

import { Button } from "@/src/components/ui/Button";
import { Card, CardBody } from "@/src/components/ui/Card";
import {
  DetailGrid,
  DetailSection,
  ReadOnlyField,
} from "@/src/components/ui/DetailView";
import { Icon } from "@/src/components/ui/Icon";
import { EstadoDocumentoSoportePill } from "@/src/components/ui/Pill";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
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

export function DocumentoSoporteDetalle({
  documento,
  onVolver,
  onContinuarEdicion,
}: DocumentoSoporteDetalleProps) {
  return (
    <div className="view-wide">
      <PortalSubpageHeader
        parentLabel="Documento de Soporte"
        onVolver={onVolver}
        title={documento.no}
        trailing={
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
          <DetailSection icon="briefcase" title="Solicitud">
            <DetailGrid>
              <ReadOnlyField label="Fecha de solicitud">
                {documento.fecha}
              </ReadOnlyField>
              <ReadOnlyField label="Tipo">{documento.tipo}</ReadOnlyField>
              <ReadOnlyField label="Estado">
                <EstadoDocumentoSoportePill estado={documento.estado} />
              </ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyField label="Empresa">
                {documento.empresaLabel}
              </ReadOnlyField>
              <ReadOnlyField label="Solicitado Por">
                {documento.solicitadoPorNombre}
              </ReadOnlyField>
              <ReadOnlyField label="Registrado por">
                {documento.registradoPorNombre}
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
              <ReadOnlyField label="Tarjeta (últimos 4)">
                {documento.tarjetaUltimos4
                  ? `**** ${documento.tarjetaUltimos4}`
                  : "—"}
              </ReadOnlyField>
              <ReadOnlyField label="Divisa">{documento.divisa}</ReadOnlyField>
              <ReadOnlyField label="Monto">
                {formatMontoDs(documento.monto, documento.divisa)}
              </ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyField label="Concepto">
                {documento.concepto}
              </ReadOnlyField>
            </DetailGrid>
          </DetailSection>
        </CardBody>
      </Card>

      {documento.tipo === "NA" ? (
        <Card className="mb-3 overflow-visible">
          <CardBody className="py-4">
            <DetailSection icon="pencil" title="Nota de Ajuste">
              <DetailGrid>
                <ReadOnlyField label="Tipo Ajuste">
                  {documento.tipoAjuste || "—"}
                </ReadOnlyField>
                <ReadOnlyField label="Documento Soporte a Anular">
                  {documento.documentoSoporteAnular || "—"}
                </ReadOnlyField>
                <ReadOnlyField label="CUDS a Anular">
                  {documento.cudsAnular || "—"}
                </ReadOnlyField>
              </DetailGrid>
            </DetailSection>
          </CardBody>
        </Card>
      ) : null}

      {documento.notaSolicitud ||
      documento.aprobadoPorNombre ||
      documento.fechaAprobacion ? (
        <Card className="mb-3 overflow-visible">
          <CardBody className="py-4">
            <DetailSection icon="checkSquare" title="Seguimiento">
              <DetailGrid>
                <ReadOnlyField label="Aprobado / gestionado por">
                  {documento.aprobadoPorNombre || "—"}
                </ReadOnlyField>
                <ReadOnlyField label="Fecha gestión">
                  {documento.fechaAprobacion || "—"}
                </ReadOnlyField>
                <ReadOnlyField label="Nota">
                  {documento.notaSolicitud?.trim() || "—"}
                </ReadOnlyField>
              </DetailGrid>
            </DetailSection>
          </CardBody>
        </Card>
      ) : null}

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
