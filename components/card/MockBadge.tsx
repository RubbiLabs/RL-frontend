import { FlaskConical } from "lucide-react";

/** Visible marker for cards issued by the mock issuer (no real PAN exists). */
export default function MockBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${className}`}
      title="Issued by the mock card issuer: not a real card"
    >
      <FlaskConical size={10} /> Mock
    </span>
  );
}
