"use client";

import { useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardBody } from "@/src/components/ui/Card";
import { Field } from "@/src/components/ui/Field";
import { Icon } from "@/src/components/ui/Icon";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import { SelectControl } from "@/src/components/ui/DropdownAffordance";
import { useToast } from "@/src/components/ui/Toast";
import { useDocumentoSoporte } from "@/src/app/documento-soporte/DocumentoSoporteContext";
import {
  formatSizeKb,
  TIPOS_DOCUMENTO_SOPORTE,
  type AdjuntoMock,
  type DocumentoSoporteTipo,
} from "@/src/lib/documento-soporte-mock";

type DocumentoSoporteFormularioProps = {
  onVolver: () => void;
  onGuardado: (no: string) => void;
  editNo?: string | null;
};

function FormSection({
  icon,
  title,
  children,
}: {
  icon: "paperclip" | "pencil";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon name={icon} size="sm" className="text-navy" />
        <h2 className="text-[14px] font-bold text-[#111]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FormGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function DocumentoSoporteFormulario({
  onVolver,
  onGuardado,
  editNo = null,
}: DocumentoSoporteFormularioProps) {
  const { getDocumento, guardarDocumento } = useDocumentoSoporte();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const existing = editNo ? getDocumento(editNo) : undefined;

  const [tipo, setTipo] = useState<DocumentoSoporteTipo>(
    existing?.tipo ?? "Factura",
  );
  const [referencia, setReferencia] = useState(existing?.referencia ?? "");
  const [descripcion, setDescripcion] = useState(existing?.descripcion ?? "");
  const [comentario, setComentario] = useState(existing?.comentario ?? "");
  const [adjunto, setAdjunto] = useState<AdjuntoMock | undefined>(
    existing?.adjunto,
  );

  const pickFile = (file: File | null) => {
    if (!file) return;
    setAdjunto({
      nombre: file.name,
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
      mime: file.type || "application/octet-stream",
    });
  };

  const validar = (): boolean => {
    if (!referencia.trim()) {
      toast("Ingresa la referencia del documento", "danger");
      return false;
    }
    if (descripcion.trim().length < 5) {
      toast("La descripción debe tener al menos 5 caracteres", "danger");
      return false;
    }
    if (!adjunto) {
      toast("Adjunta el archivo de soporte", "danger");
      return false;
    }
    return true;
  };

  const guardar = (enviar: boolean) => {
    if (!validar()) return;
    const no = guardarDocumento(
      {
        tipo,
        referencia,
        descripcion,
        adjunto,
        comentario,
        enviar,
      },
      editNo ?? undefined,
    );
    if (!no) {
      toast("No se pudo guardar el documento", "danger");
      return;
    }
    toast(
      enviar
        ? `Documento ${no} enviado a revisión`
        : editNo
          ? `Borrador ${no} actualizado`
          : `Documento ${no} guardado como borrador`,
      enviar ? "green" : "navy",
    );
    onGuardado(no);
  };

  return (
    <div className="view-wide">
      <PortalSubpageHeader
        parentLabel="Documento de Soporte"
        onVolver={onVolver}
        title={editNo ? `Editar ${editNo}` : "Nuevo documento"}
      />

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <FormSection icon="pencil" title="Datos del documento">
            <FormGrid>
              <Field label="Tipo de documento" required>
                <SelectControl
                  value={tipo}
                  onChange={(e) =>
                    setTipo(e.target.value as DocumentoSoporteTipo)
                  }
                  className="ant-field-input"
                >
                  {TIPOS_DOCUMENTO_SOPORTE.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </SelectControl>
              </Field>
              <Field label="Referencia" required>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej: FV-45821"
                  className="ant-field-input"
                />
              </Field>
              <Field label="Comentario">
                <input
                  type="text"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Opcional"
                  className="ant-field-input"
                />
              </Field>
            </FormGrid>
            <FormGrid className="mt-3">
              <div className="sm:col-span-2 md:col-span-3">
                <Field label="Descripción" required>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Describe el documento y su propósito…"
                    rows={3}
                    className="ant-form-textarea w-full resize-none px-3 py-2 text-[13px] leading-relaxed focus:border-navy focus:outline-none"
                  />
                </Field>
              </div>
            </FormGrid>
          </FormSection>
        </CardBody>
      </Card>

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <FormSection icon="paperclip" title="Archivo de soporte">
            <p className="mb-3 text-[12px] text-muted">
              Selecciona un PDF o imagen. En este MVP el archivo no se sube a
              storage; solo se guarda el nombre y el tamaño.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/*,.zip"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => fileRef.current?.click()}
              >
                <Icon name="paperclip" size="xs" />
                {adjunto ? "Cambiar archivo" : "Seleccionar archivo"}
              </Button>
              {adjunto ? (
                <div className="flex min-w-0 items-center gap-2 text-[13px] text-[#374151]">
                  <Icon name="paperclip" size="xs" className="shrink-0 text-navy" />
                  <span className="truncate font-medium">{adjunto.nombre}</span>
                  <span className="shrink-0 text-muted">
                    {formatSizeKb(adjunto.sizeKb)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdjunto(undefined)}
                    className="cursor-pointer text-[12px] font-semibold text-muted hover:text-navy"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <span className="text-[12px] text-muted">Ningún archivo</span>
              )}
            </div>
          </FormSection>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border bg-white px-5 py-3.5">
        <Button variant="tertiary" onClick={onVolver}>
          Cancelar
        </Button>
        <Button variant="secondary" onClick={() => guardar(false)}>
          {editNo ? "Guardar cambios" : "Guardar"}
        </Button>
        <Button variant="success" onClick={() => guardar(true)}>
          <Icon name="send" size="xs" />
          Enviar a revisión
        </Button>
      </div>
    </div>
  );
}
