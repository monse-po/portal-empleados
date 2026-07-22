"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import { Field } from "@/src/components/ui/Field";
import { Icon } from "@/src/components/ui/Icon";
import { Modal } from "@/src/components/ui/Modal";
import { SelectControl } from "@/src/components/ui/DropdownAffordance";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import { formatMonto, parseMontoInput, PROYECTOS_ANT } from "@/src/lib/mis-anticipos-mock";
import {
  getCostCategories,
  getVoucherTypes,
  lineaRequiereAdjunto,
  lookupProveedorIfs,
  type LineaGastoDraft,
} from "@/src/lib/legalizaciones-mock";

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
  onSave: (linea: LineaGastoDraft) => void;
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
    errors.documentAttachment = "Obligatorio — proveedor no registrado en IFS";
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
    onSave(toSave);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Agregar comprobante" : "Editar comprobante"}
      icon="folderOpen"
      widthClass="max-w-[680px]"
      footer={
        <div className="ml-auto flex gap-2">
          <Button variant="tertiary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleSave}>
            Guardar comprobante
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tipo de documento" required error={errors.voucherType}>
          <SelectControl
            value={draft.voucherType}
            onChange={(e) => patch({ voucherType: e.target.value })}
            className="ant-field-input"
          >
            <option value="">Seleccionar…</option>
            {voucherTypes.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </SelectControl>
        </Field>

        <Field label="Fecha factura" required error={errors.invoiceDate}>
          <input
            type="date"
            value={draft.invoiceDate}
            onChange={(e) => patch({ invoiceDate: e.target.value })}
            className="ant-field-input cursor-pointer"
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
        ) : (
          <div className="hidden sm:block" aria-hidden />
        )}

        <Field label="NIT proveedor" required error={errors.supplierId}>
          <input
            value={draft.supplierId}
            onChange={(e) => patch({ supplierId: e.target.value })}
            placeholder="NIT / RFC / RUC"
            className="ant-field-input"
          />
          {draft.supplierLookupStatus === "loading" ? (
            <p className="mt-1 text-[11px] text-muted">Validando en IFS…</p>
          ) : draft.supplierLookupStatus === "found" ? (
            <p className="mt-1 text-[11px] text-[#15803d]">Proveedor registrado en IFS</p>
          ) : draft.supplierLookupStatus === "not_found" ? (
            <p className="mt-1 text-[11px] text-[#b45309]">
              No encontrado en IFS — indica nombre y adjunta soporte
            </p>
          ) : null}
        </Field>

        <Field label="Nombre proveedor" required error={errors.supplierName}>
          <input
            value={draft.supplierName}
            onChange={(e) => patch({ supplierName: e.target.value })}
            readOnly={draft.supplierInIfs}
            placeholder="Razón social"
            className={`ant-field-input ${draft.supplierInIfs ? "ant-ro-input" : ""}`}
          />
        </Field>

        <Field label="Categoría de costo" required error={errors.costCategory}>
          <SelectControl
            value={draft.costCategory}
            onChange={(e) => patch({ costCategory: e.target.value })}
            className="ant-field-input"
          >
            <option value="">Seleccionar…</option>
            {costCategories.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </SelectControl>
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
            <SelectControl
              value={currency}
              onChange={(e) => patch({ currencyCode: e.target.value })}
              className="ant-field-input"
            >
              <option value="COP">COP</option>
              <option value="USD">USD</option>
              <option value="MXN">MXN</option>
              <option value="PEN">PEN</option>
            </SelectControl>
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
              className="ant-field-input"
            />
          </Field>
        ) : null}

        <div className={hideProyectoColumn ? "sm:col-span-2" : ""}>
          <Field label="Nota">
            <input
              value={draft.lineDescription}
              onChange={(e) => patch({ lineDescription: e.target.value })}
              placeholder="Descripción libre (opcional)"
              className="ant-field-input"
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="Adjunto"
            required={adjuntoObligatorio}
            error={errors.documentAttachment}
          >
            <div className="flex items-center gap-2">
              <label className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[5px] border border-dashed border-[#c7d9ed] bg-white px-3 text-[12px] hover:bg-[#f4f7fb]">
                <Icon name="paperclip" size="xs" className="shrink-0 text-muted" />
                <span
                  className={`truncate ${draft.documentAttachment ? "font-medium text-navy" : "text-muted"}`}
                >
                  {draft.documentAttachment || "Adjuntar PDF o imagen"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    patch({ documentAttachment: file?.name ?? "" });
                  }}
                />
              </label>
              {draft.documentAttachment ? (
                <button
                  type="button"
                  onClick={() => {
                    patch({ documentAttachment: "" });
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="inline-flex h-9 shrink-0 items-center gap-1 rounded-[5px] border border-[#e5e9f0] bg-white px-2.5 text-[12px] text-muted hover:bg-[#fee2e2] hover:text-[#b91c1c]"
                >
                  <Icon name="x" size="xs" />
                  Quitar
                </button>
              ) : null}
            </div>
          </Field>
        </div>
      </div>

      {parseMontoInput(draft.netAmount) > 0 ? (
        <p className="mt-4 text-[12px] text-muted">
          Total línea:{" "}
          <span className="font-semibold text-navy">
            {formatMonto(parseMontoInput(draft.netAmount), currency)}
          </span>
        </p>
      ) : null}
    </Modal>
  );
}
