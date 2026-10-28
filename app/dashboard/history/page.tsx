import React, { Suspense } from "react";

import TransactionHistoryView from "@/components/history/TransactionHistoryView";

export default function TransactionHistoryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Loading transaction history…</p>}>
      <TransactionHistoryView />
    </Suspense>
  );
}
