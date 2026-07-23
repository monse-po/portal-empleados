"use client";

import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Card, CardBody } from "@/src/components/ui/Card";
import { Field } from "@/src/components/ui/Field";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import { SegmentedControl } from "@/src/components/ui/SegmentedControl";
import { TIPO_LEGALIZACION_OPTIONS } from "@/src/components/ui/TipoLegalizacionPill";
import { useToast } from "@/src/components/ui/Toast";
import { useAsyncAction } from "@/src/lib/use-async-action";
import { DestinoLegalizacionFields } from "@/src/app/legalizaciones/DestinoLegalizacionFields";
import { AnticiposLegalizarPicker } from "@/src/app/legalizaciones/AnticiposLegalizarPicker";
import { LineasGastoEditor } from "@/src/app/legalizaciones/LineasGastoEditor";
import { EnviarLegalizacionModal } from "@/src/app/legalizaciones/LegalizacionesModals";
import {
  PaymentReferenceFormFields,
  AnticipoReconciliacionBar,
} from "@/src/app/legalizaciones/PaymentReferencePanel";
import { useLegalizaciones } from "@/src/app/legalizaciones/LegalizacionesContext";
import {
  destinoFromProyectoAnticipo,
  draftToLineaGasto,
  emptyDestinoLegalizacion,
  getAnticiposParaLegalizar,
  getPaymentReference,
  hoyDMY,
  labelCostCategory,
  lineaRequiereAdjunto,
  resolveCompaniaId,
  type DestinoLegalizacion,
  type LegalizacionTipo,
  type LineaGastoDraft,
} from "@/src/lib/legalizaciones-mock";
import {
  EMP_DET,
  formatMonto,
  parseMontoInput,
  PROYECTOS_ANT,
} from "@/src/lib/mis-anticipos-mock";

type LegalizacionesFormularioProps = {
  onVolver: () => void;
  onCreada: (no: string) => void;
};

type FormState = {
  tipo: LegalizacionTipo;
  anticipoNo: string;
  tarjetaRef: string;
  destino: DestinoLegalizacion;
  lineas: LineaGastoDraft[];
  comentario: string;
};

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

function FormNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex w-fit max-w-full items-start gap-2 rounded-md border border-[#c7d9ed] bg-[#eef3f9] px-3 py-2 text-[12px] leading-snug text-[#1e40af]">
      <Icon name="info" size="xs" className="mt-0.5 shrink-0 text-[#1e40af]" />
      <span>{children}</span>
    </div>
  );
}

function DestinoLegalizacionSection({
  destino,
  onDestinoChange,
  comentario,
  onComentarioChange,
  proyectoPendiente,
}: {
  destino: DestinoLegalizacion;
  onDestinoChange: (value: DestinoLegalizacion) => void;
  comentario: string;
  onComentarioChange: (value: string) => void;
  proyectoPendiente?: boolean;
}) {
  return (
    <FormSection icon="flag" title="Destino de la legalización">
      <FormGrid className="items-stretch">
        <DestinoLegalizacionFields
          value={destino}
          onChange={onDestinoChange}
          proyectoPendiente={proyectoPendiente}
        />
        <FormGridSpan span={1} className="flex flex-col">
          <Field label="Comentario general (opcional)">
            <textarea
              value={comentario}
              onChange={(e) => onComentarioChange(e.target.value)}
              placeholder="Notas para el aprobador..."
              rows={3}
              className="ant-form-textarea min-h-[76px] w-full flex-1 resize-none px-3 py-2 text-[13px] leading-relaxed focus:border-navy focus:outline-none"
            />
          </Field>
        </FormGridSpan>
      </FormGrid>
    </FormSection>
  );
}

