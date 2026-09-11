"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { DatePickerInput } from "@/src/components/ui/DateRangePicker";
import { Field } from "@/src/components/ui/Field";
import { FileAttachmentField } from "@/src/components/ui/FileAttachmentField";
import { Icon } from "@/src/components/ui/Icon";
import { LoadingNotice } from "@/src/components/ui/LoadingNotice";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import {
  FormContextNote,
  FormGrid,
  FormGridSpan,
  FormHint,
  FormSection,
  SolicitudFormCard,
  SolicitudFormFooter,
  SolicitudParaSection,
} from "@/src/components/ui/SolicitudFormLayout";
import { useToast } from "@/src/components/ui/Toast";
import { useDocumentoSoporte } from "@/src/app/documento-soporte/DocumentoSoporteContext";
import {
  dmyToIso,
  EMPRESAS_DS,
  hoyDMY,
  hoyIso,
  isoToDmy,
  type AdjuntoMock,
  type NifLookupStatus,
} from "@/src/lib/documento-soporte-mock";
import { parseMontoInput } from "@/src/lib/anticipos-catalog";
import { type DivisaOption } from "@/src/lib/anticipos-ifs-catalog";
import { type LovItem } from "@/src/lib/mis-anticipos-mock";
import {
  fetchDseDivisasAction,
  fetchDseEmpleadosAction,
  fetchDseFormBootstrapAction,
  fetchDseProjectsAction,
  lookupNifDseAction,
  type DseEmpleadoOption,
  type DseSupplierMatch,
} from "@/src/server/dse-actions";
import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";

type DocumentoSoporteFormularioProps = {
  onVolver: () => void;
  onGuardado: (no: string) => void;
  editNo?: string | null;
};

const EMPRESA_DEFAULT = EMPRESAS_DS[0];

function empresaLovLabel(item: LovItem): string {
  return item.sub && item.sub !== item.id
    ? `${item.id} – ${item.nombre} (${item.sub})`
    : `${item.id} – ${item.nombre}`;
}

function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function companiasToLov(
  rows: { id: string; label: string }[],
): LovItem[] {
  return rows.map((c) => ({ id: c.id, nombre: c.label, sub: c.id }));
}

/** DSE: es-CO (1.234.567,00). Mínimo 2 decimales; IFS solo si pide más. */
function dseMontoDecimals(ifsDecimals?: number | null): number {
  return ifsDecimals != null && ifsDecimals > 2 ? ifsDecimals : 2;
}

