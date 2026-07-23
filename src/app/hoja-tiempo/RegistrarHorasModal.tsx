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
import { Modal } from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/Toast";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { useMiTiempo, type GuardarRegistroMode } from "@/src/app/hoja-tiempo/MiTiempoContext";
import {
  findActividadMeta,
  resolveActividadId,
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
  getMesActualBounds,
  HORAS_OPTIONS,
  inferSubproyecto,
  JER_TIEMPO,
  PROYECTOS,
  resolveFechaMes,
  TIPO_HORA,
  type RegistroMock,
} from "@/src/lib/mi-tiempo-mock";
import {
  fetchTiempoCatalogAction,
  fetchTiposHoraAction,
} from "@/src/server/mi-tiempo-catalog-actions";

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
  onSave: (registro: RegistroMock, mode: GuardarRegistroMode) => void | Promise<void>;
  saving?: boolean;
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
  useIfsCatalog: boolean,
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
    const esNormal = useIfsCatalog
      ? tipoCatFromOptions(form.tipo, tipos) === "normal"
      : (TIPO_HORA[form.tipo]?.cat ?? "normal") === "normal";
    if (esNormal) {
    const horasExistentes = getHorasNormales(
      registros,
      form.fecha,
      editId,
    );
    if (horasExistentes + horasNum > 8.5) {
      errors.horas = `Tope de 8.5h normales por día (ya tienes ${horasExistentes}h)`;
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
}: RegistroHorasFormProps) {
  const bounds = getMesActualBounds();
  const [catalog, setCatalog] = useState<TiempoCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [tipos, setTipos] = useState<TiempoTipoHoraOption[]>([]);
  const [tiposLoading, setTiposLoading] = useState(false);
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

    void fetchTiempoCatalogAction(form.fecha).then((result) => {
      if (cancelled) return;
      setCatalogLoading(false);
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

  const mockSubs =
    form.proy && JER_TIEMPO[form.proy]
      ? Object.keys(JER_TIEMPO[form.proy].subs)
      : [];
  const mockActs =
    form.proy && form.sub && JER_TIEMPO[form.proy]?.subs[form.sub]
      ? JER_TIEMPO[form.proy].subs[form.sub]
      : [];
  const proyEntry = form.proy ? catalog?.porProyecto[form.proy] : undefined;
  const subs = useIfsCatalog ? (proyEntry?.subs ?? []) : mockSubs.map((s) => ({ id: s, label: s }));
  const actividades = useIfsCatalog
    ? (proyEntry?.subs.find((s) => s.id === form.sub)?.actividades ?? [])
    : mockActs.map((a) => ({ id: a, label: a, activitySeq: 0, activityNo: a }));
  const actMeta = useIfsCatalog
    ? findActividadMeta(catalog, form.proy, form.sub, form.act)
    : null;
  const aprobador =
    form.proy && JER_TIEMPO[form.proy]
      ? JER_TIEMPO[form.proy].aprobador
      : "Según el proyecto";

  useEffect(() => {
    if (!useIfsCatalog || !form.proy || !form.sub || !form.act || !form.fecha) {
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
    useIfsCatalog,
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
    const submitter = (event.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | null;
    const mode: GuardarRegistroMode =
      submitter?.dataset.saveMode === "enviar" ? "enviar" : "guardar";

    const nextErrors = validateForm(form, registros, tipos, useIfsCatalog, editId);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.horas?.includes("8.5h")) {
        toast("Superaste el límite de 8.5h normales por día", "danger");
      }
      return;
    }

    const horasNum = parseFloat(form.horas);
    const actLabel = useIfsCatalog ? (actMeta?.label ?? form.act) : form.act;

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
        estado: "Registrado",
        aprobador,
        comentarioRechazo: "",
      },
      mode,
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

    const ultimo = registros[anterior][registros[anterior].length - 1];
    const sub = useIfsCatalog
      ? resolveSubproyectoId(catalog, ultimo.proy, ultimo.subproy, ultimo.act)
      : inferSubproyecto(ultimo.proy, ultimo.act, ultimo.subproy);
    const act = useIfsCatalog
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
      {useIfsCatalog && catalogLoading && (
        <p className="text-xs text-muted">Cargando catálogo IFS…</p>
      )}
      {useIfsCatalog && catalogError && (
        <p className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
          {catalogError}
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
          options={
            useIfsCatalog
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
            useIfsCatalog && catalogLoading
              ? "Cargando proyectos…"
              : "Seleccionar..."
          }
          searchPlaceholder="Buscar proyecto..."
          disabled={useIfsCatalog && (catalogLoading || !catalog?.proyectos.length)}
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
              ? "Seleccionar subproyecto..."
              : "Selecciona un proyecto primero"
          }
          searchPlaceholder="Buscar subproyecto..."
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
              ? "Seleccionar actividad..."
              : "Selecciona un subproyecto primero"
          }
          searchPlaceholder="Buscar actividad..."
          disabled={!form.sub || (useIfsCatalog && catalogLoading)}
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
                patch(
                  useIfsCatalog
                    ? { fecha, proy: "", sub: "", act: "", tipo: "" }
                    : { fecha },
                );
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
                  disabled={useIfsCatalog ? !form.act || tiposLoading : false}
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
                  ) : (
                    <span className="text-muted">
                      {useIfsCatalog && tiposLoading
                        ? "Cargando…"
                        : useIfsCatalog && !form.act
                          ? "Elige actividad primero"
                          : "Seleccionar..."}
                    </span>
                  )}
                  <DropdownChevron />
                </button>
              }
            >
              {(useIfsCatalog
                ? tipos
                : Object.keys(TIPO_HORA).map((code) => ({
                    code,
                    label: TIPO_HORA[code].n,
                    cat: TIPO_HORA[code].cat,
                  }))
              ).map((tipo) => (
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
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap gap-3.5">
        <div className="min-w-[130px] flex-1">
          <Field label="Estado">
            <div className="flex h-9 items-center rounded-lg border border-border bg-[#f8fafc] px-3 text-[13px] text-muted">
              Registrado
            </div>
          </Field>
        </div>
        <div className="min-w-[130px] flex-1">
          <Field label="Aprobador">
            <div className="flex h-9 items-center rounded-lg border border-border bg-[#f8fafc] px-3 text-[13px] text-muted">
              {aprobador}
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

      <div className="space-y-2 rounded-lg border border-[#e5e9f0] bg-[#f8fafc] px-3 py-2.5 text-[11.5px] leading-relaxed text-muted">
        <p>
          <span className="font-semibold text-[#374151]">Agregar al día:</span>{" "}
          guarda como borrador. Puedes editarlo o eliminarlo cuando quieras.
        </p>
        <p>
          <span className="font-semibold text-[#15803d]">Enviar a Aprobación:</span>{" "}
          envía al gerente los registros en borrador de ese día.
        </p>
      </div>

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
    upsertRegistroYEnviarDia,
  } = useMiTiempo();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<GuardarRegistroMode | null>(null);

  const formKey = modal
    ? `${modal.editId ?? "new"}:${modal.fecha ?? "hoy"}`
    : "closed";

  const handleSave = async (registro: RegistroMock, mode: GuardarRegistroMode) => {
    setSaving(true);
    setSaveMode(mode);
    const wasRejected =
      modal?.editId &&
      findRegistroById(registros, modal.editId)?.estado === "Rechazado";
    const reg = {
      ...registro,
      estado: wasRejected ? ("Registrado" as const) : registro.estado,
      comentarioRechazo: wasRejected ? "" : registro.comentarioRechazo,
    };

    try {
      if (mode === "enviar") {
        const enviados = await upsertRegistroYEnviarDia(reg);
        closeRegistrarModal();
        if (!enviados.length) {
          toast("No hay borradores para enviar", "warn");
          return;
        }
        toast(
          enviados.length > 1
            ? `${enviados.length} registros enviados a aprobación`
            : "Día cerrado y enviado a aprobación",
          "green",
        );
        return;
      }

      await upsertRegistro(reg);
      closeRegistrarModal();
      toast(
        modal?.editId
          ? "Registro actualizado en el día"
          : "Agregado al día — aún no se envió a aprobación",
        "navy",
      );
    } catch {
      toast(
        mode === "enviar"
          ? "No se pudo enviar a aprobación. Intenta de nuevo."
          : "No se pudo guardar el registro. Intenta de nuevo.",
        "danger",
      );
    } finally {
      setSaving(false);
      setSaveMode(null);
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
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                form={FORM_ID}
                variant="secondary"
                data-save-mode="guardar"
                disabled={saving}
                loading={saving && saveMode === "guardar"}
                loadingLabel="Guardando…"
              >
                Agregar al día
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                variant="success"
                data-save-mode="enviar"
                disabled={saving}
                loading={saving && saveMode === "enviar"}
                loadingLabel="Enviando…"
              >
                <Icon name="send" size="xs" />
                Enviar a Aprobación
              </Button>
            </div>
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
        />
      )}
    </Modal>
  );
}
