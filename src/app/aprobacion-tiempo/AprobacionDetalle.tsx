"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/Button";
import {
  RecordDetailHeader,
  type RecordEventBanner,
} from "@/src/components/ui/AnticipoDetailHeader";
import { Card, CardBody } from "@/src/components/ui/Card";
import {
  DetailGrid,
  DetailSection,
  ReadOnlyBlock,
  ReadOnlyField,
} from "@/src/components/ui/DetailView";
import { GerenteAccionBar } from "@/src/components/ui/GerenteAccionBar";
import { Icon } from "@/src/components/ui/Icon";
import { EstadoTiempoPill, estadoTiempoPillProps } from "@/src/components/ui/Pill";
import { ProyectoCell } from "@/src/components/ui/DataTable";
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { useToast } from "@/src/components/ui/Toast";
import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";
import { useAsyncAction } from "@/src/lib/use-async-action";
import {
  horasNum,
  proyKey,
  proyNombre,
  type HojaAprobacion,
} from "@/src/lib/aprobacion-tiempo-mock";

type AprobacionDetalleProps = {
  hoja: HojaAprobacion;
  onVolver: () => void;
  onAprobar: (comentario?: string) => void;
  onRechazar: (comentario: string) => void;
  onAnular?: () => void;
  parentLabel?: string;
  /** `panel`: dentro del Card de la tabla, mismo px que las celdas. */
  variant?: "page" | "panel";
};

function getTiempoEventBanner(hoja: HojaAprobacion): RecordEventBanner | null {
  if (!hoja.estadoApro) return null;
  return {
    autor: hoja.aprobador || SESSION_EMPLEADO.nombre,
    fecha: hoja.fechaApro || "—",
    motivo: hoja.comentarioApro || "—",
  };
}

export function AprobacionDetalle({
  hoja,
  onVolver,
  onAprobar,
  onRechazar,
  onAnular,
  parentLabel = "Aprobación de Hoja de Tiempo",
  variant = "page",
}: AprobacionDetalleProps) {
  const [comentario, setComentario] = useState(hoja.comentarioApro || "");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const resuelto = !!hoja.estadoApro;
  const estadoPill = resuelto ? hoja.estadoApro! : "Pendiente";
  const muestraSolicitante = hoja.solicitante !== hoja.nombre;
  const banner = getTiempoEventBanner(hoja);

  const handleRechazar = () => {
    const trimmed = comentario.trim();
    if (!trimmed) {
      setError("Agrega un motivo de rechazo");
      toast("Escribe el motivo del rechazo", "danger");
      return;
    }
    onRechazar(trimmed);
  };

  const { loading: rechazando, run: runRechazar } =
    useAsyncAction(handleRechazar);

  const campos = (
    <DetailGrid>
      <ReadOnlyField label="Fecha">{hoja.fecha}</ReadOnlyField>
      <ReadOnlyField label="Tipo de hora">
        <TipoHoraPill tipo={hoja.tipo} />
      </ReadOnlyField>
      <ReadOnlyField label="Horas reportadas" highlight>
        {horasNum(hoja.horas)}
      </ReadOnlyField>
      <ReadOnlyField label="Proyecto" className="md:col-span-2">
        <ProyectoCell codigo={proyKey(hoja.proy) || hoja.proy} nombre={proyNombre(hoja.proy)} />
      </ReadOnlyField>
      <ReadOnlyField label="Subproyecto">{hoja.subproy || "—"}</ReadOnlyField>
      <ReadOnlyField label="Actividad">{hoja.actividad}</ReadOnlyField>
      <ReadOnlyField label="Cédula">{hoja.cedula}</ReadOnlyField>
      <ReadOnlyField label="Nombre">{hoja.nombre}</ReadOnlyField>
      <ReadOnlyBlock label="Comentario del empleado">
        {hoja.comentarioEmpleado || "—"}
      </ReadOnlyBlock>
    </DetailGrid>
  );

  const accion = !resuelto ? (
    <GerenteAccionBar
      comentario={comentario}
      onComentarioChange={(value) => {
        setComentario(value);
        if (error) setError("");
      }}
      error={error}
      onRechazar={() => void runRechazar()}
      onAprobar={() => onAprobar(comentario.trim() || undefined)}
      loadingRechazar={rechazando}
      hint="Al aprobar, las horas quedan confirmadas en IFS. Esta acción no se puede deshacer."
      placeholder="Ej: Horas conformes / Rechazado — excede horas autorizadas"
    />
  ) : resuelto && onAnular ? (
    <div className="flex items-center justify-between gap-2">
      <EstadoTiempoPill estado={estadoPill} />
      <Button variant="tertiary" onClick={onAnular}>
        <Icon name="undo" size="xs" />
        Anular decisión
      </Button>
    </div>
  ) : null;

  if (variant === "panel") {
    return (
      <div className="px-2 py-3">
        {muestraSolicitante ? (
          <p className="mb-3 text-[12px] leading-snug text-muted">
            Reportado por{" "}
            <span className="font-semibold text-[#374151]">{hoja.solicitante}</span>
          </p>
        ) : null}
        {accion ? <div className="mb-3">{accion}</div> : null}
        {campos}
      </div>
    );
  }

  return (
    <div className="view-wide max-md:pb-24">
      <RecordDetailHeader
        parentLabel={parentLabel}
        codigo={hoja.no}
        nombre={hoja.nombre}
        estado={estadoPill}
        onVolver={onVolver}
        banner={banner}
        resolvePillVariant={(estado) => estadoTiempoPillProps(estado).variant}
        renderEstadoPill={(estado) => <EstadoTiempoPill estado={estado} />}
        trailingAction={
          resuelto && onAnular ? (
            <Button variant="tertiary" onClick={onAnular}>
              <Icon name="undo" size="xs" />
              Anular decisión
            </Button>
          ) : undefined
        }
      />

      {!resuelto && (
        <Card className="mb-3 border-[#c7d9ed] bg-[#fafcff]">
          <CardBody className="py-3">{accion}</CardBody>
        </Card>
      )}

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <DetailSection icon="userCircle" title="Registro">
            {muestraSolicitante && (
              <p className="mb-3 text-[12px] leading-snug text-muted">
                Reportado por{" "}
                <span className="font-semibold text-[#374151]">
                  {hoja.solicitante}
                </span>
              </p>
            )}
            {campos}
          </DetailSection>
        </CardBody>
      </Card>
    </div>
  );
}

export function horasLabel(
  nos: string[],
  getHoja: (no: string) => HojaAprobacion | undefined,
) {
  const total = nos.reduce((a, no) => {
    const h = getHoja(no);
    return a + (h ? horasNum(h.horas) : 0);
  }, 0);
  return String(Math.round(total * 10) / 10);
}
