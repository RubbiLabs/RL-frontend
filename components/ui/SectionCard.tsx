import React from "react";

interface Props {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function SectionCard({ title, subtitle, action, children, className = "" }: Props) {
  return (
    <section className={`bg-white rounded-2xl border border-neutral-100 shadow-sm ${className}`}>
      <div className="p-5 lg:p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-neutral-900">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 lg:p-6">{children}</div>
    </section>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-bold text-neutral-700">{title}</p>
      {children && <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">{children}</p>}
    </div>
  );
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
