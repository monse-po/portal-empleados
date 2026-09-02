"use client";

import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/src/components/ui/SearchableSelect";
import type { LovItem } from "@/src/lib/anticipos-registro";

type LovPickerProps = {
  value: LovItem | null;
  onChange: (item: LovItem | null) => void;
  items: LovItem[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  valueLabel?: (item: LovItem) => string;
};

function toOption(
  item: LovItem,
  valueLabel?: (item: LovItem) => string,
): SearchableSelectOption {
  const custom = valueLabel?.(item);
  if (custom) {
    const hint =
      item.nombre && item.nombre !== custom
        ? item.nombre
        : item.sub && item.sub !== custom
          ? item.sub
          : undefined;
    return { value: item.id, label: custom, hint };
  }
  return {
    value: item.id,
    label: item.nombre ? `${item.id} – ${item.nombre}` : item.id,
    hint: item.sub || undefined,
  };
}

export function LovPicker({
  value,
  onChange,
  items,
  placeholder,
  searchPlaceholder = "Buscar...",
  disabled = false,
  error = false,
  valueLabel,
}: LovPickerProps) {
  return (
    <SearchableSelect
      value={value?.id ?? ""}
      onChange={(id) => onChange(items.find((item) => item.id === id) ?? null)}
      options={items.map((item) => toOption(item, valueLabel))}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      error={error}
    />
  );
}
