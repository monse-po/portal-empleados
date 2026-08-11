"use client";

import { useRef } from "react";
import { Icon } from "@/src/components/ui/Icon";

export type FileAttachmentValue = {
  nombre: string;
  /** Tamaño en KB (opcional). */
  sizeKb?: number;
};

type FileAttachmentFieldProps = {
  value: FileAttachmentValue | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  accept?: string;
  emptyLabel?: string;
  className?: string;
};

function formatSizeKb(sizeKb: number): string {
  if (sizeKb >= 1024) return `${(sizeKb / 1024).toFixed(1)} MB`;
  return `${sizeKb} KB`;
}

/**
 * Adjunto de un solo archivo: vacío (dashed) o nombre + quitar.
 * Para reemplazar: quitar y volver a adjuntar.
 */
export function FileAttachmentField({
  value,
  onSelect,
  onClear,
  accept = ".pdf,image/*",
  emptyLabel = "Adjuntar PDF o imagen",
  className = "",
}: FileAttachmentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
    e.target.value = "";
  };

  if (value) {
    return (
      <div
        className={`flex h-9 items-center gap-2 rounded-[5px] border border-border bg-[#f8fafc] px-3 ${className}`.trim()}
      >
        <Icon name="paperclip" size="xs" className="shrink-0 text-navy" />
        <span
          className="min-w-0 flex-1 truncate text-[12px] font-medium text-navy"
          title={value.nombre}
        >
          {value.nombre}
          {value.sizeKb != null ? (
            <span className="font-normal text-muted">
              {" "}
              · {formatSizeKb(value.sizeKb)}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-[#fee2e2] hover:text-[#b91c1c]"
          title="Quitar archivo"
          aria-label="Quitar archivo"
        >
          <Icon name="x" size="xs" />
        </button>
      </div>
    );
  }

  return (
    <label
      className={`flex h-9 w-full cursor-pointer items-center gap-2 rounded-[5px] border border-dashed border-[#c7d9ed] bg-white px-3 text-[12px] hover:bg-[#f4f7fb] ${className}`.trim()}
    >
      <Icon name="paperclip" size="xs" className="shrink-0 text-muted" />
      <span className="min-w-0 truncate text-muted">{emptyLabel}</span>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />
    </label>
  );
}
