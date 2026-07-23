"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardBody } from "@/src/components/ui/Card";
import { DateInput } from "@/src/components/ui/DateInput";
import { Field } from "@/src/components/ui/Field";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import { LovPicker } from "@/src/components/ui/LovPicker";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import { SelectControl } from "@/src/components/ui/DropdownAffordance";
import {
  TIPO_ANTICIPO_SEGMENTED_OPTIONS,
} from "@/src/components/ui/TipoAnticipoPill";
import { SegmentedControl } from "@/src/components/ui/SegmentedControl";
import { useToast } from "@/src/components/ui/Toast";
import { EnviarAnticipoModal } from "@/src/app/mis-anticipos/AnticiposModals";
import type { LanzarAnticipoInput } from "@/src/app/mis-anticipos/AnticiposContext";
import {
  COMPANIAS,
  COMPANIAS_HMV,
  DIVISAS_POR_COMPANIA,
  EMP_DET,
  EMPLEADOS_ANT,
  fmtMontoInput,
  getDirectorProyecto,
  getEmpleadosPorEmpresa,
  hoyDMY,
  hoyIso,
  isoToDmy,
  parseMontoInput,
  PRE_MAP,
  PROYECTOS_ANT,
  searchDestinos,
  SESSION_EMPLEADO,
  validarFechaIdaViaje,
  type AnticipoTipo,
  type DestinoSel,
  type EmpleadoAnticipo,
  type LovItem,
} from "@/src/lib/mis-anticipos-mock";

type AnticiposFormularioProps = {
  onVolver: () => void;
  onLanzar: (input: LanzarAnticipoInput) => string | null;
  onLanzarOtro: (beneficiario: string) => void;
};

const PROYECTOS_LOV: LovItem[] = PROYECTOS_ANT.map((p) => ({
  id: p.id,
  nombre: p.nombre,
  sub: p.sub,
}));

function RoInput({ value }: { value: string }) {
  return <input readOnly value={value} className="ant-ro-input" />;
}

function fmtCedulaSinPuntos(cedula: string): string {
  return cedula.replace(/\D/g, "");
}

function maskCuenta(cuenta: string): string {
  const raw = cuenta.replace(/[\s-]/g, "");
  if (!raw) return "";
  if (raw.length <= 4) return raw;
  return `${"•".repeat(raw.length - 4)}${raw.slice(-4)}`;
}

function getCompaniaGastoLabel(
  id: string,
  emp?: EmpleadoAnticipo | null,
): string {
  const fromCatalog = COMPANIAS.find((c) => c.id === id)?.label;
  if (fromCatalog) return fromCatalog;
  const fromEmp = emp?.companias.find((c) => c.id === id)?.label;
  if (fromEmp) return fromEmp;
  const fromBenef = COMPANIAS_HMV.find((c) => c.id === id);
  if (fromBenef) return `${fromBenef.id} – ${fromBenef.nombre} (${fromBenef.sub})`;
  return id;
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

function FormGridSpan({
  children,
  span = 1,
  className = "",
}: {
  children: React.ReactNode;
  span?: 1 | 2 | 3;
  className?: string;
}) {
  const spanClass =
    span === 3 ? "md:col-span-3" : span === 2 ? "md:col-span-2" : "";
  return (
    <div className={`min-w-0 ${spanClass} ${className}`.trim()}>{children}</div>
  );
}

function FormSection({
  icon,
  title,
  hint,
  children,
}: {
  icon: IconName;
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-navy">
        <Icon name={icon} size="sm" className="text-navy" />
        {title}
      </h2>
      {hint ? <div className="mb-3">{hint}</div> : null}
      {children}
    </section>
  );
}

function FormHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex w-fit max-w-full items-start gap-2 rounded-md border border-[#c7d9ed] bg-[#eef3f9] px-3 py-2 text-[12px] leading-snug text-[#1e40af]">
      <Icon name="info" size="xs" className="mt-0.5 shrink-0 text-[#1e40af]" />
      <span>{children}</span>
    </div>
  );
}

