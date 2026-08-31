"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/Button";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { Field } from "@/src/components/ui/Field";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";
import { Icon } from "@/src/components/ui/Icon";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import { FechaDiaORangoInput } from "@/src/components/ui/DateRangePicker";
import { LoadingNotice } from "@/src/components/ui/LoadingNotice";
import { Modal } from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/Toast";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
import { eachIsoDateInclusive } from "@/src/lib/date-picker-utils";
import {
  findActividadMeta,
  resolveActividadId,
  resolveAprobadorLabel,
  resolveSubproyectoId,
  tipoCatFromOptions,
  type TiempoCatalog,
  type TiempoTipoHoraOption,
} from "@/src/lib/ifs/tiempo-catalog";
import {
  clampFechaMes,
  findRegistroById,
  formatFechaLegible,
  getHorasNormales,
  TIPO_HORA_CODIGO_DEFAULT,
  inferSubproyecto,
  resolveFechaMes,
  tipoCat,
  type MesActualBounds,
  type RegistroMock,
} from "@/src/lib/mi-tiempo-mock";
import {
  fetchProjectAprobadorAction,
  fetchScheduleHoursAction,
  fetchEmployeeScheduleAction,
  fetchTiempoCatalogAction,
  fetchTiposHoraAction,
} from "@/src/server/mi-tiempo-catalog-actions";
import { LOADING_COPY, loadingPlaceholder } from "@/src/lib/copy/loading";
import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";
import { formatIfsError } from "@/src/lib/ifs/errors";
import { getJornadaLimiteFromSistema } from "@/src/lib/tiempo-config";
import {
  atNormalLimit,
  fechasRegistroSegunTipo,
  filterTiposPorPrograma,
  formatHorasValor,
  formatHorasCampo,
  formatScheduleHoursLabel,
  getDiaSinJornadaKind,
  isDiaConJornadaNormal,
  isJornadaNormalCompleta,
  mensajeSoloExtrasJornadaCompleta,
  mensajeSoloExtrasSinJornada,
  normalLimitErrorMessage,
  horasInputFormatError,
  parseHorasInput,
  restantesNormalesMin,
  topeNormalesDelDia,
  type TipoHoraCat,
} from "@/src/lib/tiempo-schedule";
import { DiaSinJornadaBanner } from "@/src/app/hoja-tiempo/DiaSinJornadaBanner";

const FORM_ID = "registro-horas-form";

type FieldKey = "proy" | "sub" | "act" | "fecha" | "fechaHasta" | "tipo" | "horas";

type FormState = {
  proy: string;
  sub: string;
  act: string;
  fecha: string;
  /** Solo alta: fin del rango (incluido). En edición se ignora. */
  fechaHasta: string;
  tipo: string;
  horas: string;
  comentario: string;
};

type RegistroHorasFormProps = {
  formId: string;
  editId?: string;
  defaultFecha?: string;
  plantilla?: {
    proy: string;
    sub: string;
    act: string;
    tipo?: string;
    horas?: string;
  };
  registros: Record<string, RegistroMock[]>;
  ifsConnected: boolean;
  onSave: (registros: RegistroMock[]) => void | Promise<void>;
  onRangeDaysChange?: (count: number) => void;
  saving?: boolean;
};

function buildInitialForm(
  editId: string | undefined,
  defaultFecha: string | undefined,
  registros: Record<string, RegistroMock[]>,
  catalog: TiempoCatalog | null,
  bounds: MesActualBounds,
  plantilla?: RegistroHorasFormProps["plantilla"],
): FormState {

  if (editId) {
    const reg = findRegistroById(registros, editId);
    if (reg) {
      const sub = catalog
        ? resolveSubproyectoId(catalog, reg.proy, reg.subproy, reg.act)
        : inferSubproyecto(reg.proy, reg.act, reg.subproy);
      const act = catalog
        ? resolveActividadId(catalog, reg.proy, sub, reg.act)
        : reg.act;
      return {
        proy: reg.proy,
        sub,
        act,
        fecha: clampFechaMes(reg.fecha, bounds),
        fechaHasta: clampFechaMes(reg.fecha, bounds),
        tipo: reg.tipo,
        horas: formatHorasValor(reg.horas),
        comentario: reg.comentario || "",
      };
    }
  }

  const fecha = resolveFechaMes(defaultFecha, bounds);
  if (plantilla) {
    const sub = catalog
      ? resolveSubproyectoId(
          catalog,
          plantilla.proy,
          plantilla.sub,
          plantilla.act,
        ) || plantilla.sub
      : plantilla.sub;
    const act = catalog
      ? resolveActividadId(catalog, plantilla.proy, sub, plantilla.act) ||
        plantilla.act
      : plantilla.act;
    return {
      proy: plantilla.proy,
      sub,
      act,
      fecha,
      fechaHasta: fecha,
      tipo: plantilla.tipo || TIPO_HORA_CODIGO_DEFAULT,
      horas: plantilla.horas ? formatHorasCampo(plantilla.horas) : "",
      comentario: "",
    };
  }

  return {
    proy: "",
    sub: "",
    act: "",
    fecha,
    fechaHasta: fecha,
    tipo: TIPO_HORA_CODIGO_DEFAULT,
    horas: "",
    comentario: "",
  };
}

