import { Button } from "@/src/components/ui/Button";
import { Icon } from "@/src/components/ui/Icon";

type GerenteAccionBarProps = {
  comentario: string;
  onComentarioChange: (value: string) => void;
  onRechazar: () => void | Promise<void>;
  onAprobar: () => void | Promise<void>;
  hint: string;
  error?: string;
  placeholder?: string;
  aprobarLabel?: string;
  loadingAprobar?: boolean;
  loadingRechazar?: boolean;
};

export function GerenteAccionBar({
  comentario,
  onComentarioChange,
  onRechazar,
  onAprobar,
  hint,
  error,
  placeholder = "Comentario (requerido para rechazar, opcional para aprobar)",
  aprobarLabel = "Aprobar",
  loadingAprobar = false,
  loadingRechazar = false,
}: GerenteAccionBarProps) {
  const busy = loadingAprobar || loadingRechazar;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-navy">
          <Icon name="checkSquare" size="sm" className="text-navy" />
          Acción del gerente
        </h2>
        <span className="text-[10.5px] text-muted">
          Requerido para rechazar, opcional para aprobar
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={comentario}
          onChange={(e) => onComentarioChange(e.target.value)}
          placeholder={placeholder}
          disabled={busy}
          className={`h-9 min-w-0 flex-1 rounded-[5px] border bg-white px-2.5 text-[13px] focus:border-navy focus:outline-none disabled:opacity-60 ${error ? "border-red bg-[#fff5f5]" : "border-border"}`}
        />
        <Button
          variant="danger"
          className="shrink-0"
          onClick={() => void onRechazar()}
          loading={loadingRechazar}
          loadingLabel="Rechazando…"
          disabled={busy}
        >
          <Icon name="x" size="xs" />
          Rechazar
        </Button>
        <Button
          variant="success"
          className="shrink-0"
          onClick={() => void onAprobar()}
          loading={loadingAprobar}
          loadingLabel="Aprobando…"
          disabled={busy}
        >
          <Icon name="check" size="xs" />
          {aprobarLabel}
        </Button>
      </div>

      {error ? (
        <span className="mt-1 block text-[11px] text-red">{error}</span>
      ) : (
        <p className="mt-1.5 flex items-center gap-1 text-[10.5px] leading-snug text-muted">
          <Icon name="info" size="xs" className="shrink-0 text-navy" />
          {hint}
        </p>
      )}
    </div>
  );
}
