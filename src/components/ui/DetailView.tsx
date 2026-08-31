import { Icon, type IconName } from "@/src/components/ui/Icon";

export function DetailSection({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-navy">
        <Icon name={icon} size="sm" className="text-navy" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function DetailGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function ReadOnlyField({
  label,
  children,
  highlight,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`.trim()}>
      <span className="text-[12px] font-semibold text-[#374151]">{label}</span>
      <div
        className={`flex min-h-9 w-full items-center overflow-hidden rounded-[5px] border border-border bg-[#f3f4f6] px-2.5 py-1.5 text-[13px] leading-snug break-words text-[#374151] ${highlight ? "font-bold text-navy" : ""}`}
      >
        <div className="min-w-0 w-full">{children}</div>
      </div>
    </div>
  );
}

export function ReadOnlyBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 md:col-span-3">
      <span className="text-[12px] font-semibold text-[#374151]">{label}</span>
      <div className="rounded-[5px] border border-border bg-[#f3f4f6] px-3 py-2 text-[13px] leading-relaxed text-[#374151]">
        {children}
      </div>
    </div>
  );
}