export function LegalizacionesFormulario({
  onVolver,
  onCreada,
}: LegalizacionesFormularioProps) {
  const { crearLegalizacion, legalizaciones } = useLegalizaciones();
  const { toast } = useToast();
  const anticipos = useMemo(
    () => getAnticiposParaLegalizar(legalizaciones),
    [legalizaciones],
  );

  const [form, setForm] = useState<FormState>({
    tipo: "Con anticipo",
    anticipoNo: "",
    tarjetaRef: "",
    destino: emptyDestinoLegalizacion(),
    lineas: [],
    comentario: "",
  });
  const [envioOpen, setEnvioOpen] = useState(false);
  const [resumenHtml, setResumenHtml] = useState("");

  const paymentRef = useMemo(
    () => (form.anticipoNo ? getPaymentReference(form.anticipoNo) : null),
    [form.anticipoNo],
  );

  const defaultDiv = paymentRef?.moneda ?? "COP";
  const companiaId = paymentRef
    ? paymentRef.companiaId
    : resolveCompaniaId(EMP_DET.empresa);
  const defaultProyectoId = form.destino.proyectoId || paymentRef?.proyectoId || "";
  const proyectoLineaPendiente =
    form.tipo !== "Con anticipo" && !form.lineas[0]?.proyectoId;

  const totalLineas = useMemo(
    () =>
      form.lineas.reduce((sum, l) => sum + parseMontoInput(l.netAmount), 0),
    [form.lineas],
  );

  const patch = (next: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...next }));
  };

  const handleSelectAnticipo = (no: string) => {
    if (!no) {
      patch({
        anticipoNo: "",
        lineas: [],
        destino: emptyDestinoLegalizacion(),
      });
      return;
    }
    const ref = getPaymentReference(no);
    patch({
      anticipoNo: no,
      destino: ref ? destinoFromProyectoAnticipo(ref.proyectoId) : emptyDestinoLegalizacion(),
      lineas: ref ? [] : [],
    });
  };

  const handleDestinoChange = (destino: DestinoLegalizacion) => {
    patch({
      destino,
      lineas: form.lineas.map((l) => ({
        ...l,
        proyectoId: destino.proyectoId || l.proyectoId,
      })),
    });
  };

  const handleLineasChange = (lineas: LineaGastoDraft[]) => {
    if (form.tipo === "Con anticipo") {
      patch({ lineas });
      return;
    }

    const proyFromLinea = lineas[0]?.proyectoId ?? "";
    const proyChanged = proyFromLinea !== form.destino.proyectoId;
    patch({
      lineas,
      destino: proyChanged
        ? { proyectoId: proyFromLinea, subproyecto: "", actividad: "" }
        : { ...form.destino, proyectoId: proyFromLinea },
    });
  };

  const lineasValidas = useMemo(
    () =>
      form.lineas
        .map((l) => draftToLineaGasto(l, companiaId))
        .filter((l): l is NonNullable<typeof l> => l !== null),
    [form.lineas, companiaId],
  );

  const validar = (enviar: boolean): boolean => {
    if (form.tipo === "Con anticipo") {
      if (!form.anticipoNo || !paymentRef) {
        toast("Selecciona un anticipo pagado por Tesorería", "danger");
        return false;
      }
    }
    if (form.tipo === "Tarjeta corporativa" && !form.tarjetaRef.trim()) {
      toast("Indica la referencia de la tarjeta corporativa", "danger");
      return false;
    }
    if (!form.destino.proyectoId) {
      toast(
        form.tipo === "Con anticipo"
          ? "Selecciona un anticipo pagado"
          : "Indica el proyecto en la línea de gasto",
        "danger",
      );
      return false;
    }
    if (!form.destino.subproyecto) {
      toast("Selecciona el subproyecto de destino", "danger");
      return false;
    }
    if (!form.destino.actividad) {
      toast("Selecciona la actividad de destino", "danger");
      return false;
    }
    if (!lineasValidas.length) {
      toast("Agrega al menos una línea de gasto completa", "danger");
      return false;
    }
    if (
      form.lineas.some(
        (l) =>
          l.currencyCode &&
          defaultDiv &&
          l.currencyCode !== defaultDiv &&
          form.tipo === "Con anticipo",
      )
    ) {
      toast("La divisa de cada línea debe coincidir con la del anticipo", "danger");
      return false;
    }
    if (enviar) {
      for (const l of form.lineas) {
        if (lineaRequiereAdjunto(l) && !l.documentAttachment.trim()) {
          toast(
            "Adjunto obligatorio cuando el proveedor no está registrado en IFS",
            "danger",
          );
          return false;
        }
        if (
          l.supplierLookupStatus === "not_found" &&
          !l.supplierName.trim()
        ) {
          toast("Indica el nombre del proveedor cuando no está en IFS", "danger");
          return false;
        }
      }
    }
    return true;
  };

  const buildInput = (enviar: boolean) => {
    const proyMeta = PROYECTOS_ANT.find((p) => p.id === form.destino.proyectoId);
    const lineas = lineasValidas.map((l) => ({
      ...l,
      proyectoId: form.destino.proyectoId,
      proyectoNombre: proyMeta?.nombre ?? l.proyectoNombre,
    }));

    return {
      tipo: form.tipo,
      anticipoNo: form.tipo === "Con anticipo" ? form.anticipoNo : undefined,
      tarjetaRef:
        form.tipo === "Tarjeta corporativa" ? form.tarjetaRef.trim() : undefined,
      destino: form.destino,
      lineas,
      comentario: form.comentario.trim() || undefined,
      enviar,
    };
  };

  const { loading: guardando, run: runGuardarBorrador } = useAsyncAction(async () => {
    if (!validar(false)) return;
    const no = crearLegalizacion(buildInput(false));
    if (!no) {
      toast("No se pudo guardar la legalización", "danger");
      return;
    }
    toast(`Legalización ${no} guardada como borrador`, "navy");
    onCreada(no);
  });

  const validarYAbrirEnvio = () => {
    if (!validar(true)) return;

    const lineasHtml = lineasValidas
      .map(
        (l) =>
          `<tr><td class="py-1 pr-3 text-muted">${l.concepto}</td><td class="py-1 pr-3">${labelCostCategory(l.costCategory, companiaId)}</td><td class="py-1 text-right font-medium">${formatMonto(l.netAmount, l.currencyCode)}</td></tr>`,
      )
      .join("");

    const saldoHtml =
      paymentRef && form.tipo === "Con anticipo"
        ? `<div class="mt-3 rounded-md border border-[#e5e9f0] bg-white px-3 py-2 text-[12px]">
            <div class="flex justify-between"><span class="text-muted">Total líneas</span><span class="font-semibold">${formatMonto(totalLineas, paymentRef.moneda)}</span></div>
            <div class="mt-1 flex justify-between"><span class="text-muted">Anticipo pagado</span><span class="font-semibold">${formatMonto(paymentRef.montoPagado, paymentRef.moneda)}</span></div>
            <div class="mt-1 flex justify-between border-t border-[#e5e9f0] pt-1"><span class="text-muted">Diferencia</span><span class="font-bold text-navy">${formatMonto(totalLineas - paymentRef.montoPagado, paymentRef.moneda)}</span></div>
          </div>`
        : "";

    setResumenHtml(`
      ${
        paymentRef
          ? `<div class="mb-4 rounded-lg border border-border bg-[#f8fafc] p-4">
              <div class="text-[11px] font-semibold uppercase tracking-wide text-muted">Anticipo pagado</div>
              <div class="mt-1 text-[13px] font-medium text-navy">${paymentRef.paymentReferenceId} · ${formatMonto(paymentRef.montoPagado, paymentRef.moneda)} · ${paymentRef.fechaPago}</div>
            </div>`
          : ""
      }
      <div class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Líneas de gasto (${lineasValidas.length})</div>
      <table class="w-full text-[12.5px]">${lineasHtml}</table>
      ${saldoHtml}
      ${
        form.comentario.trim()
          ? `<div class="mt-4"><div class="text-[11px] font-semibold uppercase text-muted">Comentario</div><p class="mt-1 text-[13px]">${form.comentario.trim()}</p></div>`
          : ""
      }
    `);
    setEnvioOpen(true);
  };

  const ejecutarEnvio = () => {
    setEnvioOpen(false);
    const no = crearLegalizacion(buildInput(true));
    if (!no) {
      toast("No se pudo enviar la legalización", "danger");
      return;
    }
    toast(`Legalización ${no} enviada a aprobación`, "green");
    onCreada(no);
  };

  const tipoHint =
    form.tipo === "Tarjeta corporativa" ? (
      <FormNote>
        Gastos con tarjeta corporativa; adjunta soporte en cada línea.
      </FormNote>
    ) : form.tipo === "Sin anticipos" ? (
      <FormNote>
        Gastos de bolsillo sin anticipo previo; requieren soporte por línea.
      </FormNote>
    ) : null;

  return (
    <>
      <div className="content-standard">
        <PortalSubpageHeader
          parentLabel="Mis Legalizaciones"
          onVolver={onVolver}
          title="Nueva legalización"
        />

        <Card className="mb-3 overflow-visible">
          <CardBody className="py-4">
            <FormSection icon="send" title="Datos de la solicitud">
              <FormGrid>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-[#374151]">
                    Fecha de solicitud
                  </span>
                  <span className="flex h-9 items-center text-[13px] text-muted">
                    {hoyDMY()}
                  </span>
                </div>
                <FormGridSpan span={2}>
                  <p className="mb-1.5 text-[12px] font-semibold text-[#374151]">
                    Tipo de legalización
                  </p>
                  <SegmentedControl
                    aria-label="Tipo de legalización"
                    value={form.tipo}
                    onChange={(tipo) =>
                      patch({
                        tipo,
                        anticipoNo: "",
                        tarjetaRef: "",
                        destino: emptyDestinoLegalizacion(),
                        lineas: [],
                      })
                    }
                    options={TIPO_LEGALIZACION_OPTIONS}
                  />
                </FormGridSpan>
              </FormGrid>
            </FormSection>
          </CardBody>
        </Card>

        {form.tipo === "Con anticipo" && (
          <Card className="mb-3 overflow-visible">
            <CardBody className="py-4">
              <FormSection icon="wallet" title="Anticipo a legalizar">
                <FormGrid>
                  <FormGridSpan span={3}>
                    <Field label="Anticipo pagado" required>
                      <AnticiposLegalizarPicker
                        anticipos={anticipos}
                        value={form.anticipoNo}
                        onChange={handleSelectAnticipo}
                      />
                    </Field>
                  </FormGridSpan>

                  {paymentRef ? (
                    <PaymentReferenceFormFields reference={paymentRef} />
                  ) : null}
                </FormGrid>
              </FormSection>
            </CardBody>
          </Card>
        )}

        {form.tipo === "Tarjeta corporativa" && (
          <Card className="mb-3 overflow-visible">
            <CardBody className="py-4">
              <FormSection icon="wallet" title="Tarjeta corporativa" hint={tipoHint}>
                <FormGrid>
                  <Field label="Referencia tarjeta corporativa" required>
                    <input
                      value={form.tarjetaRef}
                      onChange={(e) => patch({ tarjetaRef: e.target.value })}
                      placeholder="Ej. Visa corp. ·••• 4821"
                      className="ant-field-input"
                    />
                  </Field>
                </FormGrid>
              </FormSection>
            </CardBody>
          </Card>
        )}

        {form.tipo === "Sin anticipos" && (
          <Card className="mb-3 overflow-visible">
            <CardBody className="py-4">
              <FormSection icon="wallet" title="Sin anticipo previo" hint={tipoHint}>
                <p className="text-[12px] text-muted">
                  Registra cada gasto de bolsillo en las líneas de abajo.
                </p>
              </FormSection>
            </CardBody>
          </Card>
        )}

        {form.tipo === "Con anticipo" && paymentRef ? (
          <Card className="mb-3 overflow-visible">
            <CardBody className="py-4">
              <DestinoLegalizacionSection
                destino={form.destino}
                onDestinoChange={handleDestinoChange}
                comentario={form.comentario}
                onComentarioChange={(value) => patch({ comentario: value })}
              />
            </CardBody>
          </Card>
        ) : null}

        {(paymentRef || form.tipo !== "Con anticipo") && (
          <Card className="mb-3 overflow-visible">
            <CardBody className="py-4">
              <FormSection icon="folderOpen" title="Líneas de gasto">
                <p className="mb-3 text-[12.5px] leading-snug text-muted">
                  Agrega cada comprobante con el botón de abajo; puedes editarlo después en la tabla.
                </p>
                <LineasGastoEditor
                  lineas={form.lineas}
                  companiaId={companiaId}
                  defaultCurrency={defaultDiv}
                  defaultProyectoId={defaultProyectoId}
                  hideProyectoColumn={form.tipo === "Con anticipo"}
                  lockedCurrency={
                    form.tipo === "Con anticipo" ? paymentRef?.moneda : undefined
                  }
                  onChange={handleLineasChange}
                />

                {paymentRef && form.tipo === "Con anticipo" ? (
                  <AnticipoReconciliacionBar
                    totalLineas={totalLineas}
                    reference={paymentRef}
                  />
                ) : null}
              </FormSection>
            </CardBody>
          </Card>
        )}

        {form.tipo !== "Con anticipo" ? (
          <Card className="mb-3 overflow-visible">
            <CardBody className="py-4">
              <DestinoLegalizacionSection
                destino={form.destino}
                onDestinoChange={handleDestinoChange}
                comentario={form.comentario}
                onComentarioChange={(value) => patch({ comentario: value })}
                proyectoPendiente={proyectoLineaPendiente}
              />
            </CardBody>
          </Card>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-5 py-3.5">
          <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <Icon name="info" size="xs" className="text-muted" />
            El gerente aprueba esta legalización.
          </span>
          <div className="flex gap-2.5">
            <Button variant="tertiary" onClick={onVolver}>
              Descartar
            </Button>
            <Button
              variant="secondary"
              onClick={() => void runGuardarBorrador()}
              loading={guardando}
              loadingLabel="Guardando…"
            >
              Guardar borrador
            </Button>
            <Button variant="success" onClick={validarYAbrirEnvio}>
              <Icon name="send" size="xs" />
              Enviar a Aprobación
            </Button>
          </div>
        </div>
      </div>

      <EnviarLegalizacionModal
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
