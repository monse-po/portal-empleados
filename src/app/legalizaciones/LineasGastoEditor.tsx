"use client";

import { useMemo, useState } from "react";
import { Button } from "@/src/components/ui/Button";
import {
  ACTION_COL_WIDTH,
  DataTable,
  dataTd,
  dataTdTruncate,
  dataThWithAlign,
} from "@/src/components/ui/DataTable";
import { Icon } from "@/src/components/ui/Icon";
import { LineaGastoModal } from "@/src/app/legalizaciones/LineaGastoModal";
import {
  createEmptyLineaGasto,
  labelCostCategory,
  labelVoucherType,
  type LineaGastoDraft,
} from "@/src/lib/legalizaciones-mock";
import { formatMonto, parseMontoInput } from "@/src/lib/mis-anticipos-mock";

type LineasGastoEditorProps = {
  lineas: LineaGastoDraft[];
  companiaId: string;
  defaultCurrency: string;
  defaultProyectoId?: string;
  onChange: (lineas: LineaGastoDraft[]) => void;
  hideProyectoColumn?: boolean;
  lockedCurrency?: string;
};

type ModalState = {
  open: boolean;
  mode: "create" | "edit";
  linea: LineaGastoDraft;
  editId: string | null;
};

export function LineasGastoEditor({
  lineas,
  companiaId,
  defaultCurrency,
  defaultProyectoId,
  onChange,
  hideProyectoColumn = false,
  lockedCurrency,
}: LineasGastoEditorProps) {
  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: "create",
    linea: createEmptyLineaGasto(defaultCurrency, defaultProyectoId ?? ""),
    editId: null,
  });

  const totalLineas = useMemo(
    () => lineas.reduce((sum, l) => sum + parseMontoInput(l.netAmount), 0),
    [lineas],
  );
  const currency = lockedCurrency || defaultCurrency;

  const openCreate = () => {
    setModal({
      open: true,
      mode: "create",
      linea: createEmptyLineaGasto(defaultCurrency, defaultProyectoId ?? ""),
      editId: null,
    });
  };

  const openEdit = (linea: LineaGastoDraft) => {
    setModal({
      open: true,
      mode: "edit",
      linea: { ...linea },
      editId: linea.id,
    });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, open: false }));
  };

  const handleSave = (saved: LineaGastoDraft) => {
    if (modal.mode === "edit" && modal.editId) {
      onChange(lineas.map((l) => (l.id === modal.editId ? saved : l)));
    } else {
      onChange([...lineas, saved]);
    }
    closeModal();
  };

  const removeLinea = (id: string) => {
    onChange(lineas.filter((l) => l.id !== id));
  };

  return (
    <>
      {!lineas.length ? (
        <div className="rounded-lg border border-dashed border-[#c7d9ed] bg-[#f8fafc] px-4 py-8 text-center">
          <p className="text-[13px] text-muted">
            Agrega cada comprobante con el formulario de captura.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={openCreate}
          >
            <Icon name="plus" size="xs" />
            Agregar comprobante
          </Button>
        </div>
      ) : (
        <>
          <DataTable
            colWidths={[
              "10%",
              "11%",
              "9%",
              "22%",
              "12%",
              "13%",
              "16%",
              ACTION_COL_WIDTH,
            ]}
          >
            <thead>
              <tr>
                {[
                  ["Tipo", "text-left"],
                  ["No. factura", "text-left"],
                  ["Fecha", "text-left"],
                  ["Proveedor", "text-left"],
                  ["Categoría", "text-left"],
                  ["Monto", "text-right"],
                  ["Soporte", "text-left"],
                  ["", "text-center"],
                ].map(([col, align]) => (
                  <th key={col || "acciones"} className={dataThWithAlign(align)}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineas.map((linea) => (
                <tr
                  key={linea.id}
                  onClick={() => openEdit(linea)}
                  className="cursor-pointer transition-colors hover:bg-[#fafbfc]"
                >
                  <td className={dataTd}>
                    {linea.voucherType
                      ? labelVoucherType(linea.voucherType, companiaId)
                      : "—"}
                  </td>
                  <td className={dataTd}>{linea.invoiceNo || "—"}</td>
                  <td className={`${dataTd} text-muted`}>
                    {linea.invoiceDate.includes("-")
                      ? linea.invoiceDate.split("-").reverse().join("/")
                      : linea.invoiceDate || "—"}
                  </td>
                  <td className={`${dataTd} text-[12px]`}>
                    <div className="truncate">{linea.supplierName || "—"}</div>
                    {linea.supplierId ? (
                      <div className="truncate text-[11px] text-muted">
                        {linea.supplierId}
                      </div>
                    ) : null}
                  </td>
                  <td className={dataTd}>
                    {linea.costCategory
                      ? labelCostCategory(linea.costCategory, companiaId)
                      : "—"}
                  </td>
                  <td className={`${dataTd} text-right font-semibold`}>
                    {parseMontoInput(linea.netAmount) > 0
                      ? formatMonto(
                          parseMontoInput(linea.netAmount),
                          linea.currencyCode || currency,
                        )
                      : "—"}
                  </td>
                  <td className={`${dataTd} text-left`}>
                    {linea.documentAttachment ? (
                      <span
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#c7d9ed] bg-[#eef3f9] px-2 py-1 text-[10px] font-semibold text-navy"
                        title={linea.documentAttachment}
                      >
                        <Icon
                          name="paperclip"
                          size="sm"
                          className="shrink-0 text-navy"
                        />
                        <span className={`min-w-0 ${dataTdTruncate}`}>
                          {linea.documentAttachment}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td
                    className={`${dataTd} text-center`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(linea)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-[#eef3f9] hover:text-navy"
                        title="Editar"
                      >
                        <Icon name="pencil" size="xs" />
                      </button>
                      {lineas.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeLinea(linea.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-[#fee2e2] hover:text-[#b91c1c]"
                          title="Quitar"
                        >
                          <Icon name="x" size="xs" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          {totalLineas > 0 ? (
            <div className="mt-2 flex justify-end text-[12px] text-muted">
              Total declarado:{" "}
              <span className="ml-1 font-semibold text-navy">
                {formatMonto(totalLineas, currency)}
              </span>
            </div>
          ) : null}
        </>
      )}

      {lineas.length > 0 ? (
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="secondary" onClick={openCreate}>
            <Icon name="plus" size="xs" />
            Otra línea
          </Button>
        </div>
      ) : null}

      <LineaGastoModal
        open={modal.open}
        mode={modal.mode}
        linea={modal.linea}
        companiaId={companiaId}
        defaultCurrency={defaultCurrency}
        defaultProyectoId={defaultProyectoId}
        hideProyectoColumn={hideProyectoColumn}
        lockedCurrency={lockedCurrency}
        onClose={closeModal}
        onSave={handleSave}
      />
    </>
  );
}
