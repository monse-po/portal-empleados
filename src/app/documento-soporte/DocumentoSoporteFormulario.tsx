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
  DIVISAS_DS,
  dmyToIso,
  EMPLEADOS_DS,
  EMPRESAS_DS,
  formatSizeKb,
  hoyDMY,
  hoyIso,
  isoToDmy,
  TIPOS_AJUSTE_NA,
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
  icon: "paperclip" | "pencil" | "userCircle" | "briefcase";
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

function parseMontoInput(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function DocumentoSoporteFormulario({
  onVolver,
  onGuardado,
  editNo = null,
}: DocumentoSoporteFormularioProps) {
  const { getDocumento, guardarDocumento, sessionNombre } =
    useDocumentoSoporte();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const existing = editNo ? getDocumento(editNo) : undefined;

  const [tipo, setTipo] = useState<DocumentoSoporteTipo>(
    existing?.tipo ?? "DSE",
  );
  const [empresaId, setEmpresaId] = useState(
    existing?.empresaId ?? EMPRESAS_DS[0].id,
  );
  const [solicitadoPorId, setSolicitadoPorId] = useState(
    existing?.solicitadoPorId ?? EMPLEADOS_DS[0].id,
  );
  const [nif, setNif] = useState(existing?.nif ?? "");
  const [noDocumentoOriginal, setNoDocumentoOriginal] = useState(
    existing?.noDocumentoOriginal ?? "",
  );
  const [fechaDocumento, setFechaDocumento] = useState(
    existing ? dmyToIso(existing.fechaDocumento) : hoyIso(),
  );
  const [tarjetaUltimos4, setTarjetaUltimos4] = useState(
    existing?.tarjetaUltimos4 ?? "",
  );
  const [concepto, setConcepto] = useState(existing?.concepto ?? "");
  const [divisa, setDivisa] = useState(existing?.divisa ?? "COP");
  const [montoRaw, setMontoRaw] = useState(
    existing ? String(Math.abs(existing.monto)) : "",
  );
  const [adjunto, setAdjunto] = useState<AdjuntoMock | undefined>(
    existing?.adjunto,
  );
  const [tipoAjuste, setTipoAjuste] = useState(existing?.tipoAjuste ?? "");
  const [documentoSoporteAnular, setDocumentoSoporteAnular] = useState(
    existing?.documentoSoporteAnular ?? "",
  );
  const [cudsAnular, setCudsAnular] = useState(existing?.cudsAnular ?? "");

  const pickFile = (file: File | null) => {
    if (!file) return;
    setAdjunto({
      nombre: file.name,
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
      mime: file.type || "application/octet-stream",
    });
  };

  const onTipoChange = (next: DocumentoSoporteTipo) => {
    setTipo(next);
    if (next === "DSE") {
      setTipoAjuste("");
      setDocumentoSoporteAnular("");
      setCudsAnular("");
    }
  };

  const guardar = () => {
    const emp = EMPRESAS_DS.find((e) => e.id === empresaId);
    const sol = EMPLEADOS_DS.find((e) => e.id === solicitadoPorId);
    if (!emp) {
      toast("Selecciona la empresa", "danger");
      return;
    }
    if (!sol) {
      toast("Selecciona Solicitado Por", "danger");
      return;
    }
    if (!nif.trim()) {
      toast("Ingresa el NIF del proveedor", "danger");
      return;
    }
    if (!noDocumentoOriginal.trim()) {
      toast("Ingresa el No. Documento Original", "danger");
      return;
    }
    if (!fechaDocumento) {
      toast("Ingresa la Fecha Documento", "danger");
      return;
    }
    if (concepto.trim().length < 5) {
      toast("El concepto debe tener al menos 5 caracteres", "danger");
      return;
    }
    const abs = parseMontoInput(montoRaw);
    if (abs === null || abs === 0) {
      toast("Ingresa un monto distinto de cero", "danger");
      return;
    }
    if (!adjunto) {
      toast("Adjunta el archivo de soporte", "danger");
      return;
    }
    if (tipo === "NA") {
      if (!tipoAjuste.trim()) {
        toast("Tipo Ajuste es obligatorio para NA", "danger");
        return;
      }
      if (!documentoSoporteAnular.trim()) {
        toast("Documento Soporte a Anular es obligatorio", "danger");
        return;
      }
      if (!cudsAnular.trim()) {
        toast("CUDS a Anular es obligatorio", "danger");
        return;
      }
    }

    const monto = tipo === "NA" ? -Math.abs(abs) : Math.abs(abs);
    const result = guardarDocumento(
      {
        tipo,
        empresaId: emp.id,
        empresaLabel: emp.label,
        solicitadoPorId: sol.id,
        solicitadoPorNombre: sol.nombre,
        nif,
        noDocumentoOriginal,
        fechaDocumento: isoToDmy(fechaDocumento),
        tarjetaUltimos4: tarjetaUltimos4.replace(/\D/g, "").slice(-4) || undefined,
        concepto,
        divisa,
        monto,
        adjunto,
        tipoAjuste: tipo === "NA" ? tipoAjuste : undefined,
        documentoSoporteAnular:
          tipo === "NA" ? documentoSoporteAnular : undefined,
        cudsAnular: tipo === "NA" ? cudsAnular : undefined,
      },
      editNo ?? undefined,
    );

    if (!result.ok) {
      toast(result.error, "danger");
      return;
    }
    toast(
      editNo
        ? `Solicitud ${result.codigo} actualizada`
        : `Solicitud ${result.codigo} creada (Solicitado)`,
      "green",
    );
    onGuardado(result.codigo);
  };

  return (
    <div className="view-wide">
      <PortalSubpageHeader
        parentLabel="Documento de Soporte"
        onVolver={onVolver}
        title={editNo ? `Editar ${editNo}` : "Nueva solicitud"}
      />

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <FormSection icon="briefcase" title="Solicitud">
            <FormGrid>
              <Field label="Empresa" required>
                <SelectControl
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className="ant-field-input"
                >
                  {EMPRESAS_DS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </SelectControl>
              </Field>
              <Field label="Tipo" required>
                <SelectControl
                  value={tipo}
                  onChange={(e) =>
                    onTipoChange(e.target.value as DocumentoSoporteTipo)
                  }
                  className="ant-field-input"
                >
                  {TIPOS_DOCUMENTO_SOPORTE.map((t) => (
                    <option key={t} value={t}>
                      {t === "DSE"
                        ? "DSE — Documento Soporte Electrónico"
                        : "NA — Nota de Ajuste"}
                    </option>
                  ))}
                </SelectControl>
              </Field>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-[#374151]">
                  Fecha de solicitud
                </span>
                <span className="flex h-9 items-center text-[13px] text-muted">
                  {existing?.fecha ?? hoyDMY()}
                </span>
              </div>
            </FormGrid>
            <FormGrid className="mt-3">
              <Field label="Solicitado Por" required>
                <SelectControl
                  value={solicitadoPorId}
                  onChange={(e) => setSolicitadoPorId(e.target.value)}
                  className="ant-field-input"
                >
                  {EMPLEADOS_DS.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </SelectControl>
              </Field>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-[#374151]">
                  Registrado por
                </span>
                <span className="flex h-9 items-center text-[13px] text-muted">
                  {existing?.registradoPorNombre ?? sessionNombre}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-[#374151]">
                  Estado
                </span>
                <span className="flex h-9 items-center text-[13px] text-muted">
                  Solicitado
                </span>
              </div>
            </FormGrid>
          </FormSection>
        </CardBody>
      </Card>

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <FormSection icon="pencil" title="Documento del proveedor">
            <FormGrid>
              <Field label="NIF" required>
                <input
                  type="text"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  placeholder="Sin espacios"
                  className="ant-field-input"
                />
              </Field>
              <Field label="No. Documento Original" required>
                <input
                  type="text"
                  value={noDocumentoOriginal}
                  onChange={(e) => setNoDocumentoOriginal(e.target.value)}
                  placeholder="Ej: FV-45821"
                  className="ant-field-input"
                />
              </Field>
              <Field label="Fecha Documento" required>
                <input
                  type="date"
                  value={fechaDocumento}
                  onChange={(e) => setFechaDocumento(e.target.value)}
                  className="ant-field-input"
                />
              </Field>
            </FormGrid>
            <FormGrid className="mt-3">
              <Field label="Tarjeta (últimos 4)">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={tarjetaUltimos4}
                  onChange={(e) =>
                    setTarjetaUltimos4(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="Opcional"
                  className="ant-field-input"
                />
              </Field>
              <Field label="Divisa" required>
                <SelectControl
                  value={divisa}
                  onChange={(e) => setDivisa(e.target.value)}
                  className="ant-field-input"
                >
                  {DIVISAS_DS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </SelectControl>
              </Field>
              <Field
                label={tipo === "NA" ? "Monto (se guarda negativo)" : "Monto"}
                required
              >
                <input
                  type="text"
                  inputMode="decimal"
                  value={montoRaw}
                  onChange={(e) => setMontoRaw(e.target.value)}
                  placeholder={tipo === "NA" ? "Ej: 200000" : "Ej: 850000"}
                  className="ant-field-input"
                />
              </Field>
            </FormGrid>
            <FormGrid className="mt-3">
              <div className="sm:col-span-2 md:col-span-3">
                <Field label="Concepto" required>
                  <textarea
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder="Describe el gasto o ajuste…"
                    rows={3}
                    className="ant-form-textarea w-full resize-none px-3 py-2 text-[13px] leading-relaxed focus:border-navy focus:outline-none"
                  />
                </Field>
              </div>
            </FormGrid>
          </FormSection>
        </CardBody>
      </Card>

      {tipo === "NA" ? (
        <Card className="mb-3 overflow-visible">
          <CardBody className="py-4">
            <FormSection icon="pencil" title="Datos de Nota de Ajuste">
              <FormGrid>
                <Field label="Tipo Ajuste" required>
                  <SelectControl
                    value={tipoAjuste}
                    onChange={(e) => setTipoAjuste(e.target.value)}
                    className="ant-field-input"
                  >
                    <option value="">Seleccionar…</option>
                    {TIPOS_AJUSTE_NA.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </SelectControl>
                </Field>
                <Field label="Documento Soporte a Anular" required>
                  <input
                    type="text"
                    value={documentoSoporteAnular}
                    onChange={(e) => setDocumentoSoporteAnular(e.target.value)}
                    placeholder="Ej: DSE-2026-00112"
                    className="ant-field-input"
                  />
                </Field>
                <Field label="CUDS a Anular" required>
                  <input
                    type="text"
                    value={cudsAnular}
                    onChange={(e) => setCudsAnular(e.target.value)}
                    placeholder="CUDS del DSE a anular"
                    className="ant-field-input"
                  />
                </Field>
              </FormGrid>
            </FormSection>
          </CardBody>
        </Card>
      ) : null}

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <FormSection icon="paperclip" title="Archivo de soporte">
            <p className="mb-3 text-[12px] text-muted">
              PDF o imagen. En este MVP solo se guarda nombre y tamaño.
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
                  <Icon
                    name="paperclip"
                    size="xs"
                    className="shrink-0 text-navy"
                  />
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
        <Button variant="primary" onClick={guardar}>
          <Icon name="check" size="xs" />
          {editNo ? "Guardar cambios" : "Crear solicitud"}
        </Button>
      </div>
    </div>
  );
}
