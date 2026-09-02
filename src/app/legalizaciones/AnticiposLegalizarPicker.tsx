"use client";

import { Icon } from "@/src/components/ui/Icon";
import { SearchableSelect } from "@/src/components/ui/SearchableSelect";
import type { AnticipoLegalizable } from "@/src/lib/legalizaciones-mock";
import { formatMonto } from "@/src/lib/mis-anticipos-mock";

type AnticiposLegalizarPickerProps = {
  anticipos: AnticipoLegalizable[];
  value: string;
  onChange: (no: string) => void;
  emptyMessage?: string;
};

export function AnticiposLegalizarPicker({
  anticipos,
  value,
  onChange,
  emptyMessage = "No tienes anticipos pagados por Tesorería pendientes de legalizar.",
}: AnticiposLegalizarPickerProps) {
  if (!anticipos.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#c7d9ed] bg-[#f8fafc] px-4 py-6 text-center text-[13px] text-muted">
        <Icon name="wallet" size="lg" className="mx-auto mb-2 opacity-30" />
        {emptyMessage}
      </div>
    );
  }

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={anticipos.map((a) => ({
        value: a.no,
        label: `${a.no} – ${formatMonto(a.monto, a.div)}`,
        hint: `${a.proy} · ${a.proyN}`,
      }))}
      placeholder="Seleccionar anticipo pagado…"
      searchPlaceholder="Buscar anticipo…"
    />
  );
}
