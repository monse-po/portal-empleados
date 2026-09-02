"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { DateInput } from "@/src/components/ui/DateInput";
import { Field } from "@/src/components/ui/Field";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import { Modal } from "@/src/components/ui/Modal";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import { useAsyncAction } from "@/src/lib/use-async-action";
import { formatMonto, parseMontoInput, PROYECTOS_ANT } from "@/src/lib/mis-anticipos-mock";
import {
  getCostCategories,
  getVoucherTypes,
  lineaRequiereAdjunto,
  lookupProveedorIfs,
  type LineaGastoDraft,
} from "@/src/lib/legalizaciones-mock";

function ModalSection({
  icon,
  title,
  hint,
  children,
}: {
  icon: IconName;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[#e5e9f0] pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-navy">
        <Icon name={icon} size="sm" className="text-navy" />
        {title}
      </h3>
      {hint ? (
        <p className="mb-3 text-[12px] leading-snug text-muted">{hint}</p>
      ) : null}
      {children}
    </section>
  );
}

function ModalFieldGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

type LineaGastoModalProps = {
  open: boolean;
  mode: "create" | "edit";
  linea: LineaGastoDraft;
  companiaId: string;
  defaultCurrency: string;
  defaultProyectoId?: string;
  hideProyectoColumn?: boolean;
  lockedCurrency?: string;
  onClose: () => void;
  onSave: (linea: LineaGastoDraft) => void | Promise<void>;
};

function validateDraft(
  draft: LineaGastoDraft,
  hideProyectoColumn?: boolean,
): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  if (!draft.voucherType) errors.voucherType = "Requerido";
  if (!draft.invoiceDate) errors.invoiceDate = "Requerido";
  if (!draft.invoiceNo.trim()) errors.invoiceNo = "Requerido";
  if (!draft.supplierId.trim()) errors.supplierId = "Requerido";
  if (!draft.supplierName.trim()) errors.supplierName = "Requerido";
  if (!draft.costCategory) errors.costCategory = "Requerido";
  if (parseMontoInput(draft.netAmount) <= 0) errors.netAmount = "Indica un monto válido";
  if (!draft.currencyCode) errors.currencyCode = "Requerido";
  if (lineaRequiereAdjunto(draft) && !draft.documentAttachment.trim()) {
    errors.documentAttachment =
      "Adjunta el soporte: el proveedor aún no está en IFS y Contabilidad lo registrará con este comprobante";
  }
  if (!hideProyectoColumn && !draft.proyectoId.trim()) {
    errors.proyectoId = "Requerido";
  }
  return errors;
}

