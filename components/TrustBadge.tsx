/**
 * components/TrustBadge.tsx — Seller-facing renter reliability badge.
 *
 * Renders a small pill badge derived from the renter's past booking outcomes.
 * Intentionally subtle: NORMAL tier (fine history) renders nothing to avoid
 * clutter. Only NEW, RELIABLE, and CAUTION are shown.
 *
 * DO NOT render this in renter-facing views — it is a seller signal only.
 *
 * Reuses the same CSS design tokens (--success-soft / --warn-soft / --surface,
 * --success / --warn / --ink-2) as BookingStatusBadge so the two badges look
 * consistent when shown side-by-side.
 */

import type { TrustScore } from "@/lib/trust-score";

const TONE_STYLES: Record<string, { background: string; color: string }> = {
  neutral: { background: "var(--surface)",      color: "var(--ink-2)"  },
  success: { background: "var(--success-soft)", color: "var(--success)" },
  warn:    { background: "var(--warn-soft)",    color: "var(--warn)"    },
};

type Props = {
  score: TrustScore;
  /** Extra inline styles forwarded to the outer <span>. */
  style?: React.CSSProperties;
};

/**
 * TrustBadge — pill badge showing the renter's reliability tier.
 *
 * Returns `null` for the NORMAL tier (clean history, no badge needed).
 * The `title` tooltip shows raw counts so sellers can see the numbers on hover.
 */
export default function TrustBadge({ score, style }: Props) {
  if (score.tier === "NORMAL") return null;

  const toneStyle = TONE_STYLES[score.tone] ?? TONE_STYLES.neutral;

  // Thai tooltip: "เช่าสำเร็จ X · ยกเลิก/ไม่จ่าย Y"
  const tooltip = `เช่าสำเร็จ ${score.good} · ยกเลิก/ไม่จ่าย ${score.bad}`;

  return (
    <span
      title={tooltip}
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        border: "1px solid currentColor",
        lineHeight: 1.5,
        ...toneStyle,
        ...style,
      }}
    >
      {score.label}
    </span>
  );
}
