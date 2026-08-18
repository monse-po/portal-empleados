"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/Button";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { Field } from "@/src/components/ui/Field";
import { DropdownChevron, SelectControl } from "@/src/components/ui/DropdownAffordance";
import { Icon } from "@/src/components/ui/Icon";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import { inputClassWithError } from "@/src/components/ui/MonthDateInput";
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
  getRegistrosDia,
  getMesActualBounds,
  HORAS_OPTIONS,
  inferSubproyecto,
  JER_TIEMPO,
  PROYECTOS,
  resolveFechaMes,
  TIPO_HORA,
  tipoCat,
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
import { scheduleSourceLabel as formatScheduleSource } from "@/src/lib/tiempo-config";
import { getJornadaLimiteFromSistema } from "@/src/lib/tiempo-config";
import { labelEstadoRegistro, hayBorradoresEnviables } from "@/src/lib/tiempo-registro-rules";
import {
  fechasRegistroSegunTipo,
  filterTiposPorPrograma,
  formatScheduleHoursLabel,
  getDiaSinJornadaKind,
  isDiaConJornadaNormal,
  mensajeSoloExtrasSinJornada,
  normalLimitErrorMessage,
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

type SaveMode = "guardar" | "enviar";

type RegistroHorasFormProps = {
  formId: string;
  editId?: string;
  defaultFecha?: string;
  registros: Record<string, RegistroMock[]>;
  ifsConnected: boolean;
  onSave: (registros: RegistroMock[], mode: SaveMode) => void | Promise<void>;
  getSaveMode: () => SaveMode;
  onRangeDaysChange?: (count: number) => void;
  saving?: boolean;
  hintEnvio?: "lista" | "dia";
};

function buildInitialForm(
  editId: string | undefined,
  defaultFecha: string | undefined,
  registros: Record<string, RegistroMock[]>,
  catalog: TiempoCatalog | null,
): FormState {
  const bounds = getMesActualBounds();

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
        horas: String(reg.horas),
        comentario: reg.comentario || "",
      };
    }
  }

  const fecha = resolveFechaMes(defaultFecha, bounds);
  return {
    proy: "",
    sub: "",
    act: "",
    fecha,
    fechaHasta: fecha,
    tipo: "",
    horas: "",
    comentario: "",
  };
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

  if (form.fecha && form.tipo && fechas.length === 0 && !errors.fecha) {
    errors.fecha = "No hay días válidos para registrar con ese tipo de hora";
  }

  const horasNum = parseFloat(form.horas);
  if (!form.horas || horasNum <= 0 || Number.isNaN(horasNum)) {
    errors.horas = "Requerido";
  } else if (form.tipo && fechas.length && cat === "normal") {
    for (const fecha of fechas) {
      const horasExistentes = getHorasNormales(registros, fecha, editId);
      const topeDia = isDiaConJornadaNormal(fecha, hoursByDate)
        ? maxScheduleHours
        : 0;
      if (topeDia <= 0 || horasExistentes + horasNum > topeDia) {
        errors.horas =
          topeDia <= 0
            ? mensajeSoloExtrasSinJornada(fecha)
            : `${normalLimitErrorMessage(topeDia, horasExistentes)} · ${formatFechaLegible(fecha, false)}`;
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
  registros,
  ifsConnected,
  onSave,
  getSaveMode,
  onRangeDaysChange,
  saving = false,
  hintEnvio,
}: RegistroHorasFormProps) {
  const bounds = getMesActualBounds();
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
  const [jornadaSourceLabel, setJornadaSourceLabel] = useState("config.");
  const [aprobadorIfs, setAprobadorIfs] = useState<string | null>(null);
  const [aprobadorLoading, setAprobadorLoading] = useState(false);
  const [hoursByDate, setHoursByDate] = useState<Record<string, number> | null>(
    null,
  );
  const [scheduleReady, setScheduleReady] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    buildInitialForm(editId, defaultFecha, registros, null),
  );
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
        setForm(buildInitialForm(editId, defaultFecha, registros, result.catalog));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [useIfsCatalog, form.fecha, editId, defaultFecha, registros]);

  useEffect(() => {
    if (!form.fecha) return;

    let cancelled = false;

    void fetchScheduleHoursAction(form.fecha).then((result) => {
      if (cancelled) return;
      setMaxScheduleHours(result.scheduleHours);
      setJornadaSourceLabel(formatScheduleSource(result.source));
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

  const mockSubs =
    form.proy && JER_TIEMPO[form.proy]
      ? Object.keys(JER_TIEMPO[form.proy].subs)
      : [];
  const mockActs =
    form.proy && form.sub && JER_TIEMPO[form.proy]?.subs[form.sub]
      ? JER_TIEMPO[form.proy].subs[form.sub]
      : [];
  const proyEntry = form.proy ? catalog?.porProyecto[form.proy] : undefined;
  const subs = useIfsCatalogLive
    ? (proyEntry?.subs ?? [])
    : mockSubs.map((s) => ({ id: s, label: s }));
  const actividades = useIfsCatalogLive
    ? (proyEntry?.subs.find((s) => s.id === form.sub)?.actividades ?? [])
    : mockActs.map((a) => ({ id: a, label: a, activitySeq: 0, activityNo: a }));
  const actMeta = useIfsCatalogLive
    ? findActividadMeta(catalog, form.proy, form.sub, form.act)
    : null;
  const aprobadorLabel = useIfsCatalogLive
    ? aprobadorLoading ? null : aprobadorIfs ?? resolveAprobadorLabel(catalog, form.proy)
    : form.proy && JER_TIEMPO[form.proy]
      ? JER_TIEMPO[form.proy].aprobador
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
      if (form.tipo && !result.tipos.some((t) => t.code === form.tipo)) {
        setForm((prev) => ({ ...prev, tipo: "" }));
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
    form.tipo,
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

  const tiposDisponibles = useMemo(() => {
    const base = useIfsCatalogLive
      ? tipos
      : Object.keys(TIPO_HORA).map((code) => ({
          code,
          label: TIPO_HORA[code].s,
          fullLabel: TIPO_HORA[code].n,
          cat: TIPO_HORA[code].cat,
        }));
    return filterTiposPorPrograma(base, calendarioFechas, hoursByDate);
  }, [useIfsCatalogLive, tipos, calendarioFechas, hoursByDate]);

  const diaSoloExtras =
    scheduleReady &&
    calendarioFechas.length > 0 &&
    calendarioFechas.every((fecha) => !isDiaConJornadaNormal(fecha, hoursByDate));

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

  useEffect(() => {
    onRangeDaysChange?.(isEdit ? 1 : Math.max(fechasRango.length, 1));
  }, [fechasRango.length, isEdit, onRangeDaysChange]);

  // Si el día/rango no admite el tipo elegido, limpiarlo (el programa filtra en silencio).
  useEffect(() => {
    if (!scheduleReady || !form.tipo) return;
    if (tiposDisponibles.some((t) => t.code === form.tipo)) return;
    setForm((prev) => ({ ...prev, tipo: "" }));
  }, [scheduleReady, form.tipo, tiposDisponibles]);

  const clearError = (field: FieldKey) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFechaRangoChange = (fecha: string, fechaHasta: string) => {
    const prevFecha = form.fecha;
    patch(
      useIfsCatalogLive && fecha !== prevFecha
        ? { fecha, fechaHasta, proy: "", sub: "", act: "", tipo: "" }
        : { fecha, fechaHasta, tipo: "" },
    );
    clearError("fecha");
    clearError("fechaHasta");
    clearError("tipo");
  };

  const handleProyChange = (proy: string) => {
    patch({ proy, sub: "", act: "", tipo: "" });
    clearError("proy");
  };

  const handleSubChange = (sub: string) => {
    patch({ sub, act: "", tipo: "" });
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

    const horasNum = parseFloat(form.horas);
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
      estado: registroExistente?.estado ?? "Borrador",
      aprobador: aprobador ?? undefined,
      comentarioRechazo: registroExistente?.comentarioRechazo ?? "",
      ifs: registroExistente?.ifs,
    }));

    await onSave(payload, isEdit ? "guardar" : getSaveMode());
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
      horas: String(ultimo.horas),
      comentario: ultimo.comentario || "",
    });
    setErrors({});
    toast(`Copiado del ${formatFechaLegible(anterior, false)}`, "navy");
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
        {scheduleReady && etiquetaTipoDia ? (
          <DiaSinJornadaBanner
            fecha={calendarioFechas[0] ?? form.fecha}
            kind={etiquetaTipoDia}
          />
        ) : (
          <span />
        )}
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
          options={
            useIfsCatalogLive
              ? (catalog?.proyectos ?? []).map((p) => ({
                  value: p.id,
                  label: `${p.id} – ${p.nombre}`,
                }))
              : PROYECTOS.map((p) => ({
                  value: p.id,
                  label: `${p.id} – ${p.nombre}`,
                  hint: p.sub,
                }))
          }
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
          options={subs.map((s) => ({
            value: s.id,
            label: s.label,
          }))}
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
            patch({ act, tipo: "" });
            clearError("act");
          }}
          options={actividades.map((a) => ({
            value: a.id,
            label: a.label,
          }))}
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

      <div className="flex flex-wrap gap-3.5">
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
                      {!scheduleReady
                        ? "Cargando programa…"
                        : useIfsCatalogLive && !form.act
                          ? TIEMPO_UI_COPY.selectActivityFirst
                          : TIEMPO_UI_COPY.selectHourType}
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
          <p className="mt-1 text-[11px] leading-snug text-muted">
            {TIEMPO_UI_COPY.tipoHoraProgramaHint}
          </p>
        </div>

        <div className="min-w-[100px] flex-1">
          <Field label="Horas" required error={errors.horas}>
            <SelectControl
              value={form.horas}
              onChange={(e) => {
                patch({ horas: e.target.value });
                clearError("horas");
              }}
              className={inputClassWithError(!!errors.horas)}
            >
              <option value="">—</option>
              {HORAS_OPTIONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </SelectControl>
            <p className="mt-1 text-[11px] text-muted">
              Jornada ({jornadaSourceLabel}): máx{" "}
              {formatScheduleHoursLabel(maxScheduleHours)} normales
            </p>
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap gap-3.5">
        <div className="min-w-[130px] flex-1">
          <Field label="Estado">
            <div className="flex h-9 items-center rounded-lg border border-border bg-[#f8fafc] px-3 text-[13px] text-muted">
              {editId
                ? labelEstadoRegistro(
                    findRegistroById(registros, editId)?.estado ?? "Borrador",
                  )
                : TIEMPO_UI_COPY.estadoBorrador}
            </div>
          </Field>
        </div>
        <div className="min-w-[130px] flex-1">
          <Field label="Aprobador">
            <div className="flex h-9 items-center rounded-lg border border-border bg-[#f8fafc] px-3 text-[13px] text-muted">
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
      </div>

      <Field label="Comentario de empleado">
        <textarea
          value={form.comentario}
          onChange={(e) => patch({ comentario: e.target.value })}
          placeholder="Descripción o nota del registro..."
          className="min-h-[72px] w-full resize-y rounded-lg border border-[#c7d2e0] px-3 py-2 text-[13px] focus:border-navy focus:outline-none"
        />
      </Field>

      {hintEnvio && (
        <p className="rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#1e40af]">
          <Icon name="info" size="xs" className="mr-1 inline-block align-text-bottom" />
          {hintEnvio === "lista"
            ? TIEMPO_UI_COPY.hintEnviarDesdeLista
            : TIEMPO_UI_COPY.hintEnviarEnVistaDia}
        </p>
      )}

      <span className="text-[11.5px] text-muted">
        Los campos con <span className="mx-0.5 text-red">*</span> son
        obligatorios.
      </span>
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
    upsertRegistrosYEnviar,
  } = useMiTiempo();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [rangeDays, setRangeDays] = useState(1);
  const saveModeRef = useRef<SaveMode>("guardar");

  const formKey = modal
    ? `${modal.editId ?? "new"}:${modal.fecha ?? "hoy"}`
    : "closed";

  const fechaModal = modal
    ? modal.fecha ??
      (modal.editId
        ? findRegistroById(registros, modal.editId)?.fecha
        : undefined)
    : undefined;
  const hayBorradoresEnDia = fechaModal
    ? hayBorradoresEnviables(getRegistrosDia(registros, fechaModal))
    : false;
  const hintEnvio =
    modal?.origen === "lista" && hayBorradoresEnDia
      ? ("lista" as const)
      : modal?.origen === "dia" && hayBorradoresEnDia
        ? ("dia" as const)
        : undefined;

  const handleSave = async (payload: RegistroMock[], mode: SaveMode) => {
    setSaving(true);
    const wasRejected =
      modal?.editId &&
      findRegistroById(registros, modal.editId)?.estado === "Rechazado";

    const regs = payload.map((registro) => ({
      ...registro,
      estado: wasRejected ? ("Borrador" as const) : registro.estado,
      comentarioRechazo: wasRejected ? "" : registro.comentarioRechazo,
    }));

    try {
      if (mode === "enviar" && !modal?.editId) {
        const result = await upsertRegistrosYEnviar(regs);
        closeRegistrarModal();
        if (result.error) {
          toast(result.error, "danger");
          return;
        }
        if (result.warning) {
          toast(result.warning, "warn");
          return;
        }
        toast(
          result.sentToIfs
            ? result.inApprovalQueue
              ? `${TIEMPO_UI_COPY.toastRegistrosEnviados(regs.length)} · Ya están en bandeja IFS`
              : TIEMPO_UI_COPY.toastRegistrosEnviados(regs.length)
            : TIEMPO_UI_COPY.toastRegistrosEnviados(regs.length),
          "green",
        );
        return;
      }

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
        err instanceof Error
          ? err.message
          : "No se pudo guardar el registro. Intenta de nuevo.",
        "danger",
      );
    } finally {
      setSaving(false);
      saveModeRef.current = "guardar";
    }
  };

  const handleClose = () => {
    if (saving) return;
    closeRegistrarModal();
  };

  const submitWithMode = (mode: SaveMode) => {
    saveModeRef.current = mode;
    const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
    form?.requestSubmit();
  };

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
            {modal.editId ? (
              <Button
                type="submit"
                form={FORM_ID}
                variant="primary"
                disabled={saving}
                loading={saving}
                loadingLabel="Guardando…"
                onClick={() => {
                  saveModeRef.current = "guardar";
                }}
              >
                {TIEMPO_UI_COPY.guardarCambios}
              </Button>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => submitWithMode("guardar")}
                >
                  {TIEMPO_UI_COPY.guardarRango(rangeDays)}
                </Button>
                <Button
                  type="button"
                  variant="success"
                  disabled={saving}
                  loading={saving}
                  loadingLabel="Enviando…"
                  onClick={() => submitWithMode("enviar")}
                >
                  <Icon name="send" size="xs" />
                  {TIEMPO_UI_COPY.guardarYEnviar(rangeDays)}
                </Button>
              </div>
            )}
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
          registros={registros}
          ifsConnected={ifsConnected}
          onSave={handleSave}
          getSaveMode={() => saveModeRef.current}
          onRangeDaysChange={setRangeDays}
          saving={saving}
          hintEnvio={hintEnvio}
        />
      )}
    </Modal>
  );
}
