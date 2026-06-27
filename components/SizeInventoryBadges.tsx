import { sizeLabel } from "@/lib/types";

type VariantInv = {
  id: string;
  size: string;
  quantity: number;
  available: boolean;
};

/**
 * Per-size inventory chips for the seller product table: shows free/total stock
 * for *today* (free = quantity − bookings physically out today). Red when a size
 * is fully out; struck-through when the size is turned off.
 */
export default function SizeInventoryBadges({
  variants,
  bookedToday,
  fallbackSize,
}: {
  variants: VariantInv[];
  /** variantId → number of units physically out today. */
  bookedToday: Record<string, number>;
  /** Legacy single size string when the product has no variants. */
  fallbackSize?: string | null;
}) {
  if (variants.length === 0) {
    return <span className="text-ink-2">{fallbackSize ? sizeLabel(fallbackSize) : "—"}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {variants.map((v) => {
        const booked = Math.min(v.quantity, bookedToday[v.id] ?? 0);
        const free = Math.max(0, v.quantity - booked);
        const isFull = v.available && free === 0;
        return (
          <span
            key={v.id}
            className={`inline-flex flex-col items-start whitespace-nowrap rounded-md px-2 py-1 text-[11px] leading-tight ${
              !v.available
                ? "bg-surface text-ink-3"
                : isFull
                  ? "bg-danger-soft text-danger"
                  : "bg-bg-hover text-ink-2"
            }`}
          >
            <span className={`font-semibold ${!v.available ? "line-through" : ""}`}>
              {sizeLabel(v.size)} · {v.quantity} ตัว
            </span>
            {v.available ? (
              <span className="font-normal opacity-80">ติดเช่า {booked} · ว่าง {free}</span>
            ) : (
              <span className="font-normal opacity-80">ปิดให้เช่า</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
