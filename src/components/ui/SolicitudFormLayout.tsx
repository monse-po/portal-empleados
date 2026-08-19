import type { ReactNode } from "react";
import { Card, CardBody } from "@/src/components/ui/Card";
import { Icon, type IconName } from "@/src/components/ui/Icon";

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

/** Card de sección con padding y margen homogéneos del sistema Card */
export function SolicitudFormCard({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-visible">
      <CardBody>{children}</CardBody>
    </Card>
  );
}

/** Barra inferior de acciones (Descartar / Enviar…) */
export function SolicitudFormFooter({
  note,
  children,
}: {
  note: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-5 py-4 max-md:flex-col max-md:px-4 max-md:py-3">
      <span className="flex items-center gap-1.5 text-[11.5px] text-muted max-md:items-start max-md:leading-snug">
        <Icon name="info" size="xs" className="text-muted max-md:mt-0.5 max-md:shrink-0" />
        {note}
      </span>
      <div className="flex flex-wrap gap-2.5 max-md:w-full max-md:flex-col-reverse max-md:gap-2 max-md:[&_button]:min-h-12 max-md:[&_button]:w-full">
        {children}
      </div>
    </div>
  );
}
