"use client";

import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Field } from "@/src/components/ui/Field";
import { Icon } from "@/src/components/ui/Icon";
import { PortalSubpageHeader } from "@/src/components/ui/PortalSubpageHeader";
import { SegmentedControl } from "@/src/components/ui/SegmentedControl";
import {
  FormGrid,
  FormGridSpan,
  FormNote,
  FormSection,
  FormStack,
  SolicitudFormCard,
  SolicitudFormFooter,
  SolicitudParaSection,
} from "@/src/components/ui/SolicitudFormLayout";
import { TIPO_LEGALIZACION_OPTIONS } from "@/src/components/ui/TipoLegalizacionPill";
import { useToast } from "@/src/components/ui/Toast";
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
  COMPANIAS_HMV,
  EMP_DET,
  formatMonto,
  getEmpleadosOtroPorEmpresa,
  parseMontoInput,
  PROYECTOS_ANT,
  SESSION_EMPLEADO,
  type LovItem,
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
  const [paraOtro, setParaOtro] = useState(false);
  const [compBenef, setCompBenef] = useState<LovItem | null>(null);
  const [empOtro, setEmpOtro] = useState<LovItem | null>(null);

  const anticipos = useMemo(() => {
    if (paraOtro && !empOtro) return [];
    return getAnticiposParaLegalizar(
      legalizaciones,
      paraOtro ? empOtro!.id : SESSION_EMPLEADO.cedula,
    );
  }, [legalizaciones, paraOtro, empOtro]);

  const empleadosOtroLov = useMemo(
    () =>
      compBenef
        ? getEmpleadosOtroPorEmpresa(compBenef.id, SESSION_EMPLEADO.cedula)
        : [],
    [compBenef],
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
    : paraOtro && compBenef
      ? compBenef.id
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

  const resetAnticipoYLineas = () => {
    patch({
      anticipoNo: "",
      tarjetaRef: "",
      lineas: [],
      destino: emptyDestinoLegalizacion(),
    });
  };

  const handleParaOtroChange = (otro: boolean) => {
    setParaOtro(otro);
    setCompBenef(null);
    setEmpOtro(null);
    resetAnticipoYLineas();
  };

  const handleCompBenefChange = (item: LovItem | null) => {
    setCompBenef(item);
    setEmpOtro((prev) => {
      if (!prev || !item) return null;
      const stillInEmpresa = getEmpleadosOtroPorEmpresa(
        item.id,
        SESSION_EMPLEADO.cedula,
      ).some((e) => e.id === prev.id);
      return stillInEmpresa ? prev : null;
    });
    resetAnticipoYLineas();
  };

  const handleEmpOtroChange = (item: LovItem | null) => {
    setEmpOtro(item);
    resetAnticipoYLineas();
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

  const validar = (): boolean => {
    if (paraOtro) {
      if (!compBenef) {
        toast("Selecciona la empresa del empleado beneficiario", "danger");
        return false;
      }
      if (!empOtro) {
        toast("Selecciona el empleado beneficiario", "danger");
        return false;
      }
    }
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
    return true;
  };

  const buildInput = () => {
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
      paraOtro,
      beneficiarioId: paraOtro ? empOtro?.id : undefined,
      beneficiarioNombre: paraOtro ? empOtro?.nombre : undefined,
    };
  };

  const validarYAbrirEnvio = () => {
    if (!validar()) return;

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
    const no = crearLegalizacion(buildInput());
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

        <SolicitudFormCard>
          <SolicitudParaSection
            paraOtro={paraOtro}
            onParaOtroChange={handleParaOtroChange}
            fecha={hoyDMY()}
            empresa={compBenef}
            onEmpresaChange={handleCompBenefChange}
            empresas={COMPANIAS_HMV}
            empleado={empOtro}
            onEmpleadoChange={handleEmpOtroChange}
            empleados={empleadosOtroLov}
          />
        </SolicitudFormCard>

        <SolicitudFormCard>
          <FormSection icon="send" title="Tipo de legalización">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <div className="min-w-0 flex-1">
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
              </div>
            </div>
          </FormSection>
        </SolicitudFormCard>

        {form.tipo === "Con anticipo" ? (
          <SolicitudFormCard>
            <FormSection icon="wallet" title="Anticipo a legalizar">
              <FormGrid>
                <FormGridSpan span={3}>
                  <Field label="Anticipo pagado" required>
                    <AnticiposLegalizarPicker
                      anticipos={anticipos}
                      value={form.anticipoNo}
                      onChange={handleSelectAnticipo}
                      emptyMessage={
                        paraOtro && !empOtro
                          ? "Selecciona primero la empresa y el empleado beneficiario."
                          : paraOtro
                            ? "Este empleado no tiene anticipos pagados pendientes de legalizar."
                            : "No tienes anticipos pagados por Tesorería pendientes de legalizar."
                      }
                    />
                  </Field>
                </FormGridSpan>

                {paymentRef ? (
                  <PaymentReferenceFormFields reference={paymentRef} />
                ) : null}
              </FormGrid>
            </FormSection>
          </SolicitudFormCard>
        ) : null}

        {form.tipo === "Tarjeta corporativa" ? (
          <SolicitudFormCard>
            <FormSection
              icon="wallet"
              title="Tarjeta corporativa"
              hint={tipoHint}
            >
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
          </SolicitudFormCard>
        ) : null}

        {form.tipo === "Sin anticipos" && tipoHint ? (
          <SolicitudFormCard>
            <FormSection icon="wallet" title="Sin anticipo previo">
              {tipoHint}
            </FormSection>
          </SolicitudFormCard>
        ) : null}

        {form.tipo === "Con anticipo" && paymentRef ? (
          <SolicitudFormCard>
            <DestinoLegalizacionSection
              destino={form.destino}
              onDestinoChange={handleDestinoChange}
              comentario={form.comentario}
              onComentarioChange={(value) => patch({ comentario: value })}
            />
          </SolicitudFormCard>
        ) : null}

        {paymentRef || form.tipo !== "Con anticipo" ? (
          <SolicitudFormCard>
            <FormSection icon="folderOpen" title="Líneas de gasto">
              <FormStack>
                <p className="text-[12.5px] leading-snug text-muted">
                  Cada línea es un gasto de esta legalización; puedes editarlas
                  después en la tabla.
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
              </FormStack>
            </FormSection>
          </SolicitudFormCard>
        ) : null}

        {form.tipo !== "Con anticipo" ? (
          <SolicitudFormCard>
            <DestinoLegalizacionSection
              destino={form.destino}
              onDestinoChange={handleDestinoChange}
              comentario={form.comentario}
              onComentarioChange={(value) => patch({ comentario: value })}
              proyectoPendiente={proyectoLineaPendiente}
            />
          </SolicitudFormCard>
        ) : null}

        <SolicitudFormFooter note="El gerente aprueba esta legalización.">
          <Button variant="tertiary" onClick={onVolver}>
            Descartar
          </Button>
          <Button variant="success" onClick={validarYAbrirEnvio}>
            <Icon name="send" size="xs" />
            Enviar a Aprobación
          </Button>
        </SolicitudFormFooter>
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
