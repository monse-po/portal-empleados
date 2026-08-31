"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { DateInput } from "@/src/components/ui/DateInput";
import { Field } from "@/src/components/ui/Field";
import { Icon } from "@/src/components/ui/Icon";
import { LovPicker } from "@/src/components/ui/LovPicker";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import { SelectControl } from "@/src/components/ui/DropdownAffordance";
import {
  FormGrid,
  FormHint,
  FormNote,
  FormSection,
  FormStack,
  SolicitudFormCard,
  SolicitudFormFooter,
} from "@/src/components/ui/SolicitudFormLayout";
import {
  TIPO_ANTICIPO_SEGMENTED_OPTIONS,
} from "@/src/components/ui/TipoAnticipoPill";
import { SegmentedControl } from "@/src/components/ui/SegmentedControl";
import { useToast } from "@/src/components/ui/Toast";
import { EnviarAnticipoModal } from "@/src/app/mis-anticipos/AnticiposModals";
import { useAnticiposIfsCatalog } from "@/src/app/mis-anticipos/useAnticiposIfsCatalog";
import type { LanzarAnticipoInput } from "@/src/app/mis-anticipos/AnticiposContext";
import type { AnticiposDivisaOption } from "@/src/lib/ifs/anticipos-catalog";
import {
  COMPANIAS,
  COMPANIAS_HMV,
  DIVISAS_POR_COMPANIA,
  EMP_DET,
  EMPLEADOS_ANT,
  fmtMontoInput,
  getDirectorProyecto,
  getEmpleadosOtroPorEmpresa,
  hoyDMY,
  hoyIso,
  isoToDmy,
  parseMontoInput,
  PRE_MAP,
  PROYECTOS_ANT,
  searchDestinos,
  SESSION_EMPLEADO,
  type AnticipoTipo,
  type DestinoSel,
  type EmpleadoAnticipo,
  type LovItem,
} from "@/src/lib/mis-anticipos-mock";

type AnticiposFormularioProps = {
  onVolver: () => void;
  onLanzar: (
    input: LanzarAnticipoInput,
  ) => Promise<{ no: string | null; error?: string }>;
  onLanzarOtro: (beneficiario: string) => void;
  inicial?: { tipo?: AnticipoTipo; proyId?: string };
};

const PROYECTOS_LOV: LovItem[] = PROYECTOS_ANT.map((p) => ({
  id: p.id,
  nombre: p.nombre,
  sub: p.sub,
}));

const SESSION_EMP_ID = SESSION_EMPLEADO.cedula.replace(/\./g, "");

