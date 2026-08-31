import { Button } from "@/src/components/ui/Button";
import { FloatingActions } from "@/src/components/ui/FloatingActions";
import { Icon } from "@/src/components/ui/Icon";

type BulkActionButtonsProps = {
  onAprobar: () => void | Promise<void>;
  onRechazar: () => void | Promise<void>;
  loadingAprobar?: boolean;
  loadingRechazar?: boolean;
};

/**
 * Aprobar / Rechazar en lote — va a la derecha de la barra de filtros
 * (una sola franja: filtros + acciones).
 */
export function BulkActionButtons({
  onAprobar,
  onRechazar,
  loadingAprobar = false,
  loadingRechazar = false,
}: BulkActionButtonsProps) {
  const busy = loadingAprobar || loadingRechazar;
  return (
    <FloatingActions>
      <Button
        variant="secondary"
        title="Aprobar seleccionados"
        onClick={() => void onAprobar()}
        loading={loadingAprobar}
        loadingLabel="Aprobando…"
        disabled={busy}
      >
        <Icon name="check" size="xs" />
        Aprobar
      </Button>
      <Button
        variant="tertiary"
        title="Rechazar seleccionados"
        onClick={() => void onRechazar()}
        loading={loadingRechazar}
        loadingLabel="Rechazando…"
        disabled={busy}
        className="text-[#9b1c1c] hover:border-[#fbd5d5] hover:bg-[#fde8e8] hover:text-[#9b1c1c]"
      >
        <Icon name="x" size="xs" />
        Rechazar
      </Button>
    </FloatingActions>
  );
}

/** @deprecated Preferir `BulkActionButtons` dentro de la barra de filtros. */
export function BulkSelectionBar({
  onAprobar,
  onRechazar,
  className = "",
  loadingAprobar = false,
  loadingRechazar = false,
  instruction = "Selecciona filas para aprobar o rechazar",
}: {
  count?: number;
  onAprobar: () => void | Promise<void>;
  onRechazar: () => void | Promise<void>;
  className?: string;
  loadingAprobar?: boolean;
  loadingRechazar?: boolean;
  instruction?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3 ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <p className="text-[13px] text-[#4b5563]">{instruction}</p>
      <BulkActionButtons
        onAprobar={onAprobar}
        onRechazar={onRechazar}
        loadingAprobar={loadingAprobar}
        loadingRechazar={loadingRechazar}
      />
    </div>
  );
}