/** Hint operativo / regla de negocio — misma familia visual que FormHint */
function FormNote({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex w-fit max-w-full items-start gap-2 rounded-md border border-[#c7d9ed] bg-[#eef3f9] px-3 py-2 text-[12px] leading-snug text-[#1e40af] ${className}`.trim()}
    >
      <Icon name="info" size="xs" className="mt-0.5 shrink-0 text-[#1e40af]" />
      <span>{children}</span>
    </div>
  );
}

function DestinoPicker({
  value,
  onChange,
  error,
}: {
  value: DestinoSel | null;
  onChange: (dest: DestinoSel | null) => void;
  error?: boolean;
}) {
  const [q, setQ] = useState(value?.label || "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const resultados = useMemo(() => searchDestinos(q), [q]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const porPais = useMemo(() => {
    const map: Record<string, DestinoSel[]> = {};
    resultados.forEach((r) => {
      if (!map[r.pais]) map[r.pais] = [];
      map[r.pais].push(r);
    });
    return map;
  }, [resultados]);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Icon
          name="search"
          size="xs"
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]"
        />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            onChange(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Ej: Medellín, Bogotá, Miami..."
          autoComplete="off"
          className={`ant-field-input !pl-[30px] ${error ? "!border-red" : ""}`}
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+3px)] z-[200] max-h-[260px] overflow-y-auto rounded-lg border border-border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.10)]">
          {Object.keys(porPais).length === 0 ? (
            <div className="px-3.5 py-3 text-[12px] text-[#9ca3af]">
              Sin resultados
            </div>
          ) : (
            Object.entries(porPais).map(([pais, items]) => (
              <div key={pais}>
                <div className="border-t border-[#f3f4f6] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#9ca3af] first:border-t-0">
                  {pais}
                </div>
                {items.map((r) => (
                  <button
                    key={`${r.pCode}-${r.ciudad}`}
                    type="button"
                    onClick={() => {
                      onChange(r);
                      setQ(r.label);
                      setOpen(false);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 px-3.5 py-[7px] text-left hover:bg-[#f5f7fa]"
                  >
                    <Icon name="mapPin" size="xs" className="text-navy" />
                    <span className="text-[12.5px] font-medium text-[#1a1a2e]">
                      {r.ciudad}
                    </span>
                    <span className="text-[11px] text-[#9ca3af]">· {r.dpto}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function AnticiposFormulario({
  onVolver,
  onLanzar,
  onLanzarOtro,
}: AnticiposFormularioProps) {
  const { toast } = useToast();
  const [paraOtro, setParaOtro] = useState(false);
  const [tipo, setTipo] = useState<AnticipoTipo | "">("");
  const [companiaId, setCompaniaId] = useState(SESSION_EMPLEADO.companiaDefault);
  const [companiaGastoOtro, setCompaniaGastoOtro] = useState("");
  const [proySel, setProySel] = useState<LovItem | null>(null);
  const [compBenef, setCompBenef] = useState<LovItem | null>(null);
  const [empOtro, setEmpOtro] = useState<EmpleadoAnticipo | null>(null);
  const [divisa, setDivisa] = useState("COP");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [fechaIda, setFechaIda] = useState("");
  const [fechaRegreso, setFechaRegreso] = useState("");
  const [selDest, setSelDest] = useState<DestinoSel | null>(null);
  const [tipoViaje, setTipoViaje] = useState<"nacional" | "internacional">(
    "nacional",
  );
  const [envioOpen, setEnvioOpen] = useState(false);
  const [resumenHtml, setResumenHtml] = useState("");

  const companiaDivisa = paraOtro ? companiaGastoOtro || companiaId : companiaId;
  const divisas =
    DIVISAS_POR_COMPANIA[companiaDivisa] || DIVISAS_POR_COMPANIA.HMVINGCO;
  const hoy = hoyIso();
  const empLogueado = useMemo(
    () =>
      EMPLEADOS_ANT.find((e) => e.id === fmtCedulaSinPuntos(EMP_DET.cedula)),
    [],
  );
  const companiasPropias = useMemo(
    () =>
      empLogueado?.companias ?? [
        {
          id: SESSION_EMPLEADO.companiaDefault,
          label:
            COMPANIAS.find((c) => c.id === SESSION_EMPLEADO.companiaDefault)
              ?.label ?? SESSION_EMPLEADO.companiaDefault,
        },
      ],
    [empLogueado],
  );
  const montoNum = useMemo(() => parseMontoInput(monto), [monto]);
  const directorProyecto = useMemo(
    () => getDirectorProyecto(proySel?.id),
    [proySel],
  );
  const empleadosOtro = compBenef ? getEmpleadosPorEmpresa(compBenef.id) : [];
  const showEmpOtroBenefRows = paraOtro && !!compBenef;
  const showEmpOtroDatos = showEmpOtroBenefRows && !!empOtro;
  const companiaGastoOtroOpciones = useMemo(() => {
    if (empOtro) return empOtro.companias;
    if (compBenef) {
      return [
        {
          id: compBenef.id,
          label: getCompaniaGastoLabel(compBenef.id),
        },
      ];
    }
    return [];
  }, [empOtro, compBenef]);

  const setTipoSol = (val: AnticipoTipo) => {
    setTipo(val);
    if (val === "Viaje") {
      setFechaIda("");
      setFechaRegreso("");
      setSelDest(null);
      setTipoViaje("nacional");
    }
  };

  const handleParaOtroChange = (otro: boolean) => {
    setParaOtro(otro);
    setProySel(null);
    setCompBenef(null);
    setEmpOtro(null);
    setCompaniaGastoOtro("");
  };

  const handleCompBenefChange = (item: LovItem | null) => {
    setCompBenef(item);
    setProySel(null);
    setEmpOtro(null);
    const compId = item?.id ?? "";
    setCompaniaGastoOtro(compId);
    if (item) {
      setDivisa(DIVISAS_POR_COMPANIA[item.id]?.[0]?.code || "COP");
    }
  };

  const handleProyOtroChange = (item: LovItem | null) => {
    setProySel(item);
    setEmpOtro(null);
    setCompaniaGastoOtro(compBenef?.id ?? "");
  };

  const handleEmpOtroChange = (item: LovItem | null) => {
    const emp = EMPLEADOS_ANT.find((e) => e.id === item?.id) || null;
    setEmpOtro(emp);
    const compId = emp?.empresa ?? compBenef?.id ?? "";
    setCompaniaGastoOtro(compId);
    if (compId) {
      setDivisa(DIVISAS_POR_COMPANIA[compId]?.[0]?.code || "COP");
    }
  };

  const handleCompaniaPropiaChange = (id: string) => {
    setCompaniaId(id);
    setProySel(null);
    setDivisa(DIVISAS_POR_COMPANIA[id]?.[0]?.code || "COP");
  };

  const handleCompaniaGastoOtroChange = (id: string) => {
    setCompaniaGastoOtro(id);
    setDivisa(DIVISAS_POR_COMPANIA[id]?.[0]?.code || "COP");
  };

  const handleDestinoChange = (dest: DestinoSel | null) => {
    setSelDest(dest);
    if (dest) {
      setTipoViaje(dest.pCode === "CO" ? "nacional" : "internacional");
    }
  };

  const validarYAbrirEnvio = () => {
    if (paraOtro) {
      if (!compBenef) {
        toast("Selecciona la empresa del empleado beneficiario", "danger");
        return;
      }
      if (!proySel) {
        toast("Selecciona un proyecto", "danger");
        return;
      }
      if (!empOtro) {
        toast("Selecciona un empleado", "danger");
        return;
      }
      if (!companiaGastoOtro) {
        toast("Selecciona la compañía que asume el gasto", "danger");
        return;
      }
    } else if (!proySel) {
      toast("Selecciona un proyecto", "danger");
      return;
    }

    if (montoNum <= 0) {
      toast("Ingresa un monto válido", "danger");
      return;
    }
    if (motivo.trim().length < 5) {
      toast("El motivo debe tener al menos 5 caracteres", "danger");
      return;
    }
    if (!tipo) {
      toast("Selecciona el tipo de solicitud", "danger");
      return;
    }
    if (tipo === "Viaje") {
      if (!fechaIda || !validarFechaIdaViaje(fechaIda)) {
        toast(
          "La fecha de salida requiere al menos 2 días hábiles de anticipación",
          "danger",
        );
        return;
      }
      if (!fechaRegreso || fechaRegreso < fechaIda) {
        toast("La fecha de regreso debe ser posterior a la salida", "danger");
        return;
      }
      if (!selDest) {
        toast("Selecciona un destino", "danger");
        return;
      }
    }

    const pre = PRE_MAP[divisa] || "$";
    let viajeDet = "";
    if (tipo === "Viaje" && selDest) {
      const tvColor =
        tipoViaje === "internacional"
          ? "background:#dbeafe;color:#1e40af"
          : "background:#dcfce7;color:#15803d";
      const tvLabel =
        tipoViaje === "internacional" ? "Internacional" : "Nacional";
      viajeDet = `<div class="mt-2 text-[12px] text-muted">${selDest.label} · ${isoToDmy(fechaIda)} → ${isoToDmy(fechaRegreso)}<span class="ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold" style="${tvColor}">${tvLabel}</span></div>`;
    }

    const compLabel = paraOtro
      ? empOtro!.companias.find((c) => c.id === companiaGastoOtro)?.label ||
        companiaGastoOtro
      : companiasPropias.find((c) => c.id === companiaId)?.label || companiaId;
    const empLabel = paraOtro
      ? `${empOtro!.nombre} (${empOtro!.id})`
      : "mí";
    const empCoLabel = paraOtro
      ? `${compBenef!.id} – ${compBenef!.nombre}`
      : EMP_DET.empresa.split("–")[0].trim();

    setResumenHtml(`
      <div class="mb-4 rounded-lg border border-border bg-[#f8fafc] p-4">
        <div class="text-[11px] font-semibold uppercase tracking-wide text-muted">Monto solicitado</div>
        <div class="mt-1 flex flex-wrap items-baseline gap-3">
          <span class="text-[28px] font-bold leading-none text-navy">${pre} ${montoNum.toLocaleString("es-CO")}</span>
          <span class="rounded-full bg-[#eef3f9] px-2.5 py-1 text-[11.5px] font-semibold text-navy">${tipo}</span>
        </div>
        ${viajeDet}
      </div>
      <div class="mb-4">
        <div class="text-[11px] font-semibold uppercase text-muted">Motivo</div>
        <p class="mt-1 text-[13px] leading-relaxed text-[#374151]">${motivo.trim()}</p>
      </div>
      <div class="space-y-2 text-[12.5px]">
        <div class="flex justify-between gap-4"><span class="text-muted">Para</span><span class="font-medium">${empLabel}</span></div>
        <div class="flex justify-between gap-4"><span class="text-muted">Proyecto</span><span class="font-medium">${proySel!.id}</span></div>
        <div class="flex justify-between gap-4"><span class="text-muted">Director de proyecto</span><span class="font-medium">${directorProyecto ? `${directorProyecto.nombre} (${directorProyecto.codigo})` : "—"}</span></div>
        <div class="flex justify-between gap-4"><span class="text-muted">Compañía que asume el gasto</span><span class="font-medium">${compLabel.split("–")[0].trim()}</span></div>
        <div class="flex justify-between gap-4"><span class="text-muted">Empresa del empleado</span><span class="font-medium">${empCoLabel}</span></div>
      </div>
    `);
    setEnvioOpen(true);
  };

  const ejecutarEnvio = () => {
    setEnvioOpen(false);
    const compLabel = paraOtro
      ? empOtro!.companias.find((c) => c.id === companiaGastoOtro)?.label ||
        companiaGastoOtro
      : companiasPropias.find((c) => c.id === companiaId)?.label || companiaId;
    const proy = PROYECTOS_ANT.find((p) => p.id === proySel!.id)!;

    const input: LanzarAnticipoInput = {
      tipo: tipo as AnticipoTipo,
      proyId: proy.id,
      proyN: proy.nombre,
      monto: montoNum,
      div: divisa,
      motivo: motivo.trim(),
      compania: compLabel,
      empCompania: paraOtro
        ? `${compBenef!.id} – ${compBenef!.nombre}`
        : EMP_DET.empresa,
      paraOtro,
      beneficiarioId: paraOtro ? empOtro!.id : undefined,
      beneficiarioNombre: paraOtro ? empOtro!.nombre : undefined,
      beneficiarioCedula: paraOtro ? empOtro!.id : undefined,
      fechaIda: tipo === "Viaje" ? isoToDmy(fechaIda) : undefined,
      fechaRegreso: tipo === "Viaje" ? isoToDmy(fechaRegreso) : undefined,
      destino: tipo === "Viaje" ? selDest?.label : undefined,
      tipoViaje,
    };

    if (paraOtro) {
      onLanzar(input);
      onLanzarOtro(empOtro!.nombre);
      onVolver();
      return;
    }

    const no = onLanzar(input);
    if (!no) return;

    toast(
      `Solicitud ${no} enviada — notificamos al director de proyecto`,
      "green",
    );
    onVolver();
  };

  return (
    <>
      <div className="content-standard">
        <PortalSubpageHeader
          parentLabel="Anticipos"
          onVolver={onVolver}
          title="Solicitar anticipo"
        />

        <Card className="mb-3 overflow-visible">
          <CardBody className="py-4">
            <FormSection icon="send" title="Solicitud para">
              <FormGrid>
                <div className="flex w-fit min-w-0 flex-col gap-1.5">
                  <span
                    className="text-[12px] font-semibold text-transparent select-none"
                    aria-hidden
                  >
                    &nbsp;
                  </span>
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
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-[#374151]">
                    Fecha de solicitud
                  </span>
                  <span className="flex h-9 items-center text-[13px] text-muted">
                    {hoyDMY()}
                  </span>
                </div>
              </FormGrid>
            </FormSection>
          </CardBody>
        </Card>

        <Card className="mb-3 overflow-visible">
          <CardBody className="py-4">
            <FormSection icon="userCircle" title="Empleado beneficiario">
              {paraOtro ? (
                <>
                  <FormHint>
                    <strong>
                      Estás solicitando este anticipo a nombre de otra persona.
                    </strong>{" "}
                    Tú figurarás como solicitante; el dinero se acreditará a la
                    cuenta del empleado destinatario.
                  </FormHint>
                  <FormGrid className="mt-3">
                    <Field label="Empresa del empleado beneficiario">
                      <LovPicker
                        value={compBenef}
                        onChange={handleCompBenefChange}
                        items={COMPANIAS_HMV}
                        placeholder="Seleccionar empresa"
                        searchPlaceholder="Buscar empresa o país..."
                      />
                    </Field>
                  </FormGrid>
                  {showEmpOtroBenefRows && (
                    <>
                      <FormGrid className="mt-3">
                        <Field label="Proyecto asociado" required>
                          <LovPicker
                            value={proySel}
                            onChange={handleProyOtroChange}
                            items={PROYECTOS_LOV}
                            placeholder="Seleccionar proyecto"
                          />
                        </Field>
                        <Field label="Aprobador">
                          <RoInput
                            value={
                              directorProyecto
                                ? `${directorProyecto.nombre} (${directorProyecto.codigo})`
                                : ""
                            }
                          />
                        </Field>
                        <Field label="Compañía que asume el gasto">
                          <SelectControl
                            value={companiaGastoOtro}
                            onChange={(e) =>
                              handleCompaniaGastoOtroChange(e.target.value)
                            }
                            className="ant-field-input"
                          >
                            {companiaGastoOtroOpciones.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                          </SelectControl>
                        </Field>
                      </FormGrid>
                      <FormGrid className="mt-3">
                        <Field label="Cédula">
                          <LovPicker
                            value={
                              empOtro
                                ? {
                                    id: empOtro.id,
                                    nombre: empOtro.nombre,
                                    sub: empOtro.sub,
                                  }
                                : null
                            }
                            onChange={handleEmpOtroChange}
                            items={empleadosOtro}
                            placeholder="Seleccionar"
                            searchPlaceholder="Buscar por cédula o nombre..."
                            valueLabel={(it) => fmtCedulaSinPuntos(it.id)}
                          />
                        </Field>
                        <Field label="Nombre">
                          <RoInput value={empOtro?.nombre || ""} />
                        </Field>
                        <Field label="Cuenta">
                          <RoInput
                            value={empOtro ? maskCuenta(empOtro.cuenta) : ""}
                          />
                        </Field>
                      </FormGrid>
                    </>
                  )}
                </>
              ) : (
                <>
                  <FormGrid>
                    <Field label="Proyecto asociado" required>
                      <LovPicker
                        value={proySel}
                        onChange={setProySel}
                        items={PROYECTOS_LOV}
                        placeholder="Seleccionar proyecto"
                      />
                    </Field>
                    <Field label="Aprobador">
                      <RoInput
                        value={
                          directorProyecto
                            ? `${directorProyecto.nombre} (${directorProyecto.codigo})`
                            : ""
                        }
                      />
                    </Field>
                    <Field label="Compañía que asume el gasto">
                      <SelectControl
                        value={companiaId}
                        onChange={(e) =>
                          handleCompaniaPropiaChange(e.target.value)
                        }
                        className="ant-field-input"
                      >
                        {companiasPropias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </SelectControl>
                    </Field>
                  </FormGrid>
                  <FormGrid className="mt-3">
                    <Field label="Cédula">
                      <RoInput value={fmtCedulaSinPuntos(EMP_DET.cedula)} />
                    </Field>
                    <Field label="Nombre">
                      <RoInput value={EMP_DET.nombre} />
                    </Field>
                    <Field label="Cuenta">
                      <RoInput value={maskCuenta(EMP_DET.cuenta)} />
                    </Field>
                  </FormGrid>
                </>
              )}
            </FormSection>
          </CardBody>
        </Card>

        <Card className="mb-3 overflow-visible">
          <CardBody className="py-4">
            <FormSection
              icon="wallet"
              title="Tipo y monto de la solicitud"
              hint={
                tipo === "Gasto" ? (
                  <FormNote>
                    Las solicitudes se procesan en{" "}
                    <strong>2 días hábiles</strong> desde su aprobación.
                  </FormNote>
                ) : tipo === "Viaje" ? (
                  <FormNote>
                    Solicita con al menos <strong>2 días hábiles</strong> antes de
                    la fecha de inicio del viaje.
                  </FormNote>
                ) : undefined
              }
            >
              <FormGrid>
                <div className="w-fit min-w-0">
                  <p className="mb-1.5 text-[12px] font-semibold text-[#374151]">
                    Tipo de solicitud
                  </p>
                  <SegmentedControl
                    aria-label="Tipo de solicitud"
                    value={tipo}
                    onChange={(v) => setTipoSol(v)}
                    options={TIPO_ANTICIPO_SEGMENTED_OPTIONS}
                  />
                </div>
                <Field label="Divisa" required>
                  <SelectControl
                    value={divisa}
                    onChange={(e) => setDivisa(e.target.value)}
                    className="ant-field-input"
                  >
                    {divisas.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.label}
                      </option>
                    ))}
                  </SelectControl>
                </Field>
                <Field label="Monto" required>
                  <div className="flex h-9 w-full overflow-hidden rounded-[5px] border border-border bg-white focus-within:border-navy">
                    <span className="flex min-w-[34px] items-center justify-center border-r border-border bg-[#f3f4f6] px-2 text-[13px] font-medium text-muted">
                      {PRE_MAP[divisa] || "$"}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={monto}
                      onChange={(e) =>
                        setMonto(e.target.value.replace(/[^\d.,]/g, ""))
                      }
                      onFocus={() => setMonto(monto.replace(/[.,]/g, ""))}
                      onBlur={() => setMonto(fmtMontoInput(monto))}
                      placeholder="0"
                      className="min-w-0 flex-1 border-0 px-2 text-[13px] outline-none"
                    />
                  </div>
                </Field>
              </FormGrid>

              {tipo === "Viaje" && (
                <FormGrid className="mt-3">
                  <Field label="Fecha salida" required>
                    <DateInput
                      min={hoy}
                      value={fechaIda}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!next) {
                          setFechaIda("");
                          return;
                        }
                        if (next < hoy) return;
                        setFechaIda(next);
                        if (
                          fechaRegreso &&
                          next &&
                          fechaRegreso < next
                        ) {
                          setFechaRegreso(next);
                        }
                      }}
                      className="ant-field-input"
                    />
                  </Field>
                  <Field label="Fecha regreso" required>
                    <DateInput
                      min={fechaIda && fechaIda > hoy ? fechaIda : hoy}
                      value={fechaRegreso}
                      onChange={(e) => setFechaRegreso(e.target.value)}
                      className="ant-field-input"
                    />
                  </Field>
                  <Field label="Destino" required>
                    <DestinoPicker
                      value={selDest}
                      onChange={handleDestinoChange}
                    />
                  </Field>
                </FormGrid>
              )}

              <FormGrid className="mt-3">
                <Field label="Motivo" required>
                  <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Describe el propósito del anticipo..."
                    rows={3}
                    className="ant-form-textarea w-full resize-none px-3 py-2 text-[13px] leading-relaxed focus:border-navy focus:outline-none"
                  />
                </Field>
              </FormGrid>
            </FormSection>
          </CardBody>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-5 py-3.5">
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <Icon name="info" size="xs" className="text-muted" />
              El director de proyecto aprueba esta solicitud.
            </span>
            <div className="flex gap-2.5">
              <Button variant="tertiary" onClick={onVolver}>
                Descartar
              </Button>
              <Button variant="success" onClick={validarYAbrirEnvio}>
                <Icon name="send" size="xs" />
                Enviar a Aprobación
              </Button>
            </div>
          </div>
      </div>

      <EnviarAnticipoModal
        open={envioOpen}
        resumenHtml={resumenHtml}
        onClose={() => setEnvioOpen(false)}
        onConfirm={ejecutarEnvio}
      />
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