/** Solo códigos que vienen de IFS (o lista ya filtrada). No inventa tipos locales. */
function defaultTipoCode(
  tipos: TiempoTipoHoraOption[],
  preferExtra = false,
): string {
  if (!tipos.length) return "";
  if (preferExtra) {
    const extra = tipos.find((t) => t.cat === "extra");
    if (extra) return extra.code;
    return tipos[0].code;
  }
  const dn = tipos.find((t) => t.code.toUpperCase() === TIPO_HORA_CODIGO_DEFAULT);
  if (dn) return dn.code;
  const normal = tipos.find((t) => t.cat === "normal");
  if (normal) return normal.code;
  return tipos[0].code;
}

function ensureSelectOption(
  options: { value: string; label: string }[],
  value: string,
  label = value,
) {
  if (!value || options.some((opt) => opt.value === value)) return options;
  return [{ value, label }, ...options];
}

function fechasCalendarioDelForm(form: FormState, editId?: string): string[] {
  if (!form.fecha) return [];
  if (editId || !form.fechaHasta || form.fechaHasta === form.fecha) {
    return [form.fecha];
  }
  return eachIsoDateInclusive(form.fecha, form.fechaHasta);
}

function resolveTipoCatSeleccionado(
  form: FormState,
  tipos: TiempoTipoHoraOption[],
  useIfsCatalog: boolean,
): TipoHoraCat | undefined {
  if (!form.tipo) return undefined;
  if (useIfsCatalog) return tipoCatFromOptions(form.tipo, tipos);
  return tipoCat(form.tipo);
}

function fechasDelForm(
  form: FormState,
  editId: string | undefined,
  hoursByDate: Record<string, number> | null | undefined,
  tipos: TiempoTipoHoraOption[],
  useIfsCatalog: boolean,
): string[] {
  const calendario = fechasCalendarioDelForm(form, editId);
  if (editId) return calendario;
  const cat = resolveTipoCatSeleccionado(form, tipos, useIfsCatalog);
  return fechasRegistroSegunTipo(calendario, cat, hoursByDate);
}

function validateForm(
  form: FormState,
  registros: Record<string, RegistroMock[]>,
  tipos: TiempoTipoHoraOption[],
  useIfsCatalog: boolean,
  maxScheduleHours: number,
  editId: string | undefined,
  hoursByDate: Record<string, number> | null | undefined,
  scheduleReady: boolean,
): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};

  if (!scheduleReady) {
    errors.fecha = "Espera a cargar tu programa de trabajo";
    return errors;
  }

  if (!form.proy) errors.proy = "Requerido";
  if (!form.sub) errors.sub = "Requerido";
  if (!form.act) errors.act = "Requerido";
  if (!form.fecha) errors.fecha = "Requerido";
  if (!form.tipo) errors.tipo = "Requerido";

  const calendario = fechasCalendarioDelForm(form, editId);
  const cat = resolveTipoCatSeleccionado(form, tipos, useIfsCatalog);
  const fechas = fechasDelForm(
    form,
    editId,
    hoursByDate,
    tipos,
    useIfsCatalog,
  );

  if (form.fecha && form.tipo && cat && cat !== "extra") {
    const sinJornada = calendario.filter(
      (fecha) => !isDiaConJornadaNormal(fecha, hoursByDate),
    );
    if (sinJornada.length === calendario.length) {
      errors.tipo = mensajeSoloExtrasSinJornada(calendario[0]);
    } else if (sinJornada.length && fechas.length === 0) {
      errors.fecha =
        "Ningún día con jornada en ese rango para horas normales";
    }
  }

  // Si el tipo ya es inválido (ej. DN en festivo), no apilar otro error en Fecha.
  if (
    form.fecha &&
    form.tipo &&
    fechas.length === 0 &&
    !errors.fecha &&
    !errors.tipo
  ) {
    errors.fecha = "No hay días válidos para registrar con ese tipo de hora";
  }

  const formatHorasErr = horasInputFormatError(form.horas);
  const horasNum = parseHorasInput(form.horas);
  if (!form.horas.trim()) {
    errors.horas = "Requerido";
  } else if (formatHorasErr) {
    errors.horas = formatHorasErr;
  } else if (Number.isNaN(horasNum) || horasNum <= 0) {
    errors.horas = "Requerido";
  } else if (form.tipo && fechas.length && cat === "normal") {
    for (const fecha of fechas) {
      const horasExistentes = getHorasNormales(registros, fecha, editId);
      const topeDia = topeNormalesDelDia(fecha, hoursByDate, maxScheduleHours);
      if (topeDia <= 0 || horasExistentes + horasNum > topeDia) {
        if (topeDia <= 0) {
          errors.horas = mensajeSoloExtrasSinJornada(fecha);
        } else if (atNormalLimit(horasExistentes, topeDia)) {
          errors.horas = `${mensajeSoloExtrasJornadaCompleta(topeDia)} · ${formatFechaLegible(fecha, false)}`;
        } else {
          errors.horas = `${normalLimitErrorMessage(topeDia, horasExistentes)} · ${formatFechaLegible(fecha, false)}`;
        }
        break;
      }
    }
  }

  return errors;
}

