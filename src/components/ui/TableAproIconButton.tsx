import { Icon } from "@/src/components/ui/Icon";

export type TableAproIconVariant = "ok" | "no" | "undo";

type TableAproIconButtonProps = {
  variant: TableAproIconVariant;
  title: string;
  onClick: (e: React.MouseEvent) => void;
};

const variantStyles: Record<TableAproIconVariant, string> = {
  ok: "text-green hover:border-[#86efac] hover:bg-[#dcfce7]",
  no: "text-red hover:border-[#fca5a5] hover:bg-[#fee2e2]",
  undo: "text-muted hover:border-border hover:bg-[#f8fafc]",
};

const variantIcon: Record<TableAproIconVariant, "check" | "x" | "undo"> = {
  ok: "check",
  no: "x",
  undo: "undo",
};

/** Acción inline en fila — 30×30, borde blanco; tab pendientes (aprobar/rechazar) o resueltas (anular). */
export function TableAproIconButton({
  variant,
  title,
  onClick,
}: TableAproIconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[7px] border border-border bg-white text-[12px] transition-colors ${variantStyles[variant]}`}
    >
      <Icon name={variantIcon[variant]} size="xs" />
    </button>
  );
}
