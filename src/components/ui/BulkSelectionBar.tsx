import { Button } from "@/src/components/ui/Button";
import { Icon } from "@/src/components/ui/Icon";

type BulkSelectionBarProps = {
  count: number;
  onAprobar: () => void;
  onRechazar: () => void;
  className?: string;
};

export function BulkSelectionBar({
  count,
  onAprobar,
  onRechazar,
  className = "",
}: BulkSelectionBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy bg-[#eef3f9] px-4 py-3 ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-navy px-2 text-[13px] font-bold text-white">
          {count}
        </span>
        <span className="text-[13px] font-semibold text-navy">
          {count === 1 ? "seleccionado" : "seleccionados"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="success"
          title="Aprobar seleccionados"
          onClick={onAprobar}
        >
          <Icon name="check" size="xs" />
          Aprobar
        </Button>
        <Button
          variant="danger"
          title="Rechazar seleccionados"
          onClick={onRechazar}
        >
          <Icon name="x" size="xs" />
          Rechazar
        </Button>
      </div>
    </div>
  );
}
