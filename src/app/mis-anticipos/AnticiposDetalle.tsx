"use client";

import { Button } from "@/src/components/ui/Button";
import {
  AnticipoDetailHeader,
  getAnticipoEventBanner,
} from "@/src/components/ui/AnticipoDetailHeader";
import { Card, CardBody } from "@/src/components/ui/Card";
import {
  DetailGrid,
  DetailSection,
  ReadOnlyBlock,
  ReadOnlyField,
} from "@/src/components/ui/DetailView";
import { Icon } from "@/src/components/ui/Icon";
import { TipoAnticipoPill } from "@/src/components/ui/TipoAnticipoPill";
import {
  formatMonto,
  getBeneficiarioDetalle,
  getDirectorProyecto,
  puedeCancelarEmpleado,
  SESSION_EMPLEADO,
  type Anticipo,
  type AnticipoExtra,
} from "@/src/lib/mis-anticipos-mock";

type AnticiposDetalleProps = {
  anticipo: Anticipo;
  extra?: AnticipoExtra;
  onVolver: () => void;
  onCancelar?: () => void;
};

export function AnticiposDetalle({
  anticipo,
  extra,
  onVolver,
  onCancelar,
}: AnticiposDetalleProps) {
  const puedeCancelar = puedeCancelarEmpleado(anticipo);
  const solicitanteNombre =
    anticipo.solicitante || SESSION_EMPLEADO.nombre;
  const beneficiario = getBeneficiarioDetalle(anticipo);
  const director = getDirectorProyecto(anticipo.proy);
  const aprobadorLabel = director
    ? `${director.nombre} (${director.codigo})`
    : anticipo.aprobador || "—";
  const companiaGasto =
    extra?.compania || "HMVINGCO – HMV Ingenieros";
  const banner = getAnticipoEventBanner(
    anticipo.estado,
    extra,
    anticipo.fechaAprob,
  );

  return (
    <div className="content-standard">
      <AnticipoDetailHeader
        parentLabel="Anticipos"
        codigo={anticipo.no}
        nombre={beneficiario.nombre}
        estado={anticipo.estado}
        onVolver={onVolver}
        banner={banner}
        trailingAction={
          puedeCancelar && onCancelar ? (
            <Button variant="danger" onClick={onCancelar}>
              <Icon name="ban" size="xs" />
              Cancelar solicitud
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <DetailSection icon="userCircle" title="Empleado beneficiario">
            {anticipo.paraOtro && (
              <p className="mb-3 text-[12px] leading-snug text-muted">
                Solicitado por{" "}
                <span className="font-semibold text-[#374151]">
                  {solicitanteNombre}
                </span>
              </p>
            )}
            <DetailGrid>
              <ReadOnlyField label="Fecha de solicitud">
                {anticipo.fecha}
              </ReadOnlyField>
              <ReadOnlyField label="Proyecto asociado">
                {anticipo.proy} – {anticipo.proyN}
              </ReadOnlyField>
              <ReadOnlyField label="Aprobador">{aprobadorLabel}</ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyField label="Compañía que asume el gasto">
                {companiaGasto}
              </ReadOnlyField>
              <ReadOnlyField label="Cédula">{beneficiario.cedula}</ReadOnlyField>
              <ReadOnlyField label="Nombre">{beneficiario.nombre}</ReadOnlyField>
            </DetailGrid>
            <DetailGrid className="mt-3">
              <ReadOnlyField label="Cuenta">{beneficiario.cuenta}</ReadOnlyField>
              <ReadOnlyField label="Banco">{beneficiario.banco}</ReadOnlyField>
              <ReadOnlyField label="Tipo de cuenta">
                {beneficiario.tipoCuenta}
              </ReadOnlyField>
            </DetailGrid>
          </DetailSection>
        </CardBody>
      </Card>

      <Card className="mb-3 overflow-visible">
        <CardBody className="py-4">
          <DetailSection icon="wallet" title="Tipo y monto de la solicitud">
            <DetailGrid>
              <ReadOnlyField label="Tipo de solicitud">
                <TipoAnticipoPill tipo={anticipo.tipo} />
              </ReadOnlyField>
              <ReadOnlyField label="Divisa">{anticipo.div}</ReadOnlyField>
              <ReadOnlyField label="Monto" highlight>
                {formatMonto(anticipo.monto, anticipo.div)}
              </ReadOnlyField>
            </DetailGrid>

            {anticipo.tipo === "Viaje" && extra?.fechaIda && (
              <DetailGrid className="mt-3">
                <ReadOnlyField label="Fecha salida">{extra.fechaIda}</ReadOnlyField>
                <ReadOnlyField label="Fecha regreso">
                  {extra.fechaRegreso}
                </ReadOnlyField>
                <ReadOnlyField label="Destino">{extra.destino}</ReadOnlyField>
              </DetailGrid>
            )}

            <DetailGrid className="mt-3">
              <ReadOnlyBlock label="Motivo">{anticipo.motivo}</ReadOnlyBlock>
            </DetailGrid>
          </DetailSection>
        </CardBody>
      </Card>

      {extra?.tl && extra.tl.length > 0 && (
        <Card className="mb-3">
          <CardBody className="py-4">
            <DetailSection icon="clock" title="Actividad">
              <div className="space-y-2">
                {extra.tl.map((t, i) => (
                  <div key={`${t.accion}-${i}`} className="flex gap-2.5">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f8fafc]"
                      style={{ color: t.color }}
                    >
                      <Icon name={t.icon} size="xs" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="text-[13px] font-medium text-[#374151]">
                        {t.accion}
                      </div>
                      <div className="text-[11px] text-muted">
                        {t.usuario} · {t.fecha}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DetailSection>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