function fmtMontoDse(value: string, decimals: number): string {
  const v = parseMontoInput(value, decimals);
  if (!(v > 0)) return "";
  return v.toLocaleString("es-CO", {
    useGrouping: true,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function DocumentoSoporteFormulario({
  onVolver,
  onGuardado,
  editNo = null,
}: DocumentoSoporteFormularioProps) {
  const {
    getDocumento,
    guardarDocumento,
    sessionEmpleadoId,
    sessionEmpNo,
    sessionNombre,
  } =
    useDocumentoSoporte();
  const { toast } = useToast();
  const existing = editNo ? getDocumento(editNo) : undefined;
  const esEdicion = Boolean(existing);

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
    return {
      id: existing.solicitadoPorId,
      nombre: existing.solicitadoPorNombre,
      sub: existing.solicitadoPorId,
    };
  });
  const [compBenef, setCompBenef] = useState<LovItem | null>(() => {
    if (!existing) return null;
    if (
      existing.solicitadoPorId.replace(/\D/g, "") ===
      sessionEmpleadoId.replace(/\D/g, "")
    ) {
      return null;
    }
    return {
      id: existing.empresaId,
      nombre: existing.empresaLabel || existing.empresaId,
      sub: existing.empresaId,
    };
  });
  const [nif, setNif] = useState(existing?.nif ?? "");
  const [nifLookupStatus, setNifLookupStatus] =
    useState<NifLookupStatus>("idle");
  const [nifProveedorNombre, setNifProveedorNombre] = useState<string | null>(
    null,
  );
  const [nifMatches, setNifMatches] = useState<DseSupplierMatch[]>([]);
  const [nifOpen, setNifOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const nifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nifBoxRef = useRef<HTMLDivElement>(null);
  const [proyectoId, setProyectoId] = useState(existing?.proyectoId ?? "");
  const [proyectos, setProyectos] = useState<{ id: string; nombre: string }[]>(
    [],
  );
  const [proyectosLoading, setProyectosLoading] = useState(true);
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
  const [divisa, setDivisa] = useState(existing?.divisa ?? "");
  const [divisas, setDivisas] = useState<DivisaOption[]>([]);
  const [montoRaw, setMontoRaw] = useState(
    existing ? fmtMontoDse(String(Math.abs(existing.monto)), 2) : "",
  );
  const [adjunto, setAdjunto] = useState<AdjuntoMock | undefined>(
    existing?.adjunto,
  );
  const [adjuntoFile, setAdjuntoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [divisasLoading, setDivisasLoading] = useState(false);
  const [empleadosIfs, setEmpleadosIfs] = useState<DseEmpleadoOption[]>([]);
  const [empleadosIfsLoading, setEmpleadosIfsLoading] = useState(false);
  const [empresasIfs, setEmpresasIfs] = useState<LovItem[]>(() =>
    EMPRESAS_DS.map((c) => ({ id: c.id, nombre: c.label, sub: c.id })),
  );
  const [sessionCompanyId, setSessionCompanyId] = useState(
    existing && !paraOtro ? existing.empresaId : EMPRESA_DEFAULT.id,
  );
  const [sessionCompanyLabel, setSessionCompanyLabel] = useState(
    existing && !paraOtro ? existing.empresaLabel : EMPRESA_DEFAULT.label,
  );

  const divisaOpt = useMemo(
    () => divisas.find((d) => d.code === divisa) ?? null,
    [divisas, divisa],
  );
  const divisaPre = divisaOpt?.pre || "$";
  const divisaDecimals = dseMontoDecimals(divisaOpt?.decimals);
  const empresaBeneficiarioId = paraOtro
    ? compBenef?.id || ""
    : sessionCompanyId;

  const applyDivisas = (next: DivisaOption[]) => {
    setDivisas(next);
    setDivisa((prev) => {
      if (prev && next.some((d) => d.code === prev)) return prev;
      return next[0]?.code || "";
    });
  };

  const handleParaOtroChange = (next: boolean) => {
    setParaOtro(next);
    if (!next) {
      setEmpOtro(null);
      setCompBenef(null);
    }
  };

  const handleCompBenefChange = (item: LovItem | null) => {
    setCompBenef(item);
    setEmpOtro(null);
  };

  const empleadosOtroLov = empleadosIfs;

  const proyectoOptions = useMemo(
    () =>
      proyectos.map((p) => ({
        value: p.id,
        label: p.id,
        hint: p.nombre && p.nombre !== p.id ? p.nombre : undefined,
      })),
    [proyectos],
  );

  useEffect(() => {
    let cancelled = false;
    setProyectosLoading(true);
    void fetchDseProjectsAction().then((result) => {
      if (cancelled) return;
      setProyectosLoading(false);
      setProyectos(result.proyectos);
      setProyectoId((prev) => {
        if (prev && result.proyectos.some((p) => p.id === prev)) return prev;
        return prev;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!nifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!nifBoxRef.current?.contains(e.target as Node)) setNifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [nifOpen]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void fetchDseFormBootstrapAction().then((result) => {
      if (cancelled) return;
      setCatalogLoading(false);
      const lov = companiasToLov(result.companias);
      if (lov.length) setEmpresasIfs(lov);
      setSessionCompanyId(result.companyId || EMPRESA_DEFAULT.id);
      setSessionCompanyLabel(result.companyName || EMPRESA_DEFAULT.label);
    });
    return () => {
      cancelled = true;
    };
    // Solo al montar: la empresa de sesión no depende del toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!montoRaw.trim()) return;
    setMontoRaw((prev) => fmtMontoDse(prev, divisaDecimals));
  }, [divisa, divisaDecimals]);

  useEffect(() => {
    if (!paraOtro || !compBenef?.id) {
      setEmpleadosIfs([]);
      setEmpleadosIfsLoading(false);
      return;
    }
    let cancelled = false;
    setEmpleadosIfsLoading(true);
    setEmpleadosIfs([]);
    void fetchDseEmpleadosAction(compBenef.id).then((result) => {
      if (cancelled) return;
      setEmpleadosIfsLoading(false);
      setEmpleadosIfs(result.empleados);
    });
    return () => {
      cancelled = true;
    };
  }, [paraOtro, compBenef?.id]);

  useEffect(() => {
    if (!empresaBeneficiarioId) {
      setDivisas([]);
      if (!esEdicion) setDivisa("");
      setDivisasLoading(false);
      return;
    }
    let cancelled = false;
    setDivisasLoading(true);
    void fetchDseDivisasAction(empresaBeneficiarioId).then((result) => {
      if (cancelled) return;
      setDivisasLoading(false);
      applyDivisas(result.divisas);
    });
    return () => {
      cancelled = true;
    };
  }, [empresaBeneficiarioId, esEdicion]);

  useEffect(() => {
    if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);

    const typed = nif.replace(/\s+/g, "").trim();
    if (!typed || typed.length < 3 || !empresaBeneficiarioId) {
      setNifLookupStatus("idle");
      setNifProveedorNombre(null);
      setNifMatches([]);
      setSupplierId(undefined);
      return;
    }

    setNifLookupStatus("loading");
    nifDebounceRef.current = setTimeout(() => {
      void lookupNifDseAction(empresaBeneficiarioId, typed).then((result) => {
        const matches = result.matches ?? [];
        setNifMatches(matches);
        if (matches.length === 0) {
          setNifLookupStatus("not_found");
          setNifProveedorNombre(null);
          setSupplierId(undefined);
          setNifOpen(false);
          return;
        }
        setNifLookupStatus("found");
        const exact = matches.find(
          (m) =>
            m.nif.replace(/\s+/g, "").toLowerCase() === typed.toLowerCase() ||
            m.vendorNo.replace(/\s+/g, "").toLowerCase() === typed.toLowerCase(),
        );
        const pick = exact ?? (matches.length === 1 ? matches[0] : null);
        if (pick) {
          setNifProveedorNombre(pick.nombre);
          setSupplierId(pick.vendorNo || undefined);
          setNifOpen(matches.length > 1);
        } else {
          setNifProveedorNombre(null);
          setSupplierId(undefined);
          setNifOpen(true);
        }
      });
    }, 350);

    return () => {
      if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);
    };
  }, [nif, empresaBeneficiarioId]);

  const guardar = async () => {
    if (saving) return;
    let solicitadoPorId = sessionEmpNo || sessionEmpleadoId;
    let solicitadoPorNombre = sessionNombre;
    let solicitadoPorEmpCompany = sessionCompanyId;
    if (paraOtro) {
      if (!compBenef) {
        toast("Selecciona la empresa del empleado beneficiario", "danger");
        return;
      }
      if (!empOtro) {
        toast("Selecciona el empleado beneficiario", "danger");
        return;
      }
      solicitadoPorId =
        empleadosIfs.find((e) => e.id === empOtro.id)?.empNo || empOtro.id;
      solicitadoPorNombre = empOtro.nombre;
      solicitadoPorEmpCompany = compBenef.id;
    }

    if (!nif.trim()) {
      toast("Ingresa el NIF del proveedor", "danger");
      return;
    }
    if (!proyectoId) {
      toast("Selecciona el proyecto", "danger");
      return;
    }
    if (!noDocumentoOriginal.trim()) {
      toast("Ingresa el No. Documento Original", "danger");
      return;
    }
    if (!fechaDocumento) {
      toast("Ingresa la fecha de documento", "danger");
      return;
    }
    if (concepto.trim().length < 5) {
      toast("El concepto debe tener al menos 5 caracteres", "danger");
      return;
    }
    if (!divisa) {
      toast("No hay divisa para la empresa del beneficiario", "danger");
      return;
    }
    const abs = parseMontoInput(montoRaw, divisaDecimals);
    if (!(abs > 0)) {
      toast("Ingresa un monto distinto de cero", "danger");
      return;
    }
    if (!adjunto || (!adjuntoFile && !editNo)) {
      toast("Adjunta el PDF de soporte", "danger");
      return;
    }
    const digits = tarjetaUltimos4.replace(/\D/g, "").slice(-4);
    if (pagoTarjetaCorp && digits.length !== 4) {
      toast("Ingresa los últimos 4 dígitos de la tarjeta", "danger");
      return;
    }

    setSaving(true);
    try {
      let adjuntoBase64: string | undefined;
      if (adjuntoFile) {
        adjuntoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const raw = String(reader.result || "");
            const comma = raw.indexOf(",");
            resolve(comma >= 0 ? raw.slice(comma + 1) : raw);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(adjuntoFile);
        });
      }

      const result = await guardarDocumento(
        {
          tipo: "DSE",
          empresaId:
            paraOtro && compBenef ? compBenef.id : sessionCompanyId,
          empresaLabel:
            paraOtro && compBenef
              ? empresaLovLabel(compBenef)
              : sessionCompanyLabel,
          solicitadoPorId,
          solicitadoPorNombre,
          solicitadoPorEmpCompany,
          proyectoId,
          proyectoNombre: proyectos.find((p) => p.id === proyectoId)?.nombre,
          supplierId,
          nif,
          noDocumentoOriginal,
          fechaDocumento: isoToDmy(fechaDocumento),
          tarjetaUltimos4: pagoTarjetaCorp ? digits : undefined,
          concepto,
          divisa,
          monto: Math.abs(abs),
          adjunto,
          adjuntoBase64,
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
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "No se pudo guardar el DSE",
        "danger",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="content-standard">
        <PortalSubpageHeader
          parentLabel="Mis DSE"
          onVolver={onVolver}
          title={editNo ? `Editar ${editNo}` : "Nuevo DSE"}
        />
        <FormContextNote>
          Solicitud a Contabilidad · documento de soporte electrónico (DSE).
        </FormContextNote>
        {esEdicion ? (
          <div className="mb-5">
            <FormHint>
              En una solicitud ya creada solo puedes cambiar NIF, No. documento,
              monto, proyecto, tarjeta y adjunto. Concepto, fecha, divisa y
              beneficiario los fijó IFS al crear; si están mal, crea una
              solicitud nueva.
            </FormHint>
          </div>
        ) : null}

        <SolicitudFormCard>
          <SolicitudParaSection
            paraOtro={paraOtro}
            onParaOtroChange={handleParaOtroChange}
            fecha={existing?.fecha ?? hoyDMY()}
            empresa={compBenef}
            onEmpresaChange={handleCompBenefChange}
            empresas={empresasIfs}
            empleado={empOtro}
            onEmpleadoChange={setEmpOtro}
            empleados={empleadosOtroLov}
            locked={esEdicion}
          />
        </SolicitudFormCard>

        <SolicitudFormCard>
          <FormSection icon="pencil" title="Documento del proveedor">
            {(catalogLoading || divisasLoading || proyectosLoading) && (
              <LoadingNotice
                variant="banner"
                icon="folderOpen"
                label={
                  proyectosLoading
                    ? "Cargando catálogo IFS"
                    : catalogLoading
                      ? "Cargando empresas IFS de Documento Soporte"
                      : "Cargando divisas IFS de la empresa del beneficiario"
                }
              />
            )}
            {paraOtro && empleadosIfsLoading ? (
              <LoadingNotice
                variant="inline"
                icon="userCircle"
                label="Cargando empleados IFS"
              />
            ) : null}
            <FormGrid>
              <Field label="Proyecto" required>
                <SearchableSelect
                  value={proyectoId}
                  onChange={setProyectoId}
                  options={proyectoOptions}
                  placeholder={
                    proyectosLoading
                      ? "Cargando proyectos IFS…"
                      : TIEMPO_UI_COPY.selectProject
                  }
                  searchPlaceholder={TIEMPO_UI_COPY.searchProject}
                  disabled={proyectosLoading || proyectos.length === 0}
                  emptyMessage="IFS no devolvió proyectos"
                />
                <p className="mt-1 min-h-[16px] text-[11px] leading-snug text-muted">
                  {!proyectosLoading && proyectos.length === 0
                    ? "IFS no devolvió proyectos."
                    : "\u00a0"}
                </p>
              </Field>
              <Field label="NIF" required>
                <div ref={nifBoxRef} className="relative">
                  <input
                    type="text"
                    value={nif}
                    onChange={(e) => {
                      setNif(e.target.value.replace(/\s+/g, ""));
                      setSupplierId(undefined);
                      setNifProveedorNombre(null);
                    }}
                    onFocus={() => {
                      if (nifMatches.length) setNifOpen(true);
                    }}
                    placeholder="NIF del proveedor"
                    className="ant-field-input"
                    autoComplete="off"
                  />
                  {nifOpen && nifMatches.length > 0 ? (
                    <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-[6px] border border-border bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                      {nifMatches.map((m) => (
                        <li key={`${m.vendorNo}-${m.nif}`}>
                          <button
                            type="button"
                            className="flex w-full flex-col items-start px-2.5 py-1.5 text-left hover:bg-[#eef3f9]"
                            onClick={() => {
                              setNif(m.nif || m.vendorNo);
                              setSupplierId(m.vendorNo || undefined);
                              setNifProveedorNombre(m.nombre);
                              setNifLookupStatus("found");
                              setNifOpen(false);
                            }}
                          >
                            <span className="text-[13px] font-medium text-navy">
                              {m.nif || m.vendorNo}
                            </span>
                            <span className="text-[11px] text-muted">
                              {m.nombre}
                              {m.vendorNo && m.vendorNo !== m.nif
                                ? ` · ${m.vendorNo}`
                                : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <p
                  className={`mt-1 min-h-[16px] text-[11px] leading-snug ${
                    nifLookupStatus === "found" ? "text-green" : "text-muted"
                  }`}
                >
                  {nifLookupStatus === "loading"
                    ? "Validando NIF en IFS…"
                    : nifLookupStatus === "found" && nifProveedorNombre
                      ? `NIF válido · ${nifProveedorNombre}`
                      : nifLookupStatus === "not_found"
                        ? "Si no existe el proveedor, adjunta el RUT."
                        : nifLookupStatus === "error"
                          ? "Sin conexión con IFS — puedes continuar"
                          : "\u00a0"}
                </p>
              </Field>
              <Field label="No. Documento Original" required>
                <input
                  type="text"
                  value={noDocumentoOriginal}
                  onChange={(e) => setNoDocumentoOriginal(e.target.value)}
                  placeholder="Ej: FV-45821"
                  className="ant-field-input"
                />
                <p className="mt-1 min-h-[16px] text-[11px] leading-snug text-muted">
                  {"\u00a0"}
                </p>
              </Field>
              <Field label="Fecha de documento" required>
                {esEdicion ? (
                  <input
                    type="text"
                    readOnly
                    value={isoToDmy(fechaDocumento)}
                    className="ant-field-input cursor-not-allowed bg-[#f3f4f6]"
                  />
                ) : (
                  <DatePickerInput
                    value={fechaDocumento}
                    onChange={setFechaDocumento}
                    placeholder="DD/MM/AAAA"
                  />
                )}
                {esEdicion ? (
                  <p className="mt-1 text-[11px] leading-snug text-muted">
                    No se puede cambiar. Crea una solicitud nueva.
                  </p>
                ) : null}
              </Field>
              <Field label="Divisa" required>
                <SearchableSelect
                  value={divisa}
                  onChange={setDivisa}
                  options={divisas.map((d) => ({
                    value: d.code,
                    label: d.label,
                  }))}
                  placeholder={
                    empresaBeneficiarioId
                      ? "Seleccionar divisa…"
                      : "Elige primero la empresa del beneficiario"
                  }
                  searchPlaceholder="Buscar divisa…"
                  disabled={esEdicion || !divisas.length}
                />
                {esEdicion ? (
                  <p className="mt-1 text-[11px] leading-snug text-muted">
                    No se puede cambiar. Crea una solicitud nueva.
                  </p>
                ) : null}
              </Field>
              <Field label="Monto" required>
                <div className="flex h-9 w-full overflow-hidden rounded-[5px] border border-border bg-white focus-within:border-navy">
                  <span className="flex min-w-[40px] items-center justify-center border-r border-border bg-[#f3f4f6] px-2 text-[13px] font-medium text-muted">
                    {divisaPre}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={montoRaw}
                    onChange={(e) =>
                      setMontoRaw(e.target.value.replace(/[^\d.,]/g, ""))
                    }
                    onBlur={() =>
                      setMontoRaw(fmtMontoDse(montoRaw, divisaDecimals))
                    }
                    placeholder="0,00"
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
                    placeholder="Últimos 4 dígitos"
                    aria-label="Últimos 4 dígitos de la tarjeta"
                    className="min-w-0 flex-1 border-0 px-2 text-[13px] tracking-[0.15em] outline-none placeholder:tracking-normal"
                  />
                </div>
              </Field>
              <FormGridSpan span={2}>
                <Field label="Concepto" required>
                  <input
                    type="text"
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    placeholder="Describe el gasto…"
                    readOnly={esEdicion}
                    className={`ant-field-input${esEdicion ? " cursor-not-allowed bg-[#f3f4f6]" : ""}`}
                  />
                  {esEdicion ? (
                    <p className="mt-1 text-[11px] leading-snug text-muted">
                      No se puede cambiar. Crea una solicitud nueva.
                    </p>
                  ) : null}
                </Field>
              </FormGridSpan>
              <FormGridSpan span={3}>
                <Field label="Adjunto (PDF)" required>
                  <FileAttachmentField
                    value={
                      adjunto
                        ? { nombre: adjunto.nombre, sizeKb: adjunto.sizeKb }
                        : null
                    }
                    accept="application/pdf,.pdf"
                    emptyLabel="Adjuntar PDF"
                    onSelect={(file) => {
                      if (!isPdfFile(file)) {
                        toast("El adjunto debe ser un PDF", "danger");
                        return;
                      }
                      setAdjuntoFile(file);
                      setAdjunto({
                        nombre: file.name,
                        sizeKb: Math.max(1, Math.round(file.size / 1024)),
                        mime: "application/pdf",
                      });
                    }}
                    onClear={() => {
                      setAdjunto(undefined);
                      setAdjuntoFile(null);
                    }}
                  />
                </Field>
              </FormGridSpan>
            </FormGrid>
          </FormSection>
        </SolicitudFormCard>

        <SolicitudFormFooter note="Contabilidad revisa y aprueba esta solicitud.">
          <Button variant="tertiary" onClick={onVolver}>
            Descartar
          </Button>
          <Button
            variant="success"
            onClick={() => void guardar()}
            loading={saving}
            loadingLabel="Enviando…"
          >
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
