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
import { TipoHoraPill } from "@/src/components/ui/TipoHoraPill";
import { useToast } from "@/src/components/ui/Toast";
import { useAsyncAction } from "@/src/lib/use-async-action";
import { horasNum, type HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";

type AprobacionDetalleProps = {
  hoja: HojaAprobacion;
  onVolver: () => void;
  onAprobar: (comentario?: string) => void;
  onRechazar: (comentario: string) => void;
  onAnular?: () => void;
};

function getTiempoEventBanner(hoja: HojaAprobacion): RecordEventBanner | null {
  if (!hoja.estadoApro) return null;
  return {
    autor: hoja.aprobador || "Carlos Rivas Mora",
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

  return (
    <div className="content-standard">
      <RecordDetailHeader
        parentLabel="Aprobación de Hoja de Tiempo"
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
          <CardBody className="py-3">
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
          </CardBody>
        </Card>
      )}

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <DetailSection icon="userCircle" title="Empleado y registro">
            {muestraSolicitante && (
              <p className="mb-3 text-[12px] leading-snug text-muted">
                Reportado por{" "}
                <span className="font-semibold text-[#374151]">
                  {hoja.solicitante}
                </span>
              </p>
            )}
            <DetailGrid>
              <ReadOnlyField label="Fecha del registro">
                {hoja.fecha}
              </ReadOnlyField>
              <ReadOnlyField label="Proyecto">{hoja.proy}</ReadOnlyField>
              <ReadOnlyField label="Subproyecto">
                {hoja.subproy || "—"}
              </ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyField label="Actividad">{hoja.actividad}</ReadOnlyField>
              <ReadOnlyField label="Cédula">{hoja.cedula}</ReadOnlyField>
              <ReadOnlyField label="Nombre">{hoja.nombre}</ReadOnlyField>
            </DetailGrid>
          </DetailSection>
        </CardBody>
      </Card>

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <DetailSection icon="clock" title="Tipo y horas reportadas">
            <DetailGrid>
              <ReadOnlyField label="Tipo de hora">
                <TipoHoraPill tipo={hoja.tipo} />
              </ReadOnlyField>
              <ReadOnlyField label="Horas reportadas" highlight>
                {hoja.horas}
              </ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyBlock label="Comentario del empleado">
                {hoja.comentarioEmpleado || "—"}
              </ReadOnlyBlock>
            </DetailGrid>
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
  return `${Math.round(total * 10) / 10}h`;
}
