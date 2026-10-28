"use client";
import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import TransactionLoadingModal, { type TransactionStatus } from "@/components/ui/TransactionLoadingModal";

interface TransactionModalContextValue {
  showTxModal: (config: { title: string; description?: string }) => void;
  setTxStatus: (
    status: TransactionStatus,
    patch?: { description?: string; txHash?: string | null; explorerUrl?: string | null; error?: string | null },
  ) => void;
  hideTxModal: () => void;
}

const TransactionModalContext = createContext<TransactionModalContextValue>({
  showTxModal: () => {},
  setTxStatus: () => {},
  hideTxModal: () => {},
});

interface ModalState {
  open: boolean;
  status: TransactionStatus;
  title: string;
  description: string;
  txHash: string | null;
  explorerUrl: string | null;
  error: string | null;
}

const CLOSED: ModalState = {
  open: false,
  status: "idle",
  title: "",
  description: "",
  txHash: null,
  explorerUrl: null,
  error: null,
};

export function TransactionModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>(CLOSED);

  const showTxModal = useCallback((config: { title: string; description?: string }) => {
    setState({
      ...CLOSED,
      open: true,
      status: "signing",
      title: config.title,
      description: config.description ?? "",
    });
  }, []);

  const setTxStatus = useCallback<TransactionModalContextValue["setTxStatus"]>((status, patch = {}) => {
    setState((prev) => ({
      ...prev,
      status,
      description: patch.description ?? prev.description,
      txHash: patch.txHash === undefined ? prev.txHash : patch.txHash,
      explorerUrl: patch.explorerUrl === undefined ? prev.explorerUrl : patch.explorerUrl,
      error: patch.error === undefined ? prev.error : patch.error,
    }));
  }, []);

  const hideTxModal = useCallback(() => setState(CLOSED), []);

  const value = useMemo(() => ({ showTxModal, setTxStatus, hideTxModal }), [showTxModal, setTxStatus, hideTxModal]);

  return (
    <TransactionModalContext.Provider value={value}>
      {children}
      <TransactionLoadingModal
        open={state.open}
        status={state.status}
        title={state.title}
        description={state.description}
        txHash={state.txHash}
        explorerUrl={state.explorerUrl}
        error={state.error}
        onClose={hideTxModal}
      />
    </TransactionModalContext.Provider>
  );
}

export function useTransactionModal() {
  return useContext(TransactionModalContext);
}
