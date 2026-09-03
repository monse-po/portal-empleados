import type { ReactNode } from "react";
import { Card, CardBody } from "@/src/components/ui/Card";
import { Field } from "@/src/components/ui/Field";
import { FloatingActions } from "@/src/components/ui/FloatingActions";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import { LovPicker } from "@/src/components/ui/LovPicker";
import { SegmentedControl } from "@/src/components/ui/SegmentedControl";
import type { LovItem } from "@/src/lib/anticipos-registro";

/** Espaciado vertical entre bloques dentro de una sección */
export function FormStack({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-4 ${className}`.trim()}>{children}</div>
  );
}

/** Grilla de campos de solicitud (1 / 2 / 3 columnas) */
export function FormGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 md:grid-cols-3 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function FormGridSpan({
  children,
  span = 1,
  className = "",
}: {
  children: ReactNode;
  span?: 1 | 2 | 3;
  className?: string;
}) {
  const spanClass =
    span === 3 ? "md:col-span-3" : span === 2 ? "md:col-span-2" : "";
  return (
    <div className={`min-w-0 ${spanClass} ${className}`.trim()}>{children}</div>
  );
}

export function FormSection({
  icon,
  title,
  hint,
  children,
}: {
  icon: IconName;
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-[13px] font-bold text-navy">
        <Icon name={icon} size="sm" className="text-navy" />
        {title}
      </h2>
      {hint ? <div className="mb-4">{hint}</div> : null}
      {children}
    </section>
  );
}

/** Nota contextual bajo el título de la página */
export function FormContextNote({ children }: { children: ReactNode }) {
  return (
    <p className="mb-5 -mt-1 text-[12.5px] leading-snug text-muted">
      {children}
    </p>
  );
}

export function FormHint({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex w-fit max-w-full items-start gap-2 rounded-md border border-[#c7d9ed] bg-[#eef3f9] px-3 py-2.5 text-[12px] leading-snug text-[#1e40af]">
      <Icon name="info" size="xs" className="mt-0.5 shrink-0 text-[#1e40af]" />
      <span>{children}</span>
    </div>
  );
}

/** Hint operativo / regla de negocio — misma familia visual que FormHint */
export function FormNote({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex w-fit max-w-full items-start gap-2 rounded-md border border-[#c7d9ed] bg-[#eef3f9] px-3 py-2.5 text-[12px] leading-snug text-[#1e40af] ${className}`.trim()}
    >
      <Icon name="info" size="xs" className="mt-0.5 shrink-0 text-[#1e40af]" />
      <span>{children}</span>
    </div>
  );
}

type SolicitudParaSectionProps = {
  paraOtro: boolean;
  onParaOtroChange: (otro: boolean) => void;
  fecha: string;
  hint?: ReactNode;
  empresa: LovItem | null;
  onEmpresaChange: (item: LovItem | null) => void;
  empresas: LovItem[];
  empleado: LovItem | null;
  onEmpleadoChange: (item: LovItem | null) => void;
  empleados: LovItem[];
};

/**
 * Misma “Solicitud para” en anticipos, legalizaciones y DSE:
 * toggle + empresa/empleado en una fila, fecha siempre a la derecha.
 */
export function SolicitudParaSection({
  paraOtro,
  onParaOtroChange,
  fecha,
  hint,
  empresa,
  onEmpresaChange,
  empresas,
  empleado,
  onEmpleadoChange,
  empleados,
}: SolicitudParaSectionProps) {
  return (
    <FormSection icon="send" title="Solicitud para">
      <FormStack>
        <div className="flex items-end gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-4 gap-y-3">
            <div className="w-fit shrink-0">
              <SegmentedControl
                aria-label="Solicitud para"
                value={paraOtro ? "otro" : "mi"}
                onChange={(v) => onParaOtroChange(v === "otro")}
                options={[
                  { value: "mi", label: "Para mí" },
                  { value: "otro", label: "Para otro empleado" },
                ]}
              />
            </div>
            {paraOtro ? (
              <>
                <div className="min-w-[200px] max-w-sm flex-1">
                  <Field label="Empresa del empleado beneficiario" required>
                    <LovPicker
                      value={empresa}
                      onChange={onEmpresaChange}
                      items={empresas}
                      placeholder="Seleccionar empresa"
                      searchPlaceholder="Buscar empresa o país..."
                    />
                  </Field>
                </div>
                {empresa ? (
                  <div className="min-w-[200px] max-w-sm flex-1">
                    <Field label="Empleado beneficiario" required>
                      <LovPicker
                        value={empleado}
                        onChange={onEmpleadoChange}
                        items={empleados}
                        placeholder="Seleccionar empleado"
                        searchPlaceholder="Buscar por cédula o nombre…"
                        valueLabel={(it) => it.nombre}
                      />
                    </Field>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="text-[12px] font-semibold text-[#374151]">
              Fecha de solicitud
            </span>
            <span className="flex h-9 items-center text-[13px] text-muted">
              {fecha}
            </span>
          </div>
        </div>
        {paraOtro && hint ? <FormHint>{hint}</FormHint> : null}
      </FormStack>
    </FormSection>
  );
}

/** Card de sección con padding y margen homogéneos del sistema Card */
export function SolicitudFormCard({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-visible">
      <CardBody>{children}</CardBody>
    </Card>
  );
}

/** Barra inferior de acciones (Descartar / Enviar…). En teléfono los botones flotan. */
export function SolicitudFormFooter({
  note,
  children,
}: {
  note: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-5 py-4 max-md:mt-2 max-md:border-0 max-md:bg-transparent max-md:px-0 max-md:py-0">
      <span className="flex items-start gap-1.5 pb-24 text-[11.5px] leading-snug text-muted md:items-center md:pb-0">
        <Icon name="info" size="xs" className="mt-0.5 shrink-0 text-muted md:mt-0" />
        {note}
      </span>
      <FloatingActions>{children}</FloatingActions>
    </div>
  );
}
