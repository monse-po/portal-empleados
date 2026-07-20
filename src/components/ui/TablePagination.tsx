"use client";

import { TABLE_PAGE_SIZE } from "@/src/components/ui/DataTable";

type TablePaginationProps = {
  page: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
};

export function TablePagination({
  page,
  total,
  pageSize = TABLE_PAGE_SIZE,
  onPageChange,
}: TablePaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  if (pages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[12px] text-muted">
      <span>
        Mostrando {start + 1}–{end} de {total} registros
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="cursor-pointer rounded border border-border px-2 py-1 disabled:opacity-40"
        >
          ‹
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`cursor-pointer rounded border px-2.5 py-1 ${p === safePage ? "border-navy bg-[#eef3f9] font-semibold text-navy" : "border-border"}`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={safePage >= pages}
          onClick={() => onPageChange(safePage + 1)}
          className="cursor-pointer rounded border border-border px-2 py-1 disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}
