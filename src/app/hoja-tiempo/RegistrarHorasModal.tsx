"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/src/components/ui/Button";
import { Dropdown } from "@/src/components/ui/Dropdown";
import { Field } from "@/src/components/ui/Field";
import { DropdownChevron, SelectControl } from "@/src/components/ui/DropdownAffordance";
import { Icon } from "@/src/components/ui/Icon";
import {
  inputClassWithError,
  MonthDateInput,
} from "@/src/components/ui/MonthDateInput";
import { Modal } from "@/src/components/ui/Modal";
import { useToast } from "@/src/components/ui/Toast";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { useMiTiempo, type GuardarRegistroMode } from "@/src/app/hoja-tiempo/MiTiempoContext";
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
  onSave: (registro: RegistroMock, mode: GuardarRegistroMode) => void;
};

function buildInitialForm(
  editId: string | undefined,
  defaultFecha: string | undefined,
  registros: Record<string, RegistroMock[]>,
): FormState {
  const bounds = getMesActualBounds();

  if (editId) {
    const reg = findRegistroById(registros, editId);
    if (reg) {
      return {
        proy: reg.proy,
        sub: inferSubproyecto(reg.proy, reg.act, reg.subproy),
        act: reg.act,
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
  } else if (
    form.tipo &&
    TIPO_HORA[form.tipo]?.cat === "normal"
  ) {
    const horasExistentes = getHorasNormales(
      registros,
      form.fecha,
      editId,
    );
    if (horasExistentes + horasNum > 8.5) {
      errors.horas = `Tope de 8.5h normales por día (ya tienes ${horasExistentes}h)`;
    }
  }

  return errors;
}

function RegistroHorasForm({
  formId,
  editId,
  defaultFecha,
  registros,
  onSave,
}: RegistroHorasFormProps) {
  const bounds = getMesActualBounds();
  const [form, setForm] = useState(() =>
    buildInitialForm(editId, defaultFecha, registros),
  );
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [tipoOpen, setTipoOpen] = useState(false);
  const { toast } = useToast();

  const subs =
    form.proy && JER_TIEMPO[form.proy]
      ? Object.keys(JER_TIEMPO[form.proy].subs)
      : [];
  const acts =
    form.proy && form.sub && JER_TIEMPO[form.proy]?.subs[form.sub]
      ? JER_TIEMPO[form.proy].subs[form.sub]
      : [];
  const aprobador =
    form.proy && JER_TIEMPO[form.proy]
      ? JER_TIEMPO[form.proy].aprobador
      : "Según el proyecto";

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
    patch({ proy, sub: "", act: "" });
    clearError("proy");
  };

  const handleSubChange = (sub: string) => {
    patch({ sub, act: "" });
    clearError("sub");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | null;
    const mode: GuardarRegistroMode =
      submitter?.dataset.saveMode === "enviar" ? "enviar" : "guardar";

    const nextErrors = validateForm(form, registros, editId);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.horas?.includes("8.5h")) {
        toast("Superaste el límite de 8.5h normales por día", "danger");
      }
      return;
    }

    const horasNum = parseFloat(form.horas);
    const apr = JER_TIEMPO[form.proy]?.aprobador || "";

    onSave(
      {
        id: editId ?? `r${Date.now()}`,
        proy: form.proy,
        subproy: form.sub,
        act: form.act,
        tipo: form.tipo,
        horas: horasNum,
        fecha: form.fecha,
        comentario: form.comentario,
        estado: "Registrado",
        aprobador: apr,
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
    const sub = inferSubproyecto(ultimo.proy, ultimo.act, ultimo.subproy);

    patch({
      proy: ultimo.proy,
      sub,
      act: ultimo.act,
      tipo: ultimo.tipo,
      horas: String(ultimo.horas),
      comentario: ultimo.comentario || "",
    });
    setErrors({});
    toast(`Copiado del ${formatFechaLegible(anterior, false)}`, "navy");
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <button
        type="button"
        onClick={handleCopiarDiaAnterior}
        className="btn-link self-end"
      >
        <Icon name="copy" size="xs" />
        Copiar día anterior
      </button>

      <Field label="Proyecto" required error={errors.proy}>
        <SelectControl
          value={form.proy}
          onChange={(e) => handleProyChange(e.target.value)}
          className={inputClassWithError(!!errors.proy)}
        >
          <option value="">Seleccionar...</option>
          {PROYECTOS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id} – {p.nombre}
            </option>
          ))}
        </SelectControl>
      </Field>

      <Field label="Subproyecto" required error={errors.sub}>
        <SelectControl
          value={form.sub}
          disabled={!form.proy}
          onChange={(e) => handleSubChange(e.target.value)}
          className={inputClassWithError(!!errors.sub)}
        >
          <option value="">
            {form.proy
              ? "Seleccionar subproyecto..."
              : "Selecciona un proyecto primero"}
          </option>
          {subs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectControl>
      </Field>

      <Field label="Actividad" required error={errors.act}>
        <SelectControl
          value={form.act}
          disabled={!form.sub}
          onChange={(e) => {
            patch({ act: e.target.value });
            clearError("act");
          }}
          className={inputClassWithError(!!errors.act)}
        >
          <option value="">
            {form.sub
              ? "Seleccionar actividad..."
              : "Selecciona un subproyecto primero"}
          </option>
          {acts.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </SelectControl>
      </Field>

      <div className="flex flex-wrap gap-3.5">
        <div className="min-w-[130px] flex-1">
          <Field label="Fecha" required error={errors.fecha}>
            <MonthDateInput
              value={form.fecha}
              bounds={bounds}
              invalid={!!errors.fecha}
              onChange={(fecha) => {
                patch({ fecha });
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
                  onClick={(event) => {
                    event.stopPropagation();
                    setTipoOpen((open) => !open);
                  }}
                  className={`flex min-h-[38px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors hover:border-[#9fb3cc] focus:border-navy focus:outline-none ${
                    errors.tipo
                      ? "border-red bg-[#fff5f5]"
                      : "border-[#c7d2e0] bg-white"
                  }`}
                >
                  {form.tipo ? (
                    <TipoHoraPill tipo={form.tipo} />
                  ) : (
                    <span className="text-muted">Seleccionar...</span>
                  )}
                  <DropdownChevron />
                </button>
              }
            >
              {Object.keys(TIPO_HORA).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => {
                    patch({ tipo });
                    setTipoOpen(false);
                    clearError("tipo");
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2 py-1.5 hover:bg-[#f4f7fb]"
                >
                  <TipoHoraPill tipo={tipo} />
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
          guarda sin enviar. Puedes seguir editando.
        </p>
        <p>
          <span className="font-semibold text-[#15803d]">Enviar a Aprobación:</span>{" "}
          envía el día al gerente. Después ya no se edita.
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
    upsertRegistro,
    upsertRegistroYEnviarDia,
  } = useMiTiempo();
  const { toast } = useToast();

  const formKey = modal
    ? `${modal.editId ?? "new"}:${modal.fecha ?? "hoy"}`
    : "closed";

  const handleSave = async (registro: RegistroMock, mode: GuardarRegistroMode) => {
    const wasRejected =
      modal?.editId &&
      findRegistroById(registros, modal.editId)?.estado === "Rechazado";
    const reg = {
      ...registro,
      estado: wasRejected ? ("Registrado" as const) : registro.estado,
      comentarioRechazo: wasRejected ? "" : registro.comentarioRechazo,
    };

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
  };

  return (
    <Modal
      open={!!modal}
      onClose={closeRegistrarModal}
      title={modal?.editId ? "Editar registro" : "Registrar horas"}
      icon="clock"
      widthClass="max-w-[580px]"
      footer={
        modal ? (
          <>
            <Button type="button" variant="tertiary" onClick={closeRegistrarModal}>
              Cancelar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                form={FORM_ID}
                variant="secondary"
                data-save-mode="guardar"
              >
                Agregar al día
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                variant="success"
                data-save-mode="enviar"
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
          onSave={handleSave}
        />
      )}
    </Modal>
  );
}
