"use client";
import React from "react";
import { CheckCircle, Loader2, XCircle, ExternalLink } from "lucide-react";

export type TransactionStatus = "idle" | "signing" | "submitting" | "success" | "error";

interface TransactionLoadingModalProps {
  open: boolean;
  status: TransactionStatus;
  title: string;
  description?: string;
  txHash?: string | null;
  explorerUrl?: string | null;
  error?: string | null;
  onClose: () => void;
}

const statusConfig: Record<TransactionStatus, { icon: React.ReactNode; bg: string }> = {
  idle: { icon: null, bg: "" },
  signing: { icon: <Loader2 size={32} className="text-primary animate-spin" />, bg: "bg-primary/10" },
  submitting: { icon: <Loader2 size={32} className="text-blue-500 animate-spin" />, bg: "bg-blue-50" },
  success: { icon: <CheckCircle size={32} className="text-green-500" />, bg: "bg-green-50" },
  error: { icon: <XCircle size={32} className="text-red-500" />, bg: "bg-red-50" },
};

export default function TransactionLoadingModal({
  open,
  status,
  title,
  description,
  txHash,
  explorerUrl,
  error,
  onClose,
}: TransactionLoadingModalProps) {
  if (!open || status === "idle") return null;

  const config = statusConfig[status];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm animate-scaleIn text-center">
        <div className={`w-16 h-16 rounded-2xl ${config.bg} flex items-center justify-center mx-auto mb-5`}>{config.icon}</div>

        <h3 className="text-lg font-bold text-neutral-900 mb-2">{title}</h3>

        {description && <p className="text-sm text-neutral-500 mb-4 leading-relaxed">{description}</p>}

        {status === "signing" && (
          <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Confirm the transaction in your wallet…
          </div>
        )}

        {status === "submitting" && (
          <div className="flex items-center justify-center gap-2 text-xs text-blue-600 font-medium">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            Submitted, waiting for the ledger to close…
          </div>
        )}

        {txHash && explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-3 inline-flex items-center gap-1"
          >
            View on stellar.expert <ExternalLink size={11} />
          </a>
        )}

        {status === "error" && error && (
          <div className="mt-3 p-3 bg-red-50 rounded-xl">
            <p className="text-xs text-red-600 leading-relaxed break-words">{error}</p>
          </div>
        )}

        {(status === "success" || status === "error") && (
          <button
            onClick={onClose}
            className="mt-5 w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-semibold rounded-xl transition-colors"
          >
            {status === "success" ? "Done" : "Dismiss"}
          </button>
        )}
      </div>
    </div>
  );
}
