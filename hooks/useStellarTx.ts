"use client";
import { useCallback, useState } from "react";

import { useStellarWallet } from "@/context/StellarWalletContext";
import { useToast } from "@/context/ToastContext";
import { useTransactionModal } from "@/context/TransactionModalContext";
import { explorerTxUrl, type StellarConfig } from "@/lib/stellar/config";
import { errorMessage, StellarTxError, type InvokeResult, type SignTransaction } from "@/lib/stellar/invoke";

export interface TxRunner {
  /** Drives the transaction modal through signing → submitting → success/error. */
  run: <T extends InvokeResult>(
    label: { title: string; description?: string; successTitle?: string },
    fn: (ctx: { config: StellarConfig; address: string; sign: SignTransaction }) => Promise<T>,
  ) => Promise<T | null>;
  isRunning: boolean;
}

/**
 * Wraps a contract call with the shared transaction modal, toast feedback
 * and error mapping. Returns `null` when the call failed (already reported).
 */
export function useStellarTx(): TxRunner {
  const { config, address, signTransaction } = useStellarWallet();
  const { showTxModal, setTxStatus } = useTransactionModal();
  const { error: toastError, success } = useToast();
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback<TxRunner["run"]>(
    async (label, fn) => {
      if (!config || !address) {
        toastError("Wallet not connected", "Connect your wallet and sign in first.");
        return null;
      }
      setIsRunning(true);
      showTxModal({ title: label.title, description: label.description });

      const sign: SignTransaction = async (xdr) => {
        setTxStatus("signing");
        const signed = await signTransaction(xdr);
        setTxStatus("submitting");
        return signed;
      };

      try {
        const result = await fn({ config, address, sign });
        setTxStatus("success", {
          description: label.successTitle ?? "Confirmed on the ledger.",
          txHash: result.hash,
          explorerUrl: explorerTxUrl(config, result.hash),
        });
        success(label.successTitle ?? "Transaction confirmed");
        return result;
      } catch (error) {
        const message = error instanceof StellarTxError ? error.message : errorMessage(error);
        const hash = error instanceof StellarTxError ? error.details.hash ?? null : null;
        setTxStatus("error", {
          error: message,
          txHash: hash,
          explorerUrl: hash ? explorerTxUrl(config, hash) : null,
        });
        return null;
      } finally {
        setIsRunning(false);
      }
    },
    [address, config, setTxStatus, showTxModal, signTransaction, success, toastError],
  );

  return { run, isRunning };
}
