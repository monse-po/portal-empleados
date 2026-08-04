"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/Button";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { Field } from "@/src/components/ui/Field";
import { DropdownChevron, SelectControl } from "@/src/components/ui/DropdownAffordance";
import { Icon } from "@/src/components/ui/Icon";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import {
  inputClassWithError,
  MonthDateInput,
} from "@/src/components/ui/MonthDateInput";
import { LoadingNotice } from "@/src/components/ui/LoadingNotice";
import { Modal } from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/Toast";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
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
  resolveFechaMes,
  tipoCat,
  type RegistroMock,
} from "@/src/lib/tiempo-registro";
import {
  fetchProjectAprobadorAction,
  fetchScheduleHoursAction,
  fetchTiempoCatalogAction,
  fetchTiposHoraAction,
} from "@/src/server/mi-tiempo-catalog-actions";
import { LOADING_COPY, loadingPlaceholder } from "@/src/lib/copy/loading";
import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";
import { scheduleSourceLabel as formatScheduleSource } from "@/src/lib/tiempo-config";
import { getJornadaLimiteFromSistema } from "@/src/lib/tiempo-config";
import { labelEstadoRegistro, hayRegistrosBorrador } from "@/src/lib/tiempo-registro-rules";
import {
  exceedsNormalLimit,
  formatScheduleHoursLabel,
  normalLimitErrorMessage,
} from "@/src/lib/tiempo-schedule";

const FORM_ID = "registro-horas-form";

type FieldKey = "proy" | "sub" | "act" | "fecha" | "tipo" | "horas";

type FormState = {
  proy: string;
  sub: string;
  act: string;
  fecha: string;
  tipo: string;
  horas: string;
  comentario: string;
};

type RegistroHorasFormProps = {
  formId: string;
  editId?: string;
  defaultFecha?: string;
  registros: Record<string, RegistroMock[]>;
  ifsConnected: boolean;
  onSave: (registro: RegistroMock) => void | Promise<void>;
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
        : (reg.subproy ?? "");
      const act = catalog
        ? resolveActividadId(catalog, reg.proy, sub, reg.act)
        : reg.act;
      return {
        proy: reg.proy,
        sub,
        act,
        fecha: clampFechaMes(reg.fecha, bounds),
        tipo: reg.tipo,
        horas: String(reg.horas),
        comentario: reg.comentario || "",
      };
    }
  }

  return {
    proy: "",
    sub: "",
    act: "",
    fecha: resolveFechaMes(defaultFecha, bounds),
    tipo: "",
    horas: "",
    comentario: "",
  };
}