function RoInput({ value }: { value: string }) {
  return (
    <input
      readOnly
      value={value}
      title={value || undefined}
      className="ant-ro-input truncate"
    />
  );
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
          placeholder="Municipio, región o país…"
          title={q || undefined}
          autoComplete="off"
          className={`ant-field-input truncate !pl-[30px] ${error ? "!border-red" : ""}`}
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
                    key={`${r.pCode}-${r.dpto}-${r.ciudad}`}
                    type="button"
                    onClick={() => {
                      onChange(r);
                      setQ(r.label);
                      setOpen(false);
                    }}
                    className="flex w-full cursor-pointer items-start gap-2 px-3.5 py-[7px] text-left hover:bg-[#f5f7fa]"
                  >
                    <Icon
                      name="mapPin"
                      size="xs"
                      className="mt-0.5 shrink-0 text-navy"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-[#1a1a2e]">
                        {r.ciudad}
                      </span>
                      <span className="block truncate text-[11px] text-[#9ca3af]">
                        {r.dpto} · {r.pais}
                      </span>
                    </span>
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
  inicial,
}: AnticiposFormularioProps) {
  const { toast } = useToast();
  const ifsCat = useAnticiposIfsCatalog();
  const [paraOtro, setParaOtro] = useState(false);
  const [tipo, setTipo] = useState<AnticipoTipo | "">(inicial?.tipo ?? "");
  const [companiaId, setCompaniaId] = useState(SESSION_EMPLEADO.companiaDefault);
  const [companiaGastoOtro, setCompaniaGastoOtro] = useState("");
  const [proySel, setProySel] = useState<LovItem | null>(() => {
    if (!inicial?.proyId) return null;
    return PROYECTOS_LOV.find((p) => p.id === inicial.proyId) ?? null;
  });
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
  const [ifsEmployees, setIfsEmployees] = useState<EmpleadoAnticipo[]>([]);
  const [ifsProjects, setIfsProjects] = useState<LovItem[]>([]);
  const [ifsDivisas, setIfsDivisas] = useState<AnticiposDivisaOption[]>([]);
  const [ifsDirector, setIfsDirector] = useState<{
    codigo: string;
    nombre: string;
  } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const empresasLov =
    ifsCat.connected && ifsCat.companies.length > 0
      ? ifsCat.companies
      : COMPANIAS_HMV;

  const sessionEmpId = fmtCedulaSinPuntos(
    ifsCat.profile?.personId || SESSION_EMPLEADO.cedula,
  );
  const sessionEmpNo = ifsCat.profile?.empNo || "";

  const companiaDivisa = paraOtro ? companiaGastoOtro || companiaId : companiaId;
  const divisasMock =
    DIVISAS_POR_COMPANIA[companiaDivisa] || DIVISAS_POR_COMPANIA.HMVINGCO;
  const divisas = ifsDivisas.length > 0 ? ifsDivisas : divisasMock;
  const hoy = hoyIso();
  const empLogueado = useMemo(
    () =>
      EMPLEADOS_ANT.find((e) => e.id === fmtCedulaSinPuntos(EMP_DET.cedula)),
    [],
  );
  const companiasPropias = useMemo(() => {
    if (ifsCat.profile?.companiasGasto.length) {
      return ifsCat.profile.companiasGasto;
    }
    return (
      empLogueado?.companias ?? [
        {
          id: SESSION_EMPLEADO.companiaDefault,
          label:
            COMPANIAS.find((c) => c.id === SESSION_EMPLEADO.companiaDefault)
              ?.label ?? SESSION_EMPLEADO.companiaDefault,
        },
      ]
    );
  }, [empLogueado, ifsCat.profile]);
  const montoNum = useMemo(() => parseMontoInput(monto), [monto]);
  const directorMock = useMemo(
    () => getDirectorProyecto(proySel?.id),
    [proySel],
  );
  const directorProyecto = ifsDirector ?? directorMock;
  const showEmpOtroBenefRows = paraOtro && !!compBenef;
  const empleadosOtroLov = useMemo(() => {
    if (ifsCat.connected) {
      return ifsEmployees
        .filter((e) => {
          const id = fmtCedulaSinPuntos(e.id);
          const empNo = (e.empNo || "").replace(/\D/g, "");
          if (sessionEmpId && id === sessionEmpId) return false;
          if (sessionEmpNo && (empNo === sessionEmpNo.replace(/\D/g, "") || e.empNo === sessionEmpNo)) {
            return false;
          }
          return true;
        })
        .map((e) => ({ id: e.id, nombre: e.nombre, sub: e.sub }));
    }
    return compBenef
      ? getEmpleadosOtroPorEmpresa(compBenef.id, SESSION_EMP_ID)
      : [];
  }, [compBenef, ifsCat.connected, ifsEmployees, sessionEmpId, sessionEmpNo]);
  const proyectosLov = ifsCat.connected ? ifsProjects : PROYECTOS_LOV;
  const sessionCedula = ifsCat.profile?.personId
    ? fmtCedulaSinPuntos(ifsCat.profile.personId)
    : fmtCedulaSinPuntos(EMP_DET.cedula);
  const sessionNombre = ifsCat.profile?.empName || EMP_DET.nombre;
  const sessionCuenta = ifsCat.profile?.cuenta || EMP_DET.cuenta;
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

  useEffect(() => {
    if (!ifsCat.profile?.companyId) return;
    setCompaniaId((prev) => prev || ifsCat.profile!.companyId);
  }, [ifsCat.profile]);

  useEffect(() => {
    if (!ifsCat.connected) {
      setIfsProjects([]);
      setIfsDivisas([]);
      return;
    }
    const company = paraOtro
      ? compBenef?.id || companiaGastoOtro
      : companiaId;
    if (!company) {
      setIfsProjects([]);
      setIfsDivisas([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      ifsCat.loadProjects(company),
      ifsCat.loadCurrencies(company),
    ]).then(([projects, currencies]) => {
      if (cancelled) return;
      setIfsProjects(projects);
      setIfsDivisas(currencies);
      if (currencies.length) {
        setDivisa((prev) =>
          currencies.some((c) => c.code === prev) ? prev : currencies[0].code,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    ifsCat.connected,
    ifsCat.loadProjects,
    ifsCat.loadCurrencies,
    paraOtro,
    compBenef?.id,
    companiaGastoOtro,
    companiaId,
  ]);

  useEffect(() => {
    if (!ifsCat.connected || !compBenef?.id) {
      setIfsEmployees([]);
      return;
    }
    let cancelled = false;
    void ifsCat.loadEmployees(compBenef.id).then((employees) => {
      if (!cancelled) setIfsEmployees(employees);
    });
    return () => {
      cancelled = true;
    };
  }, [ifsCat.connected, ifsCat.loadEmployees, compBenef?.id]);

  useEffect(() => {
    if (!proySel?.id || !ifsCat.connected) {
      setIfsDirector(null);
      return;
    }
    let cancelled = false;
    void ifsCat.loadAprobador(proySel.id).then((dir) => {
      if (!cancelled) setIfsDirector(dir);
    });
    return () => {
      cancelled = true;
    };
  }, [ifsCat.connected, ifsCat.loadAprobador, proySel?.id]);

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
    const compId = item?.id ?? "";
    setCompaniaGastoOtro(compId);
    if (item) {
      setDivisa(DIVISAS_POR_COMPANIA[item.id]?.[0]?.code || "COP");
      setEmpOtro((prev) => {
        if (!prev) return null;
        const ok =
          prev.empresa === item.id ||
          prev.companias.some((c) => c.id === item.id);
        return ok ? prev : null;
      });
    } else {
      setEmpOtro(null);
    }
  };

  const handleProyOtroChange = (item: LovItem | null) => {
    setProySel(item);
    // No limpiar empOtro: el proyecto no invalida al beneficiario ya elegido.
    if (!companiaGastoOtro && compBenef?.id) {
      setCompaniaGastoOtro(compBenef.id);
    }
  };

  const handleEmpOtroChange = (item: LovItem | null) => {
    const emp =
      ifsEmployees.find((e) => e.id === item?.id) ||
      EMPLEADOS_ANT.find((e) => e.id === item?.id) ||
      null;
    setEmpOtro(emp);
    if (!emp) {
      setCompaniaGastoOtro(compBenef?.id ?? "");
      return;
    }
    const gastoId = emp.companias.some((c) => c.id === compBenef?.id)
      ? (compBenef?.id ?? emp.empresa)
      : emp.empresa;
    setCompaniaGastoOtro(gastoId);
    setDivisa(DIVISAS_POR_COMPANIA[gastoId]?.[0]?.code || "COP");
    setProySel((prev) => (prev && empOtro?.id === emp.id ? prev : null));

    const empNo = emp.empNo || emp.sub;
    const company = emp.empresa || compBenef?.id || "";
    if (ifsCat.connected && empNo && company) {
      void ifsCat.loadBank(company, empNo).then((bank) => {
        setEmpOtro((prev) =>
          prev && prev.id === emp.id
            ? { ...prev, banco: bank.banco, tipo: bank.tipo, cuenta: bank.cuenta }
            : prev,
        );
      });
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
    if (!ifsCat.connected) {
      toast(
        ifsCat.error ||
          "Sin sesión IFS. Inicia sesión para enviar el anticipo a Employee Advances.",
        "danger",
      );
      return;
    }
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
      if (!fechaIda) {
        toast("Indica la fecha de salida", "danger");
        return;
      }
      if (fechaIda < hoy) {
        toast("La fecha de salida no puede ser anterior a hoy", "danger");
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
      : ifsCat.profile?.companyName ||
        EMP_DET.empresa.split("–")[0].trim();

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

  const ejecutarEnvio = async () => {
    if (enviando) return;
    if (!ifsCat.connected) {
      toast(
        ifsCat.error ||
          "Sin conexión a IFS. Inicia sesión para enviar el anticipo a Employee Advances.",
        "danger",
      );
      return;
    }
    setEnviando(true);
    setEnvioOpen(false);
    const compLabel = paraOtro
      ? empOtro!.companias.find((c) => c.id === companiaGastoOtro)?.label ||
        companiaGastoOtro
      : companiasPropias.find((c) => c.id === companiaId)?.label || companiaId;
    const proyNombre =
      proySel!.nombre ||
      PROYECTOS_ANT.find((p) => p.id === proySel!.id)?.nombre ||
      proySel!.id;

    const companyId = paraOtro ? companiaGastoOtro : companiaId;
    const invCompanyId = paraOtro
      ? compBenef?.id
      : ifsCat.profile?.companyId || companyId;
    const input: LanzarAnticipoInput = {
      tipo: tipo as AnticipoTipo,
      proyId: proySel!.id,
      proyN: proyNombre,
      monto: montoNum,
      div: divisa,
      motivo: motivo.trim(),
      compania: compLabel,
      empCompania: paraOtro
        ? `${compBenef!.id} – ${compBenef!.nombre}`
        : ifsCat.profile
          ? `${ifsCat.profile.companyId} – ${ifsCat.profile.companyName}`
          : EMP_DET.empresa,
      companyId,
      invCompanyId,
      createdBy: ifsCat.profile?.personId,
      beneficiarioEmpNo: paraOtro
        ? empOtro?.empNo
        : ifsCat.profile?.empNo,
      beneficiarioSupplierId: paraOtro
        ? empOtro?.supplierId
        : ifsCat.profile?.supplierId,
      paraOtro,
      beneficiarioId: paraOtro ? empOtro!.id : undefined,
      beneficiarioNombre: paraOtro ? empOtro!.nombre : undefined,
      beneficiarioCedula: paraOtro ? empOtro!.id : undefined,
      beneficiarioCuenta: paraOtro ? empOtro?.cuenta : sessionCuenta,
      beneficiarioBanco: paraOtro
        ? empOtro?.banco
        : ifsCat.profile?.banco || EMP_DET.banco,
      beneficiarioTipoCuenta: paraOtro
        ? empOtro?.tipo
        : ifsCat.profile?.tipoCuenta || EMP_DET.tipoCuenta,
      aprobador: directorProyecto?.codigo || directorProyecto?.nombre,
      fechaIda: tipo === "Viaje" ? fechaIda : undefined,
      fechaRegreso: tipo === "Viaje" ? fechaRegreso : undefined,
      destino: tipo === "Viaje" ? selDest?.label : undefined,
      destinoCodigo:
        tipo === "Viaje" && selDest && selDest.ciudad.length <= 20
          ? selDest.ciudad
          : undefined,
      tipoViaje,
    };

    try {
      const result = await onLanzar(input);
      if (!result.no) {
        toast(result.error || "No se pudo registrar la solicitud en IFS", "danger");
        return;
      }
      if (paraOtro) {
        onLanzarOtro(empOtro!.nombre);
        onVolver();
        return;
      }
      toast(
        `Solicitud ${result.no} enviada — notificamos al director de proyecto`,
        "green",
      );
      onVolver();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div className="content-standard">
        <PortalSubpageHeader
          parentLabel="Mis Anticipos"
          onVolver={onVolver}
          title="Nueva solicitud"
        />
        {ifsCat.connected ? (
          <p className="mb-3 text-[11px] font-medium text-muted">
            Catálogos IFS · {ifsCat.profile?.empName || ifsCat.profile?.companyId}
          </p>
        ) : (
          <p className="mb-3 text-[11px] font-medium text-red">
            Sin sesión IFS — el envío no llega a Employee Advances.
            {ifsCat.error ? ` ${ifsCat.error}` : " Inicia sesión y recarga."}
          </p>
        )}

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
              <div className="ml-auto flex min-w-0 flex-col items-end gap-1.5">
                <span className="text-[12px] font-semibold text-[#374151]">
                  Fecha de solicitud
                </span>
                <span className="flex h-9 items-center text-[13px] text-muted">
                  {hoyDMY()}
                </span>
              </div>
            </div>
          </FormSection>
        </SolicitudFormCard>

        <SolicitudFormCard>
          <FormSection icon="userCircle" title="Empleado beneficiario">
            {paraOtro ? (
              <FormStack>
                <FormHint>
                  <strong>
                    Estás solicitando este anticipo a nombre de otra persona.
                  </strong>{" "}
                  Tú figurarás como solicitante; el dinero se acreditará a la
                  cuenta del empleado destinatario.
                </FormHint>
                <FormGrid>
                  <Field label="Empresa del empleado beneficiario" required>
                    <LovPicker
                      value={compBenef}
                      onChange={handleCompBenefChange}
                      items={empresasLov}
                      placeholder="Seleccionar empresa"
                      searchPlaceholder="Buscar empresa o país..."
                    />
                  </Field>
                  {compBenef ? (
                    <Field label="Empleado beneficiario" required>
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
                        items={empleadosOtroLov}
                        placeholder="Seleccionar empleado"
                        searchPlaceholder="Buscar por cédula o nombre…"
                        valueLabel={(it) => it.nombre}
                      />
                    </Field>
                  ) : null}
                </FormGrid>
                {empOtro ? (
                  <FormGrid>
                    <Field label="Cédula">
                      <RoInput value={fmtCedulaSinPuntos(empOtro.id)} />
                    </Field>
                    <Field label="Nombre">
                      <RoInput value={empOtro.nombre} />
                    </Field>
                    <Field label="Cuenta">
                      <RoInput value={maskCuenta(empOtro.cuenta)} />
                    </Field>
                  </FormGrid>
                ) : null}
                {showEmpOtroBenefRows ? (
                  <FormGrid>
                    <Field label="Proyecto asociado" required>
                      <LovPicker
                        value={proySel}
                        onChange={handleProyOtroChange}
                        items={proyectosLov}
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
                ) : null}
              </FormStack>
            ) : (
              <FormStack>
                <FormGrid>
                  <Field label="Proyecto asociado" required>
                    <LovPicker
                      value={proySel}
                      onChange={setProySel}
                      items={proyectosLov}
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
                <FormGrid>
                  <Field label="Cédula">
                    <RoInput value={sessionCedula} />
                  </Field>
                  <Field label="Nombre">
                    <RoInput value={sessionNombre} />
                  </Field>
                  <Field label="Cuenta">
                    <RoInput value={maskCuenta(sessionCuenta)} />
                  </Field>
                </FormGrid>
              </FormStack>
            )}
          </FormSection>
        </SolicitudFormCard>

        <SolicitudFormCard>
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
                  Se recomienda solicitar con al menos{" "}
                  <strong>2 días hábiles</strong> antes del viaje; también
                  puedes registrar salidas el mismo día.
                </FormNote>
              ) : undefined
            }
          >
            <FormStack>
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

              {tipo === "Viaje" ? (
                <FormGrid>
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
              ) : null}

              <FormGrid>
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
            </FormStack>
          </FormSection>
        </SolicitudFormCard>

        <SolicitudFormFooter note="El director de proyecto aprueba esta solicitud.">
          <Button variant="tertiary" onClick={onVolver}>
            Descartar
          </Button>
          <Button variant="success" onClick={validarYAbrirEnvio}>
            <Icon name="send" size="xs" />
            Enviar a Aprobación
          </Button>
        </SolicitudFormFooter>
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
        .ant-ro-input {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
