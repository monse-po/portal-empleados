"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardBody } from "@/src/components/ui/Card";
import { DateInput } from "@/src/components/ui/DateInput";
import { Field } from "@/src/components/ui/Field";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import { LovPicker } from "@/src/components/ui/LovPicker";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
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
  EMPLEADOS_ANT,
  fmtMontoInput,
  getEmpleadosPorEmpresa,
  parseMontoInput,
  type DestinoSel,
  type EmpleadoAnticipo,
} from "@/src/lib/anticipos-catalog";
import {
  flattenLocalDestinos,
  type DivisaOption,
} from "@/src/lib/anticipos-ifs-catalog";
import {
  hoyDMY,
  hoyIso,
  isoToDmy,
  validarFechaIdaViaje,
  type AnticipoTipo,
  type LovItem,
} from "@/src/lib/anticipos-registro";
import type { PortalUserProfile } from "@/src/lib/portal-user-profile";
import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";
import {
  fetchAnticiposCompanyBundleAction,
  fetchAnticiposFormBootstrapAction,
  fetchDestinosAnticipoAction,
  resolveAnticipoAprobadorAction,
  type AnticiposProyectoOption,
} from "@/src/server/anticipos-catalog-actions";
type AnticiposFormularioProps = {
  onVolver: () => void;
  onLanzar: (input: LanzarAnticipoInput) => Promise<string | null>;
  onLanzarOtro: (beneficiario: string) => void;
};

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

function destKey(dest: DestinoSel): string {
  return `${dest.pCode}|${dest.dpto}|${dest.ciudad}`;
}

function DestinoPicker({
  value,
  onChange,
  destinos,
  loading,
}: {
  value: DestinoSel | null;
  onChange: (dest: DestinoSel | null) => void;
  destinos: DestinoSel[];
  loading?: boolean;
}) {
  return (
    <SearchableSelect
      value={value ? destKey(value) : ""}
      onChange={(key) =>
        onChange(destinos.find((dest) => destKey(dest) === key) ?? null)
      }
      options={destinos.map((dest) => ({
        value: destKey(dest),
        label: dest.label,
        hint: dest.ciudad,
      }))}
      placeholder={loading ? "Cargando datos…" : "Seleccionar destino…"}
      searchPlaceholder="Buscar ciudad, departamento o país…"
      disabled={loading}
    />
  );
}

