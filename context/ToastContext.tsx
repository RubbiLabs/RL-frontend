"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast, ToastType } from "@/types";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

interface ToastContextValue {
  toasts: Toast[];
  toast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdRef = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4500) => {
      const id = `toast-${++toastIdRef}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        toast,
        success: (t, m) => toast("success", t, m),
        error: (t, m) => toast("error", t, m),
        warning: (t, m) => toast("warning", t, m),
        info: (t, m) => toast("info", t, m),
        dismiss,
        showToast: (type, title, message) => toast(type, title, message),
      }}
    >
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} className="text-[#22577A]" />,
    error: <XCircle size={18} className="text-red-500" />,
    warning: <AlertTriangle size={18} className="text-amber-500" />,
    info: <Info size={18} className="text-blue-500" />,
  };

  const colors: Record<ToastType, string> = {
    success: "border-l-[#22577A]",
    error: "border-l-red-500",
    warning: "border-l-amber-500",
    info: "border-l-blue-500",
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto toast-enter bg-white rounded-xl shadow-xl border border-neutral-200 border-l-4 ${colors[t.type]} p-4 flex items-start gap-3`}
        >
          <div className="mt-0.5 shrink-0">{icons[t.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-neutral-900 text-sm leading-tight">{t.title}</p>
            {t.message && <p className="text-neutral-500 text-xs mt-0.5 leading-snug">{t.message}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
