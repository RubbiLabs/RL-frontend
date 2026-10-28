import { CreditCard } from "lucide-react";

import MockBadge from "@/components/card/MockBadge";
import type { ApiCard } from "@/types/api";

interface Props {
  card: ApiCard;
  holder: string;
  className?: string;
}

/** Front of the Rubbi card, rendered only from API data (never a generated PAN). */
export default function CardVisual({ card, holder, className = "" }: Props) {
  const isMock = card.issuer === "MOCK";
  const frozen = card.status.toUpperCase() === "FROZEN";

  return (
    <div
      className={`relative bg-primary rounded-[15px] p-6 lg:p-7 card-shine aspect-[1.586/1] w-full max-w-[430px] shadow-[0_24px_70px_rgba(34,87,122,0.18)] text-white ${className}`}
    >
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/55">Rubbi Card</p>
          {isMock && <MockBadge />}
        </div>
        <div
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.28em] ${
            frozen ? "bg-red-500/20 text-red-100 border border-red-200/20" : "bg-white/14 text-white"
          }`}
        >
          {frozen ? "Frozen" : card.status.toLowerCase()}
        </div>
      </div>

      <div className="w-10 h-10 rounded-lg bg-[#EBCB7B] mb-8 shadow-inner shadow-white/20" />

      <p className="font-mono text-[clamp(1rem,2vw,1.35rem)] tracking-[0.26em] mb-8">•••• •••• •••• {card.last4}</p>

      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] text-white/45 uppercase tracking-[0.28em] mb-1">Card holder</p>
          <p className="text-sm lg:text-base font-bold">{holder}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/45 uppercase tracking-[0.28em] mb-1">Expires</p>
          <p className="text-sm lg:text-base font-bold">
            {card.expiryMonth.padStart(2, "0")}/{card.expiryYear.slice(-2)}
          </p>
        </div>
        <CreditCard size={18} className="text-white/60" />
      </div>
    </div>
  );
}
