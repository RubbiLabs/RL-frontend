import React from "react";

const STYLES: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-100 text-green-700",
  PAUSED: "bg-amber-100 text-amber-700",
  PAST_DUE: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-neutral-100 text-neutral-600",
  PENDING: "bg-blue-100 text-blue-700",
  SETTLED: "bg-blue-100 text-blue-700",
  PENDING_TREASURY: "bg-amber-100 text-amber-800",
  FROZEN: "bg-red-100 text-red-700",
};

export default function StatusPill({ status, title }: { status: string; title?: string }) {
  const key = status.toUpperCase();
  return (
    <span
      title={title}
      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
        STYLES[key] ?? "bg-neutral-100 text-neutral-600"
      }`}
    >
      {key.replace(/_/g, " ")}
    </span>
  );
}
