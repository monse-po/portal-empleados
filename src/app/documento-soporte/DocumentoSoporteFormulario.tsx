"use client";

import { useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardBody } from "@/src/components/ui/Card";
import { DateInput } from "@/src/components/ui/DateInput";
import { Field } from "@/src/components/ui/Field";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import { LovPicker } from "@/src/components/ui/LovPicker";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import { SelectControl } from "@/src/components/ui/DropdownAffordance";
import { SegmentedControl } from "@/src/components/ui/SegmentedControl";
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
  SESSION_DS,
  type AdjuntoMock,
} from "@/src/lib/documento-soporte-mock";
import type { LovItem } from "@/src/lib/mis-anticipos-mock";

type DocumentoSoporteFormularioProps = {
  onVolver: () => void;
  onGuardado: (no: string) => void;
  editNo?: string | null;
};

const EMPRESA_DEFAULT = EMPRESAS_DS[0];

const EMPLEADOS_OTRO_LOV: LovItem[] = EMPLEADOS_DS.filter(
  (e) => e.id !== SESSION_DS.id,
).map((e) => ({
  id: e.id,
  nombre: e.nombre,
  sub: e.id,
}));

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

function FormSection({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-navy">
        <Icon name={icon} size="sm" className="text-navy" />
        {title}
      </h2>
      {children}
    </section>
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
  const { getDocumento, guardarDocumento, sessionEmpleadoId, sessionNombre } =
    useDocumentoSoporte();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const existing = editNo ? getDocumento(editNo) : undefined;

  const [paraOtro, setParaOtro] = useState(() => {
    if (!existing) return false;
    return (
      existing.solicitadoPorId.replace(/\D/g, "") !==
      sessionEmpleadoId.replace(/\D/g, "")
    );
  });
  const [empOtro, setEmpOtro] = useState<LovItem | null>(() => {
    if (!existing) return null;
    if (
      existing.solicitadoPorId.replace(/\D/g, "") ===
      sessionEmpleadoId.replace(/\D/g, "")
    ) {
      return null;
    }
    return (
      EMPLEADOS_OTRO_LOV.find((x) => x.id === existing.solicitadoPorId) ?? {
        id: existing.solicitadoPorId,
        nombre: existing.solicitadoPorNombre,
        sub: existing.solicitadoPorId,
      }
    );
  });
  const [nif, setNif] = useState(existing?.nif ?? "");
  const [noDocumentoOriginal, setNoDocumentoOriginal] = useState(
    existing?.noDocumentoOriginal ?? "",
  );
  const [fechaDocumento, setFechaDocumento] = useState(
    existing ? dmyToIso(existing.fechaDocumento) : hoyIso(),
  );
  const [pagoTarjetaCorp, setPagoTarjetaCorp] = useState(
    !!existing?.tarjetaUltimos4,
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

  const handleParaOtroChange = (next: boolean) => {
    setParaOtro(next);
    if (!next) setEmpOtro(null);
  };

  const pickFile = (file: File | null) => {
    if (!file) return;
    setAdjunto({
      nombre: file.name,
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
      mime: file.type || "application/octet-stream",
    });
  };

  const guardar = () => {
    let solicitadoPorId = SESSION_DS.id;
    let solicitadoPorNombre = sessionNombre;
    if (paraOtro) {
      if (!empOtro) {
        toast("Selecciona el empleado", "danger");
        return;
      }
      solicitadoPorId = empOtro.id;
      solicitadoPorNombre = empOtro.nombre;
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
    const digits = tarjetaUltimos4.replace(/\D/g, "").slice(-4);
    if (pagoTarjetaCorp && digits.length !== 4) {
      toast("Ingresa los últimos 4 dígitos de la tarjeta", "danger");
      return;
    }

    const result = guardarDocumento(
      {
        tipo: "DSE",
        empresaId: EMPRESA_DEFAULT.id,
        empresaLabel: EMPRESA_DEFAULT.label,
        solicitadoPorId,
        solicitadoPorNombre,
        nif,
        noDocumentoOriginal,
        fechaDocumento: isoToDmy(fechaDocumento),
        tarjetaUltimos4: pagoTarjetaCorp ? digits : undefined,
        concepto,
        divisa,
        monto: Math.abs(abs),
        adjunto,
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
    <>
      <div className="content-standard">
        <PortalSubpageHeader
          parentLabel="Documento de Soporte"
          onVolver={onVolver}
          title={
            editNo ? `Editar ${editNo}` : "Solicitar documento de soporte"
          }
        />

        <Card className="mb-3 overflow-visible">
          <CardBody className="py-4">
            <FormSection icon="send" title="Datos de la solicitud">
              <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                <div className="w-fit min-w-0">
                  <p className="mb-1.5 text-[12px] font-semibold text-[#374151]">
                    Solicitud para
                  </p>
                  <SegmentedControl
                    aria-label="Solicitud para"
                    value={paraOtro ? "otro" : "mi"}
                    onChange={(v) => handleParaOtroChange(v === "otro")}
                    options={[
                      { value: "mi", label: "Para mí" },
                      { value: "otro", label: "Para otro empleado" },
                    ]}
                  />
                </div>
                {paraOtro ? (
                  <div className="min-w-[200px] max-w-xs flex-1">
                    <Field label="Empleado" required>
                      <LovPicker
                        value={empOtro}
                        onChange={setEmpOtro}
                        items={EMPLEADOS_OTRO_LOV}
                        placeholder="Seleccionar empleado"
                        searchPlaceholder="Buscar por cédula o nombre…"
                        valueLabel={(it) => it.nombre}
                      />
                    </Field>
                  </div>
                ) : null}
                <div className="ml-auto flex min-w-0 flex-col items-end gap-1.5">
                  <span className="text-[12px] font-semibold text-[#374151]">
                    Fecha de solicitud
                  </span>
                  <span className="flex h-9 items-center text-[13px] text-muted">
                    {existing?.fecha ?? hoyDMY()}
                  </span>
                </div>
              </div>
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
                  <DateInput
                    value={fechaDocumento}
                    onChange={(e) => setFechaDocumento(e.target.value)}
                    className="ant-field-input"
                  />
                </Field>
              </FormGrid>

              <FormGrid className="mt-3">
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
                <Field label="Monto" required>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={montoRaw}
                    onChange={(e) => setMontoRaw(e.target.value)}
                    placeholder="0"
                    className="ant-field-input"
                  />
                </Field>
              </FormGrid>

              <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
                <div className="w-fit max-w-full">
                  <p className="mb-1.5 text-[12px] font-semibold text-[#374151]">
                    Forma de pago
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !pagoTarjetaCorp;
                      setPagoTarjetaCorp(next);
                      if (!next) setTarjetaUltimos4("");
                    }}
                    className={`inline-flex w-fit max-w-full cursor-pointer items-center gap-2.5 rounded-[8px] border px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                      pagoTarjetaCorp
                        ? "border-navy bg-[#eef3f9] text-navy"
                        : "border-border bg-white text-[#374151] hover:border-[#c7d9ed] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
                        pagoTarjetaCorp
                          ? "border-navy bg-navy text-white"
                          : "border-[#c7d2e0] bg-white"
                      }`}
                      aria-hidden
                    >
                      {pagoTarjetaCorp ? (
                        <Icon name="check" size="xs" className="text-white" />
                      ) : null}
                    </span>
                    Pagado con tarjeta corporativa
                  </button>
                </div>
                {pagoTarjetaCorp ? (
                  <Field label="Últimos 4 dígitos" required>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={tarjetaUltimos4}
                      onChange={(e) =>
                        setTarjetaUltimos4(
                          e.target.value.replace(/\D/g, "").slice(0, 4),
                        )
                      }
                      placeholder="••••"
                      className="ant-field-input w-[88px] text-center tracking-[0.2em]"
                    />
                  </Field>
                ) : null}
              </div>

              <div className="mt-3">
                <Field label="Concepto" required>
                  <textarea
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder="Describe el gasto…"
                    rows={3}
                    className="ant-form-textarea w-full resize-none px-3 py-2 text-[13px] leading-relaxed focus:border-navy focus:outline-none"
                  />
                </Field>
              </div>

              <div className="mt-3 max-w-md">
                <Field label="Adjunto" required>
                  <div className="flex items-center gap-1">
                    <label className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[5px] border border-dashed border-[#c7d9ed] bg-white px-3 text-[12px] hover:bg-[#f4f7fb]">
                      <Icon
                        name="paperclip"
                        size="xs"
                        className="shrink-0 text-muted"
                      />
                      <span
                        className={`min-w-0 truncate ${adjunto ? "font-medium text-navy" : "text-muted"}`}
                      >
                        {adjunto
                          ? `${adjunto.nombre} · ${formatSizeKb(adjunto.sizeKb)}`
                          : "Adjuntar PDF o imagen"}
                      </span>
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*,.zip"
                        onChange={(e) => {
                          pickFile(e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {adjunto ? (
                      <button
                        type="button"
                        onClick={() => setAdjunto(undefined)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-[#fee2e2] hover:text-[#b91c1c]"
                        title="Quitar"
                      >
                        <Icon name="x" size="xs" />
                      </button>
                    ) : null}
                  </div>
                </Field>
              </div>
            </FormSection>
          </CardBody>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-5 py-3.5">
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <Icon name="info" size="xs" className="text-muted" />
            Contabilidad revisa y aprueba esta solicitud.
          </span>
          <div className="flex gap-2.5">
            <Button variant="tertiary" onClick={onVolver}>
              Descartar
            </Button>
            <Button variant="success" onClick={guardar}>
              <Icon name="send" size="xs" />
              {editNo ? "Guardar cambios" : "Enviar solicitud"}
            </Button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .ant-ro-input,
        .ant-field-input {
          height: 36px;
          width: 100%;
          border-radius: 5px;
          border: 1px solid #e5e9f0;
          padding: 0 10px;
          font-size: 13px;
        }
        .ant-form-textarea {
          width: 100%;
          border-radius: 5px;
          border: 1px solid #e5e9f0;
        }
        .ant-ro-input {
          background: #f3f4f6;
          color: #374151;
          cursor: not-allowed;
        }
        .ant-ro-input:focus {
          outline: none;
          border-color: #e5e9f0;
        }
        .ant-field-input:focus,
        .ant-form-textarea:focus {
          outline: none;
          border-color: #014783;
        }
      `}</style>
    </>
  );
}
