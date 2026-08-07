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
          <DetailSection icon="paperclip" title="Documento">
            <DetailGrid>
              <ReadOnlyField label="Fecha de registro">
                {documento.fecha}
              </ReadOnlyField>
              <ReadOnlyField label="Tipo">{documento.tipo}</ReadOnlyField>
              <ReadOnlyField label="Estado">
                <EstadoDocumentoSoportePill estado={documento.estado} />
              </ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyField label="Referencia">
                {documento.referencia}
              </ReadOnlyField>
              <ReadOnlyField label="Descripción">
                {documento.descripcion}
              </ReadOnlyField>
              <ReadOnlyField label="Comentario">
                {documento.comentario?.trim() || "—"}
              </ReadOnlyField>
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
