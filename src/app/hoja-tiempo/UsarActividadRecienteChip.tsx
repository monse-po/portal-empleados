"use client";

import { Dropdown } from "@/src/components/ui/Dropdown";
import { DropdownChevron } from "@/src/components/ui/DropdownAffordance";
import { Icon } from "@/src/components/ui/Icon";
import type { TiempoComboReciente } from "@/src/lib/tiempo-recientes";
import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";

type UsarActividadRecienteChipProps = {
  combos: TiempoComboReciente[];
  selected: TiempoComboReciente | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (combo: TiempoComboReciente) => void;
  disabled?: boolean;
};

export function UsarActividadRecienteChip({
  combos,
  selected,
  open,
  onOpenChange,
  onSelect,
  disabled = false,
}: UsarActividadRecienteChipProps) {
  const picked = Boolean(selected);

  return (
    <Dropdown
      open={open}
      onOpenChange={onOpenChange}
      portal
      fitContent
      menuWidth={300}
      className="w-auto"
      trigger={
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => onOpenChange(!open)}
          className={`inline-flex max-w-[280px] items-center gap-1.5 rounded-full border px-2.5 py-[5px] text-left text-[12px] font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-40 ${
            picked
              ? "border-navy bg-navy text-white"
              : "border-border bg-white text-navy hover:border-[#c7d2e0]"
          }`}
        >
          {picked ? null : <Icon name="clock" size="xs" className="shrink-0" />}
          <span className="min-w-0 truncate">
            {picked
              ? selected.actShort
              : TIEMPO_UI_COPY.usarRecientePlaceholder}
          </span>
          <DropdownChevron
            open={open}
            className={picked ? "text-white" : "text-navy"}
          />
        </button>
      }
    >
      <div className="py-0.5" role="listbox">
        {combos.map((combo) => {
          const isSelected = selected?.key === combo.key;
          return (
            <button
              key={combo.key}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                onSelect(combo);
                onOpenChange(false);
              }}
              className={`flex w-full flex-col items-start gap-0.5 px-2.5 py-2 text-left ${
                isSelected ? "bg-[#eef3f9]" : "hover:bg-[#fafbfc]"
              }`}
            >
              <span className="text-[13px] font-semibold text-[#111]">
                {combo.actShort}
              </span>
              <span className="truncate text-[12px] text-[#4b5563]">
                {combo.proyLabel} · {combo.subLabel}
              </span>
            </button>
          );
        })}
      </div>
    </Dropdown>
  );
}
