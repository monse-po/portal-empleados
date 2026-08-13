"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { DateInput } from "@/src/components/ui/DateInput";
import { Field } from "@/src/components/ui/Field";
import { FileAttachmentField } from "@/src/components/ui/FileAttachmentField";
import { Icon } from "@/src/components/ui/Icon";
import { LovPicker } from "@/src/components/ui/LovPicker";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import { SelectControl } from "@/src/components/ui/DropdownAffordance";
import { SegmentedControl } from "@/src/components/ui/SegmentedControl";
import {
  FormContextNote,
  FormGrid,
  FormSection,
  FormStack,
  SolicitudFormCard,
  SolicitudFormFooter,
} from "@/src/components/ui/SolicitudFormLayout";
import { useToast } from "@/src/components/ui/Toast";
import { useDocumentoSoporte } from "@/src/app/documento-soporte/DocumentoSoporteContext";
import {
  DIVISAS_DS,
  dmyToIso,
  EMPLEADOS_DS,
  EMPRESAS_DS,
  fmtMontoInputDs,
  getDivisaFormatDs,
  hoyDMY,
  hoyIso,
  isoToDmy,
  lookupNifIfs,
  parseMontoInputDs,
  SESSION_DS,
  type AdjuntoMock,
  type NifLookupStatus,
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

export function DocumentoSoporteFormulario({
  onVolver,
  onGuardado,
  editNo = null,
}: DocumentoSoporteFormularioProps) {
  const { getDocumento, guardarDocumento, sessionEmpleadoId, sessionNombre } =
    useDocumentoSoporte();
  const { toast } = useToast();
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
  const [nifLookupStatus, setNifLookupStatus] =
    useState<NifLookupStatus>("idle");
  const [nifProveedorNombre, setNifProveedorNombre] = useState<string | null>(
    null,
  );
  const nifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    existing
      ? fmtMontoInputDs(Math.abs(existing.monto), existing.divisa)
      : "",
  );
  const divisaFmt = getDivisaFormatDs(divisa);
  const [adjunto, setAdjunto] = useState<AdjuntoMock | undefined>(
    existing?.adjunto,
  );

  const handleParaOtroChange = (next: boolean) => {
    setParaOtro(next);
    if (!next) setEmpOtro(null);
  };

  useEffect(() => {
    if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);

    const digits = nif.replace(/\D/g, "");
    if (!nif.trim() || digits.length < 6) {
      setNifLookupStatus("idle");
      setNifProveedorNombre(null);
      return;
    }

    setNifLookupStatus("loading");
    setNifProveedorNombre(null);
    nifDebounceRef.current = setTimeout(() => {
      const result = lookupNifIfs(nif);
      if (result.found && result.nombre) {
        setNifLookupStatus("found");
        setNifProveedorNombre(result.nombre);
      } else {
        setNifLookupStatus("not_found");
        setNifProveedorNombre(null);
      }
    }, 450);

    return () => {
      if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);
    };
  }, [nif]);

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
    const abs = parseMontoInputDs(montoRaw, divisa);
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
        : `Solicitud ${result.codigo} creada (Lanzado)`,
      "green",
    );
    onGuardado(result.codigo);
  };

  return (
    <>
      <div className="content-standard">
        <PortalSubpageHeader
          parentLabel="Mis DSE"
          onVolver={onVolver}
          title={editNo ? `Editar ${editNo}` : "Nueva solicitud"}
        />
        <FormContextNote>
          Solicitud a Contabilidad · documento de soporte electrónico (DSE).
        </FormContextNote>

        <SolicitudFormCard>
          <FormSection icon="send" title="Solicitud para">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <div className="w-fit min-w-0">
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
                  <LovPicker
                    value={empOtro}
                    onChange={setEmpOtro}
                    items={EMPLEADOS_OTRO_LOV}
                    placeholder="Seleccionar empleado"
                    searchPlaceholder="Buscar por cédula o nombre…"
                    valueLabel={(it) => it.nombre}
                  />
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
        </SolicitudFormCard>

        <SolicitudFormCard>
          <FormSection icon="pencil" title="Documento del proveedor">
            <FormStack>
              <FormGrid>
                <Field label="NIF" required>
                  <input
                    type="text"
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    placeholder="Sin espacios"
                    className="ant-field-input"
                    autoComplete="off"
                  />
                  {nifLookupStatus === "loading" ? (
                    <p className="mt-1 text-[11px] text-muted">
                      Buscando en IFS…
                    </p>
                  ) : nifLookupStatus === "found" ? (
                    <p className="mt-1 text-[11px] text-green">
                      Registrado en IFS
                      {nifProveedorNombre
                        ? ` · ${nifProveedorNombre}`
                        : ""}
                    </p>
                  ) : nifLookupStatus === "not_found" ? (
                    <p className="mt-1 text-[11px] text-muted">
                      No registrado en IFS
                    </p>
                  ) : nifLookupStatus === "error" ? (
                    <p className="mt-1 text-[11px] text-muted">
                      Sin conexión con IFS — puedes continuar
                    </p>
                  ) : null}
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

              <FormGrid>
                <Field label="Divisa" required>
                  <SelectControl
                    value={divisa}
                    onChange={(e) => {
                      const next = e.target.value;
                      const n = parseMontoInputDs(montoRaw, divisa);
                      setDivisa(next);
                      if (n !== null && n !== 0) {
                        setMontoRaw(fmtMontoInputDs(n, next));
                      }
                    }}
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
                  <div className="flex h-9 w-full overflow-hidden rounded-[5px] border border-border bg-white focus-within:border-navy">
                    <span className="flex min-w-[40px] items-center justify-center border-r border-border bg-[#f3f4f6] px-2 text-[13px] font-medium text-muted">
                      {divisaFmt.prefix}
                    </span>
                    <input
                      type="text"
                      inputMode={
                        divisaFmt.fractionDigits > 0 ? "decimal" : "numeric"
                      }
                      value={montoRaw}
                      onChange={(e) =>
                        setMontoRaw(e.target.value.replace(/[^\d.,]/g, ""))
                      }
                      onBlur={() => {
                        const n = parseMontoInputDs(montoRaw, divisa);
                        if (n === null || n === 0) {
                          setMontoRaw("");
                          return;
                        }
                        setMontoRaw(fmtMontoInputDs(n, divisa));
                      }}
                      placeholder={
                        divisaFmt.fractionDigits > 0 ? "0.00" : "0"
                      }
                      className="min-w-0 flex-1 border-0 px-2 text-[13px] outline-none"
                    />
                  </div>
                </Field>
                <Field
                  label="Tarjeta corporativa"
                  required={pagoTarjetaCorp}
                >
                  <div className="flex h-9 w-full overflow-hidden rounded-[5px] border border-border bg-white focus-within:border-navy">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={pagoTarjetaCorp}
                      onClick={() => {
                        const next = !pagoTarjetaCorp;
                        setPagoTarjetaCorp(next);
                        if (!next) setTarjetaUltimos4("");
                      }}
                      className="flex min-w-[40px] items-center justify-center border-r border-border bg-[#f3f4f6] px-2"
                      aria-label="Pagado con tarjeta corporativa"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-[3px] border ${
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
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={tarjetaUltimos4}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4);
                        setTarjetaUltimos4(digits);
                        setPagoTarjetaCorp(digits.length > 0);
                      }}
                      onFocus={() => {
                        if (!pagoTarjetaCorp) setPagoTarjetaCorp(true);
                      }}
                      placeholder="Últimos 4 dígitos de la tarjeta"
                      aria-label="Últimos 4 dígitos de la tarjeta"
                      className="min-w-0 flex-1 border-0 px-2 text-[13px] tracking-[0.15em] outline-none placeholder:tracking-normal"
                    />
                  </div>
                </Field>
              </FormGrid>

              <Field label="Concepto" required>
                <input
                  type="text"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Describe el gasto…"
                  className="ant-field-input"
                />
              </Field>

              <Field label="Adjunto" required>
                <FileAttachmentField
                  value={
                    adjunto
                      ? { nombre: adjunto.nombre, sizeKb: adjunto.sizeKb }
                      : null
                  }
                  accept=".pdf,image/*,.zip"
                  onSelect={(file) =>
                    setAdjunto({
                      nombre: file.name,
                      sizeKb: Math.max(1, Math.round(file.size / 1024)),
                      mime: file.type || "application/octet-stream",
                    })
                  }
                  onClear={() => setAdjunto(undefined)}
                />
              </Field>
            </FormStack>
          </FormSection>
        </SolicitudFormCard>

        <SolicitudFormFooter note="Contabilidad revisa y aprueba esta solicitud.">
          <Button variant="tertiary" onClick={onVolver}>
            Descartar
          </Button>
          <Button variant="success" onClick={guardar}>
            <Icon name="send" size="xs" />
            {editNo ? "Guardar cambios" : "Enviar a Aprobación"}
          </Button>
        </SolicitudFormFooter>
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
        .ant-ro-input {
          background: #f3f4f6;
          color: #374151;
          cursor: not-allowed;
        }
        .ant-ro-input:focus {
          outline: none;
          border-color: #e5e9f0;
        }
        .ant-field-input:focus {
          outline: none;
          border-color: #014783;
        }
      `}</style>
    </>
  );
}