function validateForm(
  form: FormState,
  registros: Record<string, RegistroMock[]>,
  tipos: TiempoTipoHoraOption[],
  maxScheduleHours: number,
  editId?: string,
): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};

  if (!form.proy) errors.proy = "Requerido";
  if (!form.sub) errors.sub = "Requerido";
  if (!form.act) errors.act = "Requerido";
  if (!form.fecha) errors.fecha = "Requerido";
  if (!form.tipo) errors.tipo = "Requerido";

  const horasNum = parseFloat(form.horas);
  if (!form.horas || horasNum <= 0 || Number.isNaN(horasNum)) {
    errors.horas = "Requerido";
  } else if (form.tipo) {
    const esNormal = tipos.length
      ? tipoCatFromOptions(form.tipo, tipos) === "normal"
      : tipoCat(form.tipo) === "normal";
    if (esNormal) {
      const horasExistentes = getHorasNormales(
        registros,
        form.fecha,
        editId,
      );
      if (horasExistentes + horasNum > maxScheduleHours) {
        errors.horas = normalLimitErrorMessage(maxScheduleHours, horasExistentes);
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
  saving = false,
  hintEnvio,
}: RegistroHorasFormProps) {
  const bounds = getMesActualBounds();
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
  const [form, setForm] = useState<FormState>(() =>
    buildInitialForm(editId, defaultFecha, registros, null),
  );
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [tipoOpen, setTipoOpen] = useState(false);
  const { toast } = useToast();
  const catalogReady = Boolean(catalog) && !catalogError;

  useEffect(() => {
    if (!ifsConnected || !form.fecha) return;

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
  }, [ifsConnected, form.fecha, editId, defaultFecha, registros]);

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

  const proyEntry = form.proy ? catalog?.porProyecto[form.proy] : undefined;
  const subs = proyEntry?.subs ?? [];
  const actividades =
    proyEntry?.subs.find((s) => s.id === form.sub)?.actividades ?? [];
  const actMeta = catalogReady
    ? findActividadMeta(catalog, form.proy, form.sub, form.act)
    : null;
  const aprobadorLabel = aprobadorLoading
    ? null
    : aprobadorIfs ??
      resolveAprobadorLabel(catalog, form.proy) ??
      TIEMPO_UI_COPY.approverFallback;
  const aprobador =
    aprobadorIfs ?? resolveAprobadorLabel(catalog, form.proy) ?? undefined;

  useEffect(() => {
    if (!catalogReady || !form.proy) {
      setAprobadorIfs(null);
      setAprobadorLoading(false);
      return;
    }

    const entry = catalog?.porProyecto[form.proy];
    if (!entry) return;

    const cachedName = entry.aprobador?.name?.trim();
    if (cachedName) {
      setAprobadorIfs(cachedName);
      setAprobadorLoading(false);
      return;
    }

    let cancelled = false;
    setAprobadorLoading(true);
    setAprobadorIfs(entry.aprobador?.code?.trim() || null);

    void fetchProjectAprobadorAction({
      shortName: form.proy,
      projectId: entry.projectId,
      companyId: entry.companyId,
    }).then((result) => {
      if (cancelled) return;
      setAprobadorLoading(false);
      setAprobadorIfs(
        result.aprobador ?? entry.aprobador?.code?.trim() ?? null,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [catalogReady, form.proy, catalog?.porProyecto]);

  useEffect(() => {
    if (!catalogReady || !form.proy || !form.sub || !form.act || !form.fecha) {
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
    catalogReady,
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

  const clearError = (field: FieldKey) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
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
    if (saving) return;

    const nextErrors = validateForm(
      form,
      registros,
      tipos,
      maxScheduleHours,
      editId,
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.horas?.includes("Tope de")) {
        toast(
          `Superaste el límite de ${formatScheduleHoursLabel(maxScheduleHours)} normales por día`,
          "danger",
        );
      }
      return;
    }

    const horasNum = parseFloat(form.horas);
    const actLabel = actMeta?.label ?? form.act;
    const registroExistente = editId ? findRegistroById(registros, editId) : undefined;

    await onSave(
      {
        id: editId ?? `r${Date.now()}`,
        proy: form.proy,
        subproy: form.sub,
        act: actLabel,
        tipo: form.tipo,
        horas: horasNum,
        fecha: form.fecha,
        comentario: form.comentario,
        estado: registroExistente?.estado ?? "Borrador",
        aprobador: aprobador ?? undefined,
        comentarioRechazo: registroExistente?.comentarioRechazo ?? "",
      },
    );
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

    if (!catalog) {
      toast("Espera a que cargue el catálogo de proyectos", "warn");
      return;
    }

    const ultimo = registros[anterior][registros[anterior].length - 1];
    const sub = resolveSubproyectoId(
      catalog,
      ultimo.proy,
      ultimo.subproy,
      ultimo.act,
    );
    const act = resolveActividadId(catalog, ultimo.proy, sub, ultimo.act);

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

  if (!ifsConnected) {
    return (
      <div className="flex flex-col gap-3 text-[13px] text-[#374151]">
        <p>
          Debes iniciar sesión con tu correo{" "}
          <span className="font-medium">@h-mv.com</span> para registrar horas.
        </p>
        <a href="/login" className="font-semibold text-navy underline">
          Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      {catalogLoading && (
        <LoadingNotice
          variant="banner"
          icon={LOADING_COPY.catalogIfs.icon}
          label={LOADING_COPY.catalogIfs.label}
        />
      )}
      {catalogError && (
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

      <button
        type="button"
        onClick={handleCopiarDiaAnterior}
        className="btn-link self-end"
      >
        <Icon name="copy" size="xs" />
        Copiar día anterior
      </button>

      <Field label="Proyecto" required error={errors.proy}>
        <SearchableSelect
          value={form.proy}
          onChange={handleProyChange}
          options={(catalog?.proyectos ?? []).map((p) => ({
            value: p.id,
            label: `${p.id} – ${p.nombre}`,
          }))}
          placeholder={
            catalogLoading
              ? loadingPlaceholder(LOADING_COPY.projects)
              : TIEMPO_UI_COPY.selectProject
          }
          searchPlaceholder={TIEMPO_UI_COPY.searchProject}
          disabled={catalogLoading && !catalogError}
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
          disabled={!form.proy || catalogLoading}
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
          disabled={!form.sub || catalogLoading}
          error={!!errors.act}
        />
      </Field>

      <div className="flex flex-wrap gap-3.5">
        <div className="min-w-[130px] flex-1">
          <Field label="Fecha" required error={errors.fecha}>
            <MonthDateInput
              value={form.fecha}
              bounds={bounds}
              invalid={!!errors.fecha}
              onChange={(fecha) => {
                patch({ fecha, proy: "", sub: "", act: "", tipo: "" });
                clearError("fecha");
              }}
            />
          </Field>
        </div>

        <div className="min-w-[120px] flex-1">
          <Field label="Tipo de hora" required error={errors.tipo}>
            <Dropdown
              open={tipoOpen}
              onOpenChange={setTipoOpen}
              portal
              trigger={
                <button
                  type="button"
                  disabled={!form.act || tiposLoading}
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
                    <TipoHoraPill tipo={form.tipo} />
                  ) : tiposLoading ? (
                    <LoadingNotice
                      variant="inline"
                      icon={LOADING_COPY.hourTypes.icon}
                      label={LOADING_COPY.hourTypes.label}
                      className="text-[12px]"
                    />
                  ) : (
                    <span className="text-muted">
                      {!form.act
                        ? TIEMPO_UI_COPY.selectActivityFirst
                        : TIEMPO_UI_COPY.selectHourType}
                    </span>
                  )}
                  <DropdownChevron />
                </button>
              }
            >
              {tipos.map((tipo) => (
                <button
                  key={tipo.code}
                  type="button"
                  onClick={() => {
                    patch({ tipo: tipo.code });
                    setTipoOpen(false);
                    clearError("tipo");
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 hover:bg-[#f4f7fb]"
                >
                  <TipoHoraPill tipo={tipo.code} />
                  <span className="text-xs text-muted">{tipo.label}</span>
                </button>
              ))}
            </Dropdown>
          </Field>
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
              {aprobadorLoading ? (
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
    upsertRegistro,
  } = useMiTiempo();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const formKey = modal
    ? `${modal.editId ?? "new"}:${modal.fecha ?? "hoy"}`
    : "closed";

  const labelGuardar = modal?.editId
    ? TIEMPO_UI_COPY.guardarCambios
    : TIEMPO_UI_COPY.guardar;

  const fechaModal = modal
    ? modal.fecha ??
      (modal.editId
        ? findRegistroById(registros, modal.editId)?.fecha
        : undefined)
    : undefined;
  const hayBorradoresEnDia = fechaModal
    ? hayRegistrosBorrador(getRegistrosDia(registros, fechaModal))
    : false;
  const hintEnvio =
    modal?.origen === "lista" && hayBorradoresEnDia
      ? ("lista" as const)
      : modal?.origen === "dia" && hayBorradoresEnDia
        ? ("dia" as const)
        : undefined;

  const handleSave = async (registro: RegistroMock) => {
    setSaving(true);
    const wasRejected =
      modal?.editId &&
      findRegistroById(registros, modal.editId)?.estado === "Rechazado";
    const reg = {
      ...registro,
      estado: wasRejected ? ("Borrador" as const) : registro.estado,
      comentarioRechazo: wasRejected ? "" : registro.comentarioRechazo,
    };

    try {
      await upsertRegistro(reg);
      closeRegistrarModal();
      toast(
        modal?.editId
          ? TIEMPO_UI_COPY.toastRegistroGuardado
          : TIEMPO_UI_COPY.toastRegistroNuevo,
        "navy",
      );
    } catch {
      toast("No se pudo guardar el registro. Intenta de nuevo.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    closeRegistrarModal();
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
            <Button
              type="submit"
              form={FORM_ID}
              variant="primary"
              disabled={saving || !ifsConnected}
              loading={saving}
              loadingLabel="Guardando…"
            >
              {labelGuardar}
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
          registros={registros}
          ifsConnected={ifsConnected}
          onSave={handleSave}
          saving={saving}
          hintEnvio={hintEnvio}
        />
      )}
    </Modal>
  );
}
