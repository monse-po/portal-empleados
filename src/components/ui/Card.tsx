import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`mb-4 overflow-visible rounded-lg border border-border bg-white ${className}`}
    >
      {children}
    </div>
  );
}

type CardHeaderProps = {
  children: ReactNode;
  className?: string;
  right?: ReactNode;
};

export function CardHeader({ children, className = "", right }: CardHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-t-lg border-b border-border bg-[#fafbfc] px-[22px] py-[13px] text-xs font-semibold text-navy ${className}`}
    >
      <div className="flex flex-col">{children}</div>
      {right}
    </div>
  );
}

type CardBodyProps = {
  children: ReactNode;
  className?: string;
};

export function CardBody({ children, className = "" }: CardBodyProps) {
  return <div className={`px-[22px] py-5 ${className}`}>{children}</div>;
}