function RegistroHorasForm({
  formId,
  editId,
  defaultFecha,
  plantilla,
  registros,
  ifsConnected,
  onSave,
  onRangeDaysChange,
  saving = false,
}: RegistroHorasFormProps) {
  const { mesBounds: bounds } = useMiTiempo();
  const isEdit = Boolean(editId);
  const [catalog, setCatalog] = useState<TiempoCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [ifsSessionExpired, setIfsSessionExpired] = useState(false);
  const [tipos, setTipos] = useState<TiempoTipoHoraOption[]>([]);
  const [tiposLoading, setTiposLoading] = useState(false);
  const [maxScheduleHours, setMaxScheduleHours] = useState(
    () => getJornadaLimiteFromSistema().maxNormalHours,
  );
  const [aprobadorIfs, setAprobadorIfs] = useState<string | null>(null);
  const [aprobadorLoading, setAprobadorLoading] = useState(false);
  const [hoursByDate, setHoursByDate] = useState<Record<string, number> | null>(
    null,
  );
  const [scheduleReady, setScheduleReady] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => {
    const initial = buildInitialForm(
      editId,
      defaultFecha,
      registros,
      null,
      bounds,
      plantilla,
    );
    // Alta con jornada ya al tope: no preseleccionar DN (la lista real viene de IFS).
    if (!editId && initial.fecha) {
      const max = getJornadaLimiteFromSistema().maxNormalHours;
      const completa = isJornadaNormalCompleta(
        [initial.fecha],
        null,
        max,
        (fecha) => getHorasNormales(registros, fecha),
      );
      if (completa && tipoCat(initial.tipo) !== "extra") {
        return { ...initial, tipo: "" };
      }
    }
    return initial;
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [tipoOpen, setTipoOpen] = useState(false);
  const { toast } = useToast();
  const useIfsCatalog = ifsConnected;

  useEffect(() => {
    if (!useIfsCatalog || !form.fecha) return;

    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    setIfsSessionExpired(false);

    void fetchTiempoCatalogAction(form.fecha).then((result) => {
      if (cancelled) return;
      setCatalogLoading(false);
      if (result.sessionExpired) {
        setCatalog(null);
        setIfsSessionExpired(true);
        setCatalogError(result.error ?? "Sesión IFS expirada");
        return;
      }
      if (result.error || !result.catalog) {
        setCatalog(null);
        setCatalogError(result.error ?? "Catálogo vacío");
        return;
      }
      setCatalog(result.catalog);
      if (editId) {
        setForm(
          buildInitialForm(
            editId,
            defaultFecha,
            registros,
            result.catalog,
            bounds,
            plantilla,
          ),
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [useIfsCatalog, form.fecha, editId, defaultFecha, registros, bounds]);

  useEffect(() => {
    if (!form.fecha) return;

    let cancelled = false;

    void fetchScheduleHoursAction(form.fecha).then((result) => {
      if (cancelled) return;
      setMaxScheduleHours(result.scheduleHours);
    });

    return () => {
      cancelled = true;
    };
  }, [form.fecha]);

  useEffect(() => {
    let cancelled = false;
    setScheduleReady(false);
    setScheduleError(null);
    void fetchEmployeeScheduleAction().then((result) => {
      if (cancelled) return;
      setHoursByDate(
        Object.keys(result.hoursByDate).length > 0 ? result.hoursByDate : null,
      );
      setScheduleReady(true);
      if (result.sessionExpired) {
        setScheduleError(
          "Sesión IFS expirada: el programa usa reglas locales (lun–vie).",
        );
      } else if (result.error && !result.fromIfs) {
        setScheduleError(
          "No se pudo leer tu programa IFS; se usan festivos/fines locales.",
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const useIfsCatalogLive = useIfsCatalog && Boolean(catalog) && !catalogError;

  const proyEntry = form.proy ? catalog?.porProyecto[form.proy] : undefined;
  const subs = useIfsCatalogLive ? (proyEntry?.subs ?? []) : [];
  const actividades = useIfsCatalogLive
    ? (proyEntry?.subs.find((s) => s.id === form.sub)?.actividades ?? [])
    : [];
  const actMeta = useIfsCatalogLive
    ? findActividadMeta(catalog, form.proy, form.sub, form.act)
    : null;
  const aprobadorLabel = useIfsCatalogLive
    ? aprobadorLoading ? null : aprobadorIfs ?? resolveAprobadorLabel(catalog, form.proy)
    : TIEMPO_UI_COPY.approverFallback;
  const aprobador =
    useIfsCatalogLive
      ? aprobadorIfs ?? resolveAprobadorLabel(catalog, form.proy)
      : aprobadorLabel;

  useEffect(() => {
    if (!useIfsCatalogLive || !form.proy) {
      setAprobadorIfs(null);
      setAprobadorLoading(false);
      return;
    }

    const entry = catalog?.porProyecto[form.proy];
    if (!entry) return;

    const cached =
      entry.aprobador?.name?.trim() || entry.aprobador?.code?.trim();
    if (cached) {
      setAprobadorIfs(cached);
      setAprobadorLoading(false);
      return;
    }

    let cancelled = false;
    setAprobadorLoading(true);
    setAprobadorIfs(null);

    void fetchProjectAprobadorAction({
      shortName: form.proy,
      projectId: entry.projectId,
    }).then((result) => {
      if (cancelled) return;
      setAprobadorLoading(false);
      setAprobadorIfs(result.aprobador ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [useIfsCatalogLive, form.proy, catalog?.porProyecto]);

  useEffect(() => {
    if (!useIfsCatalogLive || !form.proy || !form.sub || !form.act || !form.fecha) {
      setTipos([]);
      return;
    }

    const entry = catalog?.porProyecto[form.proy];
    const activity = findActividadMeta(catalog, form.proy, form.sub, form.act);
    if (!entry || !activity?.activitySeq) {
      setTipos([]);
      return;
    }

    let cancelled = false;
    setTiposLoading(true);

    void fetchTiposHoraAction({
      companyId: entry.companyId,
      projectId: entry.projectId,
      subProjectId: form.sub,
      accountDate: form.fecha,
      activitySeq: activity.activitySeq,
    }).then((result) => {
      if (cancelled) return;
      setTiposLoading(false);
      setTipos(result.tipos);
      if (result.error) {
        toast(result.error, "warn");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    useIfsCatalogLive,
    catalog,
    form.proy,
    form.sub,
    form.act,
    form.fecha,
    toast,
  ]);

  const patch = (next: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...next }));
  };

  const calendarioFechas = fechasCalendarioDelForm(form, editId);
  const fechasRango = fechasDelForm(
    form,
    editId,
    hoursByDate,
    tipos,
    useIfsCatalogLive,
  );

  /** No espera scheduleReady: con registros + tope ya se puede ocultar DN. */
  const jornadaCompleta = useMemo(() => {
    if (!calendarioFechas.length) return false;
    return isJornadaNormalCompleta(
      calendarioFechas,
      hoursByDate,
      maxScheduleHours,
      (fecha) => getHorasNormales(registros, fecha, editId),
    );
  }, [
    calendarioFechas,
    hoursByDate,
    maxScheduleHours,
    registros,
    editId,
  ]);

  const diaSoloExtras =
    calendarioFechas.length > 0 &&
    calendarioFechas.every(
      (fecha) => !isDiaConJornadaNormal(fecha, hoursByDate),
    );

  /** Festivo / fin de semana / sin jornada / jornada DN llena → solo extras del LOV. */
  const soloExtras = jornadaCompleta || diaSoloExtras;

  /**
   * Prioridad IFS: solo el LOV GetValidActReportCode (actividad + fecha).
   * Filtro local: sin DN en festivo, fin de semana, sin jornada o jornada completa.
   */
  const tiposDisponibles = useMemo(() => {
    if (!useIfsCatalogLive) return [];
    const filtered = filterTiposPorPrograma(
      tipos,
      calendarioFechas,
      hoursByDate,
    );
    if (soloExtras) {
      return filtered.filter((tipo) => tipo.cat !== "normal");
    }
    return filtered;
  }, [
    useIfsCatalogLive,
    tipos,
    calendarioFechas,
    hoursByDate,
    soloExtras,
  ]);

  /** Solo tipo de día (calendario); no explica qué horas se pueden registrar. */
  const etiquetaTipoDia = useMemo(() => {
    if (!scheduleReady) return null;
    const fecha = calendarioFechas[0] ?? form.fecha;
    if (!fecha || calendarioFechas.length > 1) return null;
    const cal = getDiaSinJornadaKind(fecha);
    if (cal === "festivo" || cal === "fin_semana") return cal;
    if (diaSoloExtras) return "sin_jornada" as const;
    return null;
  }, [scheduleReady, calendarioFechas, form.fecha, diaSoloExtras]);

  const tipoCatSeleccionado = resolveTipoCatSeleccionado(
    form,
    tipos,
    useIfsCatalogLive,
  );
  const horasPlaceholder = useMemo(() => {
    if (soloExtras || tipoCatSeleccionado === "extra") {
      return TIEMPO_UI_COPY.horasPlaceholderSinTope;
    }
    const restantes = restantesNormalesMin(
      calendarioFechas,
      hoursByDate,
      maxScheduleHours,
      (fecha) => getHorasNormales(registros, fecha, editId),
    );
    const tope =
      restantes > 0 && restantes < maxScheduleHours
        ? restantes
        : maxScheduleHours;
    return `Máx. ${formatScheduleHoursLabel(tope)} h`;
  }, [
    soloExtras,
    tipoCatSeleccionado,
    calendarioFechas,
    hoursByDate,
    maxScheduleHours,
    registros,
    editId,
  ]);

  useEffect(() => {
    onRangeDaysChange?.(isEdit ? 1 : Math.max(fechasRango.length, 1));
  }, [fechasRango.length, isEdit, onRangeDaysChange]);

  // DN fuera si solo extras; si hay LOV, 1ª extra IFS. Si no hay extras, tipo vacío.
  useEffect(() => {
    setForm((prev) => {
      if (soloExtras) {
        if (
          prev.tipo &&
          tiposDisponibles.some((t) => t.code === prev.tipo)
        ) {
          return prev;
        }
        const next = defaultTipoCode(tiposDisponibles, true);
        if (next === prev.tipo) return prev;
        return { ...prev, tipo: next };
      }

      if (!tiposDisponibles.length) {
        if (prev.tipo) return prev;
        return prev;
      }
      if (prev.tipo && tiposDisponibles.some((t) => t.code === prev.tipo)) {
        return prev;
      }
      const next = defaultTipoCode(tiposDisponibles, false);
      if (!next || next === prev.tipo) return prev;
      return { ...prev, tipo: next };
    });
  }, [tiposDisponibles, soloExtras, form.tipo]);

  const clearError = (field: FieldKey) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFechaRangoChange = (fecha: string, fechaHasta: string) => {
    // Proyecto / sub / actividad se mantienen al cambiar fecha o rango.
    patch({ fecha, fechaHasta });
    clearError("fecha");
    clearError("fechaHasta");
    clearError("tipo");
  };

  const handleProyChange = (proy: string) => {
    patch({ proy, sub: "", act: "" });
    clearError("proy");
  };

  const handleSubChange = (sub: string) => {
    patch({ sub, act: "" });
    clearError("sub");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || !scheduleReady) return;

    const nextErrors = validateForm(
      form,
      registros,
      tipos,
      useIfsCatalogLive,
      maxScheduleHours,
      editId,
      hoursByDate,
      scheduleReady,
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.horas?.includes("Tope de")) {
        toast(
          `Superaste el límite de ${formatScheduleHoursLabel(maxScheduleHours)} normales por día`,
          "danger",
        );
      } else if (nextErrors.tipo) {
        toast(nextErrors.tipo, "danger");
      }
      return;
    }

    const horasNum = parseHorasInput(form.horas);
    const actLabel = useIfsCatalogLive ? (actMeta?.label ?? form.act) : form.act;
    const registroExistente = editId
      ? findRegistroById(registros, editId)
      : undefined;
    const fechas = fechasDelForm(
      form,
      editId,
      hoursByDate,
      tipos,
      useIfsCatalogLive,
    );
    const baseId = Date.now();

    const payload: RegistroMock[] = fechas.map((fecha, index) => ({
      id: editId ?? `r${baseId}-${index}`,
      proy: form.proy,
      subproy: form.sub,
      act: actLabel,
      tipo: form.tipo,
      horas: horasNum,
      fecha,
      comentario: form.comentario,
      estado: registroExistente?.estado ?? "Registrado",
      aprobador: aprobador ?? undefined,
      comentarioRechazo: registroExistente?.comentarioRechazo ?? "",
      ifs: registroExistente?.ifs,
    }));

    await onSave(payload);
  };

  const handleCopiarDiaAnterior = () => {
    const fechas = Object.keys(registros).sort().reverse();
    const anterior = fechas.find(
      (f) => f < form.fecha && (registros[f]?.length ?? 0) > 0,
    );

    if (!anterior) {
      toast("No hay registros de días anteriores", "warn");
      return;
    }

    const ultimo = registros[anterior][registros[anterior].length - 1];
    const sub = useIfsCatalogLive
      ? resolveSubproyectoId(catalog, ultimo.proy, ultimo.subproy, ultimo.act)
      : inferSubproyecto(ultimo.proy, ultimo.act, ultimo.subproy);
    const act = useIfsCatalogLive
      ? resolveActividadId(catalog, ultimo.proy, sub, ultimo.act)
      : ultimo.act;

    patch({
      proy: ultimo.proy,
      sub,
      act,
      tipo: ultimo.tipo,
      horas: formatHorasValor(ultimo.horas),
      comentario: ultimo.comentario || "",
    });
    setErrors({});
    toast(`Copiado del ${formatFechaLegible(anterior, false)}`, "navy");
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      {(!scheduleReady || (useIfsCatalog && catalogLoading)) && (
        <LoadingNotice
          variant="banner"
          icon={LOADING_COPY.catalogIfs.icon}
          label="Cargando datos…"
        />
      )}
      {scheduleReady && scheduleError && (
        <p className="alert-warn px-3 py-2 text-sm">{scheduleError}</p>
      )}
      {!ifsConnected && (
        <p className="alert-warn px-3 py-2 text-sm">
          {TIEMPO_UI_COPY.ifsCatalogError.noSession}{" "}
          <a href="/dev/ifs" className="font-semibold underline">
            Diagnóstico
          </a>
        </p>
      )}
      {useIfsCatalog && catalogError && (
        <p className="alert-warn px-3 py-2 text-sm">
          {ifsSessionExpired ? (
            <>
              {TIEMPO_UI_COPY.ifsCatalogError.sessionExpired(catalogError)}{" "}
              <a href="/login" className="font-semibold underline">
                {TIEMPO_UI_COPY.ifsCatalogError.sessionExpiredAction}
              </a>{" "}
              {TIEMPO_UI_COPY.ifsCatalogError.sessionExpiredSuffix}
            </>
          ) : (
            <>
              {TIEMPO_UI_COPY.ifsCatalogError.fetchFailed(catalogError)}{" "}
              <a href="/dev/ifs" className="font-semibold underline">
                {TIEMPO_UI_COPY.ifsCatalogError.fetchFailedAction}
              </a>{" "}
              {TIEMPO_UI_COPY.ifsCatalogError.fetchFailedSuffix}
            </>
          )}
        </p>
      )}

      <div className="flex min-h-[28px] items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {scheduleReady && etiquetaTipoDia ? (
            <DiaSinJornadaBanner
              fecha={calendarioFechas[0] ?? form.fecha}
              kind={etiquetaTipoDia}
            />
          ) : null}
          {jornadaCompleta && !diaSoloExtras ? (
            <div
              className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1.5 text-[12px] font-semibold leading-none text-[#166534]"
              role="status"
              title={mensajeSoloExtrasJornadaCompleta(maxScheduleHours)}
            >
              <Icon name="clock" size="xs" className="shrink-0" />
              {TIEMPO_UI_COPY.jornadaCompletaSoloExtras}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleCopiarDiaAnterior}
          className="btn-link shrink-0"
        >
          <Icon name="copy" size="xs" />
          Copiar día anterior
        </button>
      </div>

      <Field label="Proyecto" required error={errors.proy}>
        <SearchableSelect
          value={form.proy}
          onChange={handleProyChange}
          options={ensureSelectOption(
            useIfsCatalogLive
              ? (catalog?.proyectos ?? []).map((p) => ({
                  value: p.id,
                  label: `${p.id} – ${p.nombre}`,
                }))
              : [],
            form.proy,
          )}
          placeholder={
            !scheduleReady
              ? "Cargando programa…"
              : useIfsCatalog && catalogLoading
                ? loadingPlaceholder(LOADING_COPY.projects)
                : TIEMPO_UI_COPY.selectProject
          }
          searchPlaceholder={TIEMPO_UI_COPY.searchProject}
          disabled={
            !scheduleReady || (useIfsCatalog && catalogLoading && !catalogError)
          }
          error={!!errors.proy}
        />
      </Field>

      <Field label="Subproyecto" required error={errors.sub}>
        <SearchableSelect
          value={form.sub}
          onChange={handleSubChange}
          options={ensureSelectOption(
            subs.map((s) => ({
              value: s.id,
              label: s.label,
            })),
            form.sub,
          )}
          placeholder={
            form.proy
              ? TIEMPO_UI_COPY.selectSubproject
              : TIEMPO_UI_COPY.selectProjectFirst
          }
          searchPlaceholder={TIEMPO_UI_COPY.searchSubproject}
          disabled={!form.proy || (useIfsCatalog && catalogLoading)}
          error={!!errors.sub}
        />
      </Field>

      <Field label="Actividad" required error={errors.act}>
        <SearchableSelect
          value={form.act}
          onChange={(act) => {
            patch({ act });
            clearError("act");
          }}
          options={ensureSelectOption(
            actividades.map((a) => ({
              value: a.id,
              label: a.label,
            })),
            form.act,
          )}
          placeholder={
            form.sub
              ? TIEMPO_UI_COPY.selectActivity
              : TIEMPO_UI_COPY.selectSubprojectFirst
          }
          searchPlaceholder={TIEMPO_UI_COPY.searchActivity}
          disabled={!form.sub || (useIfsCatalog && catalogLoading)}
          error={!!errors.act}
        />
      </Field>

      <Field
        label="Fecha"
        required
        error={errors.fecha || errors.fechaHasta}
      >
        <FechaDiaORangoInput
          from={form.fecha}
          to={isEdit ? form.fecha : form.fechaHasta}
          bounds={bounds}
          allowRange={!isEdit}
          laborableCount={fechasRango.length}
          invalid={!!(errors.fecha || errors.fechaHasta)}
          onChange={handleFechaRangoChange}
        />
      </Field>

      <div className="flex flex-wrap gap-2.5">
        <div className="min-w-[120px] flex-1">
          <Field label="Tipo de hora" required error={errors.tipo}>
            <Dropdown
              open={tipoOpen}
              onOpenChange={setTipoOpen}
              portal
              trigger={
                <button
                  type="button"
                  disabled={
                    !scheduleReady ||
                    (useIfsCatalogLive ? !form.act || tiposLoading : false)
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    setTipoOpen((open) => !open);
                  }}
                  className={`flex min-h-[38px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors hover:border-[#9fb3cc] focus:border-navy focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                    errors.tipo
                      ? "border-red bg-[#fff5f5]"
                      : "border-[#c7d2e0] bg-white"
                  }`}
                >
                  {form.tipo ? (
                    <TipoHoraPill
                      tipo={form.tipo}
                      label={
                        useIfsCatalogLive
                          ? tiposDisponibles.find((t) => t.code === form.tipo)
                              ?.label
                          : undefined
                      }
                      title={
                        useIfsCatalogLive
                          ? tiposDisponibles.find((t) => t.code === form.tipo)
                              ?.fullLabel
                          : undefined
                      }
                      className="max-w-[min(100%,14rem)]"
                    />
                  ) : useIfsCatalogLive && tiposLoading ? (
                    <LoadingNotice
                      variant="inline"
                      icon={LOADING_COPY.hourTypes.icon}
                      label={LOADING_COPY.hourTypes.label}
                      className="text-[12px]"
                    />
                  ) : (
                    <span className="text-muted">
                      {(() => {
                        if (!scheduleReady) return "Cargando programa…";
                        if (useIfsCatalogLive && !form.act) {
                          return TIEMPO_UI_COPY.selectActivityFirst;
                        }
                        if (
                          useIfsCatalogLive &&
                          form.act &&
                          !tiposLoading &&
                          tiposDisponibles.length === 0
                        ) {
                          const soloDn =
                            tipos.length > 0 &&
                            tipos.every((t) => t.cat === "normal");
                          if (soloDn && (jornadaCompleta || diaSoloExtras)) {
                            return TIEMPO_UI_COPY.selectHourTypeSoloDnIfs;
                          }
                          if (tipos.length === 0) {
                            return TIEMPO_UI_COPY.selectHourTypeVacioIfs;
                          }
                          if (jornadaCompleta || diaSoloExtras) {
                            return TIEMPO_UI_COPY.selectHourTypeSoloDnIfs;
                          }
                          return TIEMPO_UI_COPY.selectHourType;
                        }
                        if (
                          !useIfsCatalogLive &&
                          (jornadaCompleta || diaSoloExtras)
                        ) {
                          return TIEMPO_UI_COPY.selectHourTypeNeedsIfs;
                        }
                        return TIEMPO_UI_COPY.selectHourType;
                      })()}
                    </span>
                  )}
                  <DropdownChevron />
                </button>
              }
            >
              {tiposDisponibles.map((tipo) => (
                <button
                  key={tipo.code}
                  type="button"
                  title={`${tipo.code} · ${"fullLabel" in tipo && tipo.fullLabel ? tipo.fullLabel : tipo.label}`}
                  onClick={() => {
                    patch({ tipo: tipo.code });
                    setTipoOpen(false);
                    clearError("tipo");
                  }}
                  className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 hover:bg-[#f4f7fb]"
                >
                  <TipoHoraPill
                    tipo={tipo.code}
                    label={tipo.label}
                    title={
                      "fullLabel" in tipo && tipo.fullLabel
                        ? `${tipo.code} · ${tipo.fullLabel}`
                        : undefined
                    }
                    className="max-w-full"
                  />
                </button>
              ))}
            </Dropdown>
          </Field>
        </div>

        <div className="min-w-[140px] max-w-[180px] flex-1">
          <Field label="Horas" required error={errors.horas}>
            <>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.horas}
                placeholder={horasPlaceholder}
                title={TIEMPO_UI_COPY.horasAyudaDecimales}
                onChange={(e) => {
                  patch({ horas: e.target.value });
                  clearError("horas");
                }}
                onBlur={() => {
                  const formatErr = horasInputFormatError(form.horas);
                  if (formatErr || !form.horas.trim()) return;
                  const n = parseHorasInput(form.horas);
                  if (Number.isNaN(n) || n <= 0) return;
                  patch({ horas: formatHorasValor(n) });
                }}
                className={`h-9 w-full rounded-lg border px-3 text-[13px] tabular-nums focus:border-navy focus:outline-none ${
                  errors.horas
                    ? "border-red bg-[#fff5f5]"
                    : "border-[#c7d2e0]"
                }`}
              />
              {!errors.horas ? (
                <span className="mt-0.5 block text-[10px] leading-snug text-muted">
                  {TIEMPO_UI_COPY.horasAyudaDecimales}
                </span>
              ) : null}
            </>
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <div className="min-w-[140px] max-w-[220px] flex-1">
          <Field label="Aprobador">
            <div className="flex h-9 items-center truncate rounded-lg border border-border bg-[#f8fafc] px-3 text-[13px] text-muted">
              {useIfsCatalogLive && aprobadorLoading ? (
                <LoadingNotice
                  variant="inline"
                  icon={LOADING_COPY.approver.icon}
                  label={LOADING_COPY.approver.label}
                />
              ) : (
                aprobadorLabel
              )}
            </div>
          </Field>
        </div>
        <div className="min-w-[180px] flex-[2]">
          <Field label="Comentario">
            <input
              type="text"
              value={form.comentario}
              onChange={(e) => patch({ comentario: e.target.value })}
              placeholder="Nota del registro…"
              className="h-9 w-full rounded-lg border border-[#c7d2e0] px-3 text-[13px] focus:border-navy focus:outline-none"
            />
          </Field>
        </div>
      </div>
    </form>
  );
}

export function RegistrarHorasModal() {
  const {
    modal,
    closeRegistrarModal,
    registros,
    ifsConnected,
    upsertRegistros,
  } = useMiTiempo();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [rangeDays, setRangeDays] = useState(1);

  const formKey = modal
    ? `${modal.editId ?? "new"}:${modal.fecha ?? "hoy"}:${modal.plantilla?.proy ?? ""}:${modal.plantilla?.act ?? ""}:${modal.plantilla?.horas ?? ""}`
    : "closed";

  const handleSave = async (payload: RegistroMock[]) => {
    if (!ifsConnected) {
      toast(TIEMPO_UI_COPY.ifsCatalogError.noSession, "danger");
      return;
    }
    setSaving(true);
    const existing = modal?.editId
      ? findRegistroById(registros, modal.editId)
      : undefined;
    const wasRejected = existing?.estado === "Rechazado";

    const regs = payload.map((registro) => ({
      ...registro,
      estado: wasRejected && existing ? existing.estado : registro.estado,
      comentarioRechazo: wasRejected ? "" : registro.comentarioRechazo,
    }));

    try {
      await upsertRegistros(regs);
      closeRegistrarModal();
      if (modal?.editId) {
        toast(TIEMPO_UI_COPY.toastRegistroGuardado, "navy");
      } else if (regs.length > 1) {
        toast(TIEMPO_UI_COPY.toastRegistrosRango(regs.length), "navy");
      } else {
        toast(TIEMPO_UI_COPY.toastRegistroNuevo, "navy");
      }
    } catch (err) {
      toast(
        formatIfsError(err) ||
          "No se pudo guardar el registro en IFS. Intenta de nuevo.",
        "danger",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    closeRegistrarModal();
  };

  const saveDisabled = saving || !ifsConnected;

  return (
    <Modal
      open={!!modal}
      onClose={handleClose}
      busy={saving}
      title={modal?.editId ? "Editar registro" : "Registrar horas"}
      icon="clock"
      widthClass="max-w-[580px]"
      footer={
        modal ? (
          <>
            <Button
              type="button"
              variant="tertiary"
              onClick={handleClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              variant="primary"
              disabled={saveDisabled}
              loading={saving}
              loadingLabel="Enviando…"
            >
              {modal.editId
                ? TIEMPO_UI_COPY.guardarCambios
                : TIEMPO_UI_COPY.guardarRango(rangeDays)}
            </Button>
          </>
        ) : undefined
      }
    >
      {modal && (
        <RegistroHorasForm
          key={formKey}
          formId={FORM_ID}
          editId={modal.editId}
          defaultFecha={modal.fecha}
          plantilla={modal.plantilla}
          registros={registros}
          ifsConnected={ifsConnected}
          onSave={handleSave}
          onRangeDaysChange={setRangeDays}
          saving={saving}
        />
      )}
    </Modal>
  );
}
