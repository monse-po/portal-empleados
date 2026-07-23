"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "@/src/components/ui/Button";
import { useAsyncAction } from "@/src/lib/use-async-action";

type ConfirmVariant = "primary" | "success" | "danger" | "secondary" | "tertiary";

type ModalConfirmFooterProps = {
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  confirmLabel: ReactNode;
  confirmVariant?: ConfirmVariant;
  cancelLabel?: string;
  loadingLabel?: ReactNode;
  onBusyChange?: (busy: boolean) => void;
};

export function ModalConfirmFooter({
  onCancel,
  onConfirm,
  confirmLabel,
  confirmVariant = "primary",
  cancelLabel = "Cancelar",
  loadingLabel,
  onBusyChange,
}: ModalConfirmFooterProps) {
  const { loading, run } = useAsyncAction(onConfirm);

  useEffect(() => {
    onBusyChange?.(loading);
  }, [loading, onBusyChange]);

  return (
    <>
      <Button variant="tertiary" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        variant={confirmVariant}
        onClick={() => void run()}
        loading={loading}
        loadingLabel={loadingLabel}
      >
        {confirmLabel}
      </Button>
    </>
  );
}
