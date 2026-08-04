"use client";

import { useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { ModalConfirmFooter } from "@/src/components/ui/ModalConfirmFooter";
import { EstadoTiempoPill } from "@/src/components/ui/Pill";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import type { RegistroMock } from "@/src/lib/tiempo-registro";
import { formatProyectoEmpleado } from "@/src/lib/tiempo-bridge";

type EliminarRegistroModalProps = {
  open: boolean;
  registro: RegistroMock | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function EliminarRegistroModal({
  open,
  registro,
  onClose,
  onConfirm,
}: EliminarRegistroModalProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      title="Eliminar registro"
      icon="triangleAlert"
      widthClass="max-w-[480px]"
      footer={
        <ModalConfirmFooter
          onCancel={onClose}
          onConfirm={onConfirm}
          confirmLabel="Eliminar registro"
          confirmVariant="danger"
          loadingLabel="Eliminando…"
          onBusyChange={setBusy}
        />
      }
    >
      {registro ? (
        <div className="space-y-4 text-[13px] text-[#374151]">
          <p>
            ¿Eliminar este registro del día? Esta acción no se puede deshacer.
          </p>
          <div className="rounded-lg border border-border bg-[#f8fafc] px-4 py-3">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-medium text-muted">Proyecto</dt>
                <dd className="font-medium text-navy">
                  {formatProyectoEmpleado(registro.proy)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-muted">Actividad</dt>
                <dd>{registro.act}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-muted">Tipo / Horas</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <TipoHoraPill tipo={registro.tipo} />
                  <span className="font-semibold">{registro.horas}h</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium text-muted">Estado</dt>
                <dd>
                  <EstadoTiempoPill estado={registro.estado} />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