export function AnticiposFormulario({
  onVolver,
  onLanzar,
  onLanzarOtro,
}: AnticiposFormularioProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<PortalUserProfile | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [proyectos, setProyectos] = useState<AnticiposProyectoOption[]>([]);
  const [companiasGastoIfs, setCompaniasGastoIfs] = useState<
    { id: string; label: string }[]
  >([]);
  const [empNoIfs, setEmpNoIfs] = useState("");
  const [empNameIfs, setEmpNameIfs] = useState("");
  const [personIdIfs, setPersonIdIfs] = useState("");
  const [supplierIdIfs, setSupplierIdIfs] = useState("");
  const [cuentaLabel, setCuentaLabel] = useState("");
  /** PersonId/Identity del gerente (lo que IFS espera en ProjectManager). */
  const [aprobadorCode, setAprobadorCode] = useState<string | null>(null);
  /** Nombre legible del gerente (solo UI). */
  const [aprobadorIfs, setAprobadorIfs] = useState<string | null>(null);
  const [aprobadorLoading, setAprobadorLoading] = useState(false);
  const [paraOtro, setParaOtro] = useState(false);
  const [tipo, setTipo] = useState<AnticipoTipo | "">("");
  const [companiaId, setCompaniaId] = useState("");
  const [companiaGastoOtro, setCompaniaGastoOtro] = useState("");
  const [proySel, setProySel] = useState<LovItem | null>(null);
  const [compBenef, setCompBenef] = useState<LovItem | null>(null);
  const [empOtro, setEmpOtro] = useState<EmpleadoAnticipo | null>(null);
  const [divisa, setDivisa] = useState("COP");
  const [divisas, setDivisas] = useState<DivisaOption[]>([]);
  const [destinos, setDestinos] = useState<DestinoSel[]>([]);
  const [destinosLoading, setDestinosLoading] = useState(false);
  const [destinosFetched, setDestinosFetched] = useState(false);
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

  const applyCompanyBundle = (bundle: {
    proyectos: AnticiposProyectoOption[];
    divisas: DivisaOption[];
    cuentaLabel: string;
  }) => {
    setProyectos(bundle.proyectos);
    setDivisas(bundle.divisas);
    setCuentaLabel(bundle.cuentaLabel);
    setDivisa((prev) => {
      if (bundle.divisas.some((d) => d.code === prev)) return prev;
      return bundle.divisas[0]?.code || "COP";
    });
  };

  /** Employee Advances: GetExpenseCompany + GetProjects + GetCurrencyCodes + GetBankDetails. */
  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    void fetchAnticiposFormBootstrapAction().then((result) => {
      if (cancelled) return;
      setCatalogLoading(false);
      if (!result.catalog) {
        setProyectos([]);
        setCatalogError(
          result.error ??
            "No se pudieron cargar los catálogos de Anticipos desde IFS.",
        );
        return;
      }
      const c = result.catalog;
      setEmpNoIfs(c.empNo);
      setEmpNameIfs(c.empName);
      setPersonIdIfs(c.personId || c.empNo);
      setSupplierIdIfs(c.supplierId || c.empNo);
      setCompaniaId(c.companyId);
      setCompaniasGastoIfs(c.companiasGasto);
      applyCompanyBundle(c);
      setProfile((prev) => ({
        email: prev?.email ?? "",
        name: c.empName || prev?.name || "",
        companyId: c.companyId,
        companyName: c.companyName,
        empNo: c.empNo,
        empleadoDbId: prev?.empleadoDbId || c.empNo.replace(/\D/g, "") || c.empNo,
        source: "ifs",
      }));
      void fetch("/api/auth/session")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data?.ok) return;
          const p = data as PortalUserProfile & { ok?: boolean };
          setProfile((prev) => ({
            ...p,
            companyId: prev?.companyId || p.companyId,
            companyName: prev?.companyName || p.companyName,
            empNo: prev?.empNo || p.empNo,
            name: prev?.name || p.name,
          }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Destinos solo cuando el tipo es Viaje (evita 100+ llamadas IFS al abrir). */
  useEffect(() => {
    if (tipo !== "Viaje") return;
    setDestinos(flattenLocalDestinos());
    if (destinosFetched) return;
    let cancelled = false;
    setDestinosLoading(true);
    void fetchDestinosAnticipoAction().then((result) => {
      if (cancelled) return;
      setDestinosLoading(false);
      setDestinosFetched(true);
      if (result.destinos.length) setDestinos(result.destinos);
    });
    return () => {
      cancelled = true;
    };
  }, [tipo, destinosFetched]);

  const proyectoById = useMemo(() => {
    const map = new Map<string, AnticiposProyectoOption>();
    for (const p of proyectos) map.set(p.id, p);
    return map;
  }, [proyectos]);

  const aprobadorLabel = useMemo(() => {
    if (!proySel) return "";
    if (aprobadorLoading) return "Cargando datos…";
    return aprobadorIfs || TIEMPO_UI_COPY.approverFallback;
  }, [proySel, aprobadorLoading, aprobadorIfs]);

  useEffect(() => {
    if (!proySel) {
      setAprobadorCode(null);
      setAprobadorIfs(null);
      setAprobadorLoading(false);
      return;
    }
    const entry = proyectoById.get(proySel.id);
    const managerCode = entry?.managerCode?.trim();
    if (!managerCode) {
      setAprobadorCode(null);
      setAprobadorIfs(null);
      setAprobadorLoading(false);
      return;
    }

    let cancelled = false;
    setAprobadorLoading(true);
    setAprobadorCode(managerCode);
    setAprobadorIfs(managerCode);
    void resolveAnticipoAprobadorAction({
      managerCode,
      companyId: entry?.companyId || companiaId,
    }).then((result) => {
      if (cancelled) return;
      setAprobadorLoading(false);
      // UI: nombre; IFS: managerCode (PersonId)
      setAprobadorIfs(result.aprobador || managerCode);
    });
    return () => {
      cancelled = true;
    };
  }, [proySel, proyectoById, companiaId]);

  const divisaOpt = useMemo(
    () => divisas.find((d) => d.code === divisa) ?? null,
    [divisas, divisa],
  );
  const divisaPre = divisaOpt?.pre || "$";
  const divisaDecimals = divisaOpt?.decimals ?? null;
  const hoy = hoyIso();
  const empLogueado = useMemo(
    () =>
      profile
        ? EMPLEADOS_ANT.find((e) => e.id === profile.empleadoDbId.replace(/\D/g, ""))
        : undefined,
    [profile],
  );
  const companiasPropias = useMemo(() => {
    if (companiasGastoIfs.length) return companiasGastoIfs;
    if (profile?.companyId) {
      const label =
        COMPANIAS.find((c) => c.id === profile.companyId)?.label ??
        profile.companyName ??
        profile.companyId;
      return [{ id: profile.companyId, label }];
    }
    return (
      empLogueado?.companias ?? [
        {
          id: companiaId || "HMVINGCO",
          label:
            COMPANIAS.find((c) => c.id === (companiaId || "HMVINGCO"))?.label ??
            companiaId,
        },
      ]
    );
  }, [companiasGastoIfs, profile, empLogueado, companiaId]);
  const montoNum = useMemo(
    () => parseMontoInput(monto, divisaDecimals),
    [monto, divisaDecimals],
  );

  useEffect(() => {
    if (!monto.trim()) return;
    setMonto((prev) => fmtMontoInput(prev, divisaDecimals));
  }, [divisa, divisaDecimals]);
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
    setCompaniaGastoOtro(item?.id ?? "");
  };

  const handleProyOtroChange = (item: LovItem | null) => {
    setProySel(item);
    setEmpOtro(null);
    setCompaniaGastoOtro(compBenef?.id ?? "");
  };

  const proyectoOptions = useMemo(
    () =>
      proyectos.map((p) => ({
        value: p.id,
        label: `${p.id} – ${p.nombre}`,
      })),
    [proyectos],
  );

  const handleProyectoIdChange = (id: string) => {
    const p = proyectos.find((x) => x.id === id);
    const item: LovItem | null = p
      ? { id: p.id, nombre: p.nombre, sub: p.companyId }
      : null;
    if (paraOtro) {
      handleProyOtroChange(item);
      return;
    }
    setProySel(item);
  };

  const reloadCompanyBundle = (company: string) => {
    if (!company) return;
    setCatalogLoading(true);
    setProySel(null);
    void fetchAnticiposCompanyBundleAction(company, empNoIfs).then((result) => {
      setCatalogLoading(false);
      applyCompanyBundle(result);
      if (result.error && !result.proyectos.length) {
        setCatalogError(result.error);
      }
    });
  };

  const handleEmpOtroChange = (item: LovItem | null) => {
    const emp = EMPLEADOS_ANT.find((e) => e.id === item?.id) || null;
    setEmpOtro(emp);
    setCompaniaGastoOtro(emp?.empresa ?? compBenef?.id ?? "");
  };

  const handleCompaniaPropiaChange = (id: string) => {
    setCompaniaId(id);
    setProySel(null);
    reloadCompanyBundle(id);
  };

  const handleCompaniaGastoOtroChange = (id: string) => {
    setCompaniaGastoOtro(id);
    reloadCompanyBundle(id);
  };

  const handleDestinoChange = (dest: DestinoSel | null) => {
    setSelDest(dest);
    if (dest) {
      const code = dest.pCode.toUpperCase();
      setTipoViaje(
        code === "CO" || code === "COL" ? "nacional" : "internacional",
      );
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

    const pre = divisaPre;
    let viajeDet = "";
    if (tipo === "Viaje" && selDest) {
      const tvColor =
        tipoViaje === "internacional"
          ? "background:#dbeafe;color:#1e40af"
          : "background:var(--green-soft);color:var(--green)";
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
      : profile?.companyName ?? profile?.companyId ?? companiaId;

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
        <div class="flex justify-between gap-4"><span class="text-muted">Director de proyecto</span><span class="font-medium">${aprobadorLabel || "—"}</span></div>
        <div class="flex justify-between gap-4"><span class="text-muted">Compañía que asume el gasto</span><span class="font-medium">${compLabel.split("–")[0].trim()}</span></div>
        <div class="flex justify-between gap-4"><span class="text-muted">Empresa del empleado</span><span class="font-medium">${empCoLabel}</span></div>
      </div>
    `);
    setEnvioOpen(true);
  };

  const ejecutarEnvio = async () => {
    setEnvioOpen(false);
    const compLabel = paraOtro
      ? empOtro!.companias.find((c) => c.id === companiaGastoOtro)?.label ||
        companiaGastoOtro
      : companiasPropias.find((c) => c.id === companiaId)?.label || companiaId;

    // IFS ProjectManager = PersonId del gerente (no el nombre legible).
    const aprobadorParaGuardar = aprobadorCode?.trim() || undefined;
    const companyCode = paraOtro ? companiaGastoOtro : companiaId;
    const destinoCodigo =
      tipo === "Viaje"
        ? (() => {
            const city = selDest?.ciudad?.trim() || "";
            if (city && city.length <= 20) return city;
            const code = selDest?.pCode?.trim() || "";
            if (code && code.length <= 20) return code;
            return selDest?.label?.slice(0, 20);
          })()
        : undefined;

    const input: LanzarAnticipoInput = {
      tipo: tipo as AnticipoTipo,
      proyId: proySel!.id,
      proyN: proySel!.nombre,
      monto: montoNum,
      div: divisa,
      motivo: motivo.trim(),
      compania: compLabel,
      empCompania: paraOtro
        ? `${compBenef!.id} – ${compBenef!.nombre}`
        : profile?.companyName ?? profile?.companyId ?? companiaId,
      companyId: companyCode,
      invCompanyId: companyCode,
      createdBy: personIdIfs || empNoIfs || undefined,
      beneficiarioEmpNo: paraOtro
        ? empOtro!.empNo || empOtro!.id
        : empNoIfs || undefined,
      beneficiarioSupplierId: paraOtro
        ? empOtro!.supplierId || empOtro!.empNo || empOtro!.id
        : supplierIdIfs || empNoIfs || undefined,
      aprobador: aprobadorParaGuardar,
      paraOtro,
      beneficiarioId: paraOtro ? empOtro!.id : undefined,
      beneficiarioNombre: paraOtro ? empOtro!.nombre : undefined,
      beneficiarioCedula: paraOtro ? empOtro!.id : undefined,
      fechaIda: tipo === "Viaje" ? isoToDmy(fechaIda) : undefined,
      fechaRegreso: tipo === "Viaje" ? isoToDmy(fechaRegreso) : undefined,
      destino: tipo === "Viaje" ? selDest?.label : undefined,
      destinoCodigo,
      tipoViaje,
    };

    const codigo = await onLanzar(input);
    if (!codigo) return;
    if (paraOtro) {
      onLanzarOtro(empOtro!.nombre);
      return;
    }
    toast(`Solicitud ${codigo} lanzada`, "green");
    onVolver();
  };

  const empleadoNombre = empNameIfs || profile?.name || "—";
  const empleadoIdDisplay =
    empNoIfs || profile?.empNo || profile?.empleadoDbId || "—";

  return (
    <>
      <div className="content-standard">
        <PortalSubpageHeader
          parentLabel="Anticipos"
          onVolver={onVolver}
          title="Nuevo anticipo"
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
              {catalogError && (
                <FormHint>
                  <strong>Proyectos IFS:</strong> {catalogError}
                </FormHint>
              )}
              {!catalogLoading && !catalogError && proyectos.length === 0 && (
                <FormHint>
                  IFS no devolvió proyectos asociados a tu empleado. Revisa
                  GetValidEmpPrjAct en /dev/ifs.
                </FormHint>
              )}
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
                          <SearchableSelect
                            value={proySel?.id ?? ""}
                            onChange={handleProyectoIdChange}
                            options={proyectoOptions}
                            placeholder={
                              catalogLoading
                                ? "Cargando datos…"
                                : TIEMPO_UI_COPY.selectProject
                            }
                            searchPlaceholder={TIEMPO_UI_COPY.searchProject}
                            disabled={
                              catalogLoading || proyectos.length === 0
                            }
                          />
                        </Field>
                        <Field label="Aprobador">
                          <RoInput value={aprobadorLabel} />
                        </Field>
                        <Field label="Compañía que asume el gasto">
                          <SearchableSelect
                            value={companiaGastoOtro}
                            onChange={handleCompaniaGastoOtroChange}
                            options={companiaGastoOtroOpciones.map((c) => ({
                              value: c.id,
                              label: c.label,
                            }))}
                            placeholder="Seleccionar compañía…"
                            searchPlaceholder="Buscar compañía…"
                          />
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
                      <SearchableSelect
                        value={proySel?.id ?? ""}
                        onChange={handleProyectoIdChange}
                        options={proyectoOptions}
                        placeholder={
                          catalogLoading
                            ? "Cargando datos…"
                            : TIEMPO_UI_COPY.selectProject
                        }
                        searchPlaceholder={TIEMPO_UI_COPY.searchProject}
                        disabled={catalogLoading || proyectos.length === 0}
                      />
                    </Field>
                    <Field label="Aprobador">
                      <RoInput value={aprobadorLabel} />
                    </Field>
                    <Field label="Compañía que asume el gasto">
                      <SearchableSelect
                        value={companiaId}
                        onChange={handleCompaniaPropiaChange}
                        options={companiasPropias.map((c) => ({
                          value: c.id,
                          label: c.label,
                        }))}
                        placeholder="Seleccionar compañía…"
                        searchPlaceholder="Buscar compañía…"
                      />
                    </Field>
                  </FormGrid>
                  <FormGrid className="mt-3">
                    <Field label="Identificador">
                      <RoInput value={empleadoIdDisplay} />
                    </Field>
                    <Field label="Nombre">
                      <RoInput value={empleadoNombre} />
                    </Field>
                    <Field label="Cuenta">
                      <RoInput
                        value={
                          catalogLoading
                            ? "Cargando datos…"
                            : cuentaLabel || "Sin cuenta en IFS"
                        }
                      />
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
                  <SearchableSelect
                    value={divisa}
                    onChange={setDivisa}
                    options={divisas.map((d) => ({
                      value: d.code,
                      label: d.label,
                    }))}
                    placeholder="Seleccionar divisa…"
                    searchPlaceholder="Buscar divisa…"
                  />
                </Field>
                <Field label="Monto" required>
                  <div className="flex h-9 w-full overflow-hidden rounded-[5px] border border-border bg-white focus-within:border-navy">
                    <span className="flex min-w-[34px] items-center justify-center border-r border-border bg-[#f3f4f6] px-2 text-[13px] font-medium text-muted">
                      {divisaPre}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={monto}
                      onChange={(e) =>
                        setMonto(e.target.value.replace(/[^\d.,]/g, ""))
                      }
                      onFocus={() => {
                        const n = parseMontoInput(monto, divisaDecimals);
                        if (!(n > 0)) {
                          setMonto("");
                          return;
                        }
                        if (divisaDecimals == null) {
                          setMonto(String(n));
                          return;
                        }
                        setMonto(n.toFixed(divisaDecimals));
                      }}
                      onBlur={() =>
                        setMonto(fmtMontoInput(monto, divisaDecimals))
                      }
                      placeholder="0"
                      title={
                        divisaOpt?.roundingFromIfs && divisaDecimals != null
                          ? `Decimales según IFS CurrencyRounding: ${divisaDecimals}`
                          : "Formato de decimales según configuración IFS de la divisa (cuando hay permiso)"
                      }
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
                        if (fechaRegreso && next && fechaRegreso < next) {
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
                      destinos={destinos}
                      loading={destinosLoading}
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
