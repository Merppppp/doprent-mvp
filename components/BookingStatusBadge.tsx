import { BOOKING_STATUS_META } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";

const TONE: Record<string, { bg: string; fg: string }> = {
  neutral: { bg: "var(--surface)", fg: "var(--ink-2)" },
  info: { bg: "var(--info-soft)", fg: "var(--cobalt)" },
  warn: { bg: "var(--warn-soft)", fg: "var(--warn)" },
  success: { bg: "var(--success-soft)", fg: "var(--success)" },
  danger: { bg: "var(--danger-soft)", fg: "var(--danger)" },
};

export default function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS_META[status];
  const tone = TONE[meta.tone] ?? TONE.neutral;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: tone.bg,
        color: tone.fg,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}