export function LineaGastoModal({
  open,
  mode,
  linea,
  companiaId,
  defaultCurrency,
  defaultProyectoId,
  hideProyectoColumn = false,
  lockedCurrency,
  onClose,
  onSave,
}: LineaGastoModalProps) {
  const [draft, setDraft] = useState<LineaGastoDraft>(linea);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const voucherTypes = getVoucherTypes(companiaId);
  const costCategories = getCostCategories(companiaId);
  const currency = lockedCurrency || draft.currencyCode || defaultCurrency;
  const isDse = draft.voucherType === "DSE";
  const adjuntoObligatorio = lineaRequiereAdjunto(draft);

  useEffect(() => {
    if (!open) return;
    setDraft({
      ...linea,
      currencyCode: lockedCurrency || linea.currencyCode || defaultCurrency,
      proyectoId: linea.proyectoId || defaultProyectoId || "",
    });
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open, linea, lockedCurrency, defaultCurrency, defaultProyectoId]);

  const patch = (next: Partial<LineaGastoDraft>) => {
    setDraft((prev) => ({
      ...prev,
      ...next,
      ...(lockedCurrency ? { currencyCode: lockedCurrency } : {}),
    }));
  };

  useEffect(() => {
    if (!open) return;
    const nit = draft.supplierId.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!nit || nit.replace(/\D/g, "").length < 6) {
      if (draft.supplierLookupStatus !== "idle") {
        patch({ supplierLookupStatus: "idle", supplierInIfs: false });
      }
      return;
    }

    debounceRef.current = setTimeout(() => {
      patch({ supplierLookupStatus: "loading" });
      const result = lookupProveedorIfs(nit);
      if (result.found && result.nombre) {
        patch({
          supplierName: result.nombre,
          supplierInIfs: true,
          supplierLookupStatus: "found",
        });
      } else {
        patch({
          supplierInIfs: false,
          supplierLookupStatus: "not_found",
        });
      }
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, draft.supplierId]);

  const handleSave = () => {
    const toSave = {
      ...draft,
      proyectoId: hideProyectoColumn
        ? defaultProyectoId || draft.proyectoId
        : draft.proyectoId,
    };
    const nextErrors = validateDraft(toSave, hideProyectoColumn);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    return onSave(toSave);
  };

  const { loading: guardando, run: runGuardar } = useAsyncAction(async () => {
    await handleSave();
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={guardando}
      title={mode === "create" ? "Agregar comprobante" : "Editar comprobante"}
      icon="receipt"
      widthClass="max-w-[680px]"
      footer={
        <div className="ml-auto flex gap-2">
          <Button variant="tertiary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={() => void runGuardar()}
            loading={guardando}
            loadingLabel="Guardando…"
          >
            Guardar comprobante
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <ModalSection
          icon="paperclip"
          title="Soporte del comprobante"
          hint={
            adjuntoObligatorio
              ? "Obligatorio: el NIT no está en IFS. Contabilidad usará este archivo para registrar el proveedor."
              : "Adjunta el PDF o imagen del documento. Es el soporte principal de la legalización."
          }
        >
          <div
            className={`rounded-lg border-2 border-dashed px-4 py-5 transition-colors ${
              errors.documentAttachment
                ? "border-[#fca5a5] bg-[#fef2f2]"
                : draft.documentAttachment
                  ? "border-[#86efac] bg-[#f0fdf4]"
                  : "border-[#c7d9ed] bg-[#f8fafc] hover:border-navy/30 hover:bg-[#f4f7fb]"
            }`}
          >
            <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
              <Icon
                name={draft.documentAttachment ? "circleCheck" : "paperclip"}
                size="lg"
                className={
                  draft.documentAttachment ? "text-green" : "text-navy/50"
                }
              />
              <span className="text-[13px] font-semibold text-navy">
                {draft.documentAttachment || "Seleccionar comprobante"}
              </span>
              <span className="text-[11.5px] text-muted">
                PDF, JPG, PNG o XML
                {adjuntoObligatorio
                  ? " · Requerido para proveedores nuevos"
                  : ""}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  patch({ documentAttachment: file?.name ?? "" });
                  if (errors.documentAttachment) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.documentAttachment;
                      return next;
                    });
                  }
                }}
              />
            </label>
            {draft.documentAttachment ? (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    patch({ documentAttachment: "" });
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="inline-flex items-center gap-1 rounded-[5px] border border-[#e5e9f0] bg-white px-2.5 py-1.5 text-[12px] text-muted hover:bg-[#fee2e2] hover:text-[#b91c1c]"
                >
                  <Icon name="x" size="xs" />
                  Quitar archivo
                </button>
              </div>
            ) : null}
          </div>
          {errors.documentAttachment ? (
            <p className="mt-2 text-[11.5px] text-[#b91c1c]">
              {errors.documentAttachment}
            </p>
          ) : null}
        </ModalSection>

        <ModalSection icon="receipt" title="Datos del documento">
          <ModalFieldGrid>
            <Field label="Tipo de documento" required error={errors.voucherType}>
              <SearchableSelect
                value={draft.voucherType}
                onChange={(voucherType) => patch({ voucherType })}
                options={voucherTypes.map((t) => ({
                  value: t.code,
                  label: t.label,
                }))}
                placeholder="Seleccionar…"
                searchPlaceholder="Buscar tipo de documento…"
                error={!!errors.voucherType}
              />
            </Field>

            <Field label="Fecha factura" required error={errors.invoiceDate}>
              <DateInput
                value={draft.invoiceDate}
                onChange={(e) => patch({ invoiceDate: e.target.value })}
                invalid={!!errors.invoiceDate}
                className="ant-field-input"
              />
            </Field>

            <Field label="No. factura" required error={errors.invoiceNo}>
              <input
                value={draft.invoiceNo}
                onChange={(e) => patch({ invoiceNo: e.target.value })}
                placeholder="Número del documento"
                className="ant-field-input"
              />
            </Field>

            {isDse ? (
              <Field label="CUFE">
                <input
                  value={draft.cufe || ""}
                  readOnly
                  placeholder="Generado al legalizar (DIAN)"
                  className="ant-field-input ant-ro-input"
                />
              </Field>
            ) : null}

            <Field label="Categoría de costo" required error={errors.costCategory}>
              <SearchableSelect
                value={draft.costCategory}
                onChange={(costCategory) => patch({ costCategory })}
                options={costCategories.map((t) => ({
                  value: t.code,
                  label: t.label,
                }))}
                placeholder="Seleccionar…"
                searchPlaceholder="Buscar categoría…"
                error={!!errors.costCategory}
              />
            </Field>

            <Field label="Monto" required error={errors.netAmount}>
              <div className="flex h-9 overflow-hidden rounded-[5px] border border-[#e5e9f0] focus-within:border-navy">
                <span className="flex min-w-[46px] items-center justify-center border-r border-[#e5e9f0] bg-[#f3f4f6] px-2 text-[12px] font-medium text-[#374151]">
                  {currency}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.netAmount}
                  onChange={(e) =>
                    patch({ netAmount: e.target.value.replace(/[^\d]/g, "") })
                  }
                  placeholder="0"
                  className="min-w-0 flex-1 border-0 px-2.5 text-right text-[13px] outline-none"
                />
              </div>
            </Field>

            {!lockedCurrency ? (
              <Field label="Divisa línea" required error={errors.currencyCode}>
                <SearchableSelect
                  value={currency}
                  onChange={(currencyCode) => patch({ currencyCode })}
                  options={["COP", "USD", "MXN", "PEN"].map((code) => ({
                    value: code,
                    label: code,
                  }))}
                  placeholder="Seleccionar divisa…"
                  searchPlaceholder="Buscar divisa…"
                  error={!!errors.currencyCode}
                />
              </Field>
            ) : null}

            {!hideProyectoColumn ? (
              <Field label="Proyecto" required error={errors.proyectoId}>
                <SearchableSelect
                  value={draft.proyectoId || defaultProyectoId || ""}
                  onChange={(proyectoId) => patch({ proyectoId })}
                  options={PROYECTOS_ANT.map((p) => ({
                    value: p.id,
                    label: `${p.id} – ${p.nombre}`,
                  }))}
                  placeholder="Seleccionar proyecto…"
                  searchPlaceholder="Buscar proyecto…"
                  error={!!errors.proyectoId}
                />
              </Field>
            ) : null}

            <div className="sm:col-span-2">
              <Field label="Nota">
                <input
                  value={draft.lineDescription}
                  onChange={(e) => patch({ lineDescription: e.target.value })}
                  placeholder="Descripción libre (opcional)"
                  className="ant-field-input"
                />
              </Field>
            </div>
          </ModalFieldGrid>
        </ModalSection>

        <ModalSection
          icon="briefcase"
          title="Proveedor"
          hint="El NIT se consulta en IFS. Si existe, el nombre se completa solo. Si no, puedes dejar el NIT escrito: Contabilidad lo registrará después."
        >
          <ModalFieldGrid>
            <Field label="NIT" required error={errors.supplierId}>
              <input
                value={draft.supplierId}
                onChange={(e) =>
                  patch({
                    supplierId: e.target.value,
                    // Al editar NIT, liberar nombre hasta nueva consulta IFS
                    ...(draft.supplierInIfs
                      ? { supplierName: "", supplierInIfs: false }
                      : {}),
                  })
                }
                placeholder="Escribe el NIT del proveedor"
                className="ant-field-input"
                autoComplete="off"
              />
              {draft.supplierLookupStatus === "loading" ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                  <Icon name="hourglass" size="xs" className="shrink-0" />
                  Cargando datos…
                </p>
              ) : draft.supplierLookupStatus === "idle" &&
                !draft.supplierId.trim() ? (
                <p className="mt-1.5 text-[11.5px] text-muted">
                  Al escribir el NIT se verifica automáticamente en IFS.
                </p>
              ) : null}
            </Field>

            <Field
              label="Nombre / razón social"
              required
              error={errors.supplierName}
            >
              <input
                value={draft.supplierName}
                onChange={(e) => patch({ supplierName: e.target.value })}
                readOnly={draft.supplierInIfs}
                placeholder={
                  draft.supplierInIfs
                    ? "Completado desde IFS"
                    : "Escribe la razón social"
                }
                className={`ant-field-input ${draft.supplierInIfs ? "ant-ro-input" : ""}`}
              />
              {draft.supplierInIfs ? (
                <p className="mt-1.5 text-[11.5px] text-muted">
                  Completado desde IFS — no editable.
                </p>
              ) : draft.supplierLookupStatus === "not_found" ? (
                <p className="mt-1.5 text-[11.5px] text-muted">
                  Escríbelo tú; Contabilidad lo usará al crear el proveedor.
                </p>
              ) : null}
            </Field>
          </ModalFieldGrid>

          {draft.supplierLookupStatus === "found" ? (
            <div className="mt-3 inline-flex w-fit max-w-full items-start gap-2 rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-[12px] leading-snug text-[#15803d]">
              <Icon
                name="circleCheck"
                size="xs"
                className="mt-0.5 shrink-0 text-[#15803d]"
              />
              <span>
                <strong>Proveedor encontrado en IFS.</strong> El nombre se
                asoció automáticamente a este NIT.
              </span>
            </div>
          ) : null}

          {draft.supplierLookupStatus === "not_found" ? (
            <div className="mt-3 inline-flex w-fit max-w-full items-start gap-2 rounded-md border border-[#c7d9ed] bg-[#eef3f9] px-3 py-2 text-[12px] leading-snug text-[#1e40af]">
              <Icon
                name="info"
                size="xs"
                className="mt-0.5 shrink-0 text-[#1e40af]"
              />
              <span>
                <strong>Este NIT aún no está en IFS.</strong> Puedes continuar:
                escribe el nombre, adjunta el soporte arriba y envía la
                legalización. Contabilidad registrará el proveedor de forma
                manual.
              </span>
            </div>
          ) : null}
        </ModalSection>
      </div>

      {parseMontoInput(draft.netAmount) > 0 ? (
        <p className="mt-4 border-t border-[#e5e9f0] pt-4 text-[12px] text-muted">
          Total línea:{" "}
          <span className="font-semibold text-navy">
            {formatMonto(parseMontoInput(draft.netAmount), currency)}
          </span>
        </p>
      ) : null}
    </Modal>
  );
}
