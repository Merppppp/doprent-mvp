import type { CSSProperties } from "react";

/**
 * Shared admin/seller status chip. Replaces the duplicated in-file
 * `Badge` mini-components in DressRow / BoutiqueRow / KycRow.
 *
 * Tones map to the semantic design tokens in app/globals.css —
 * solid var for text, matching -soft var for the background wash.
 * Never hardcode hex here.
 */
export type StatusTone = "success" | "danger" | "warn" | "info" | "neutral";

const TONE_STYLE: Record<StatusTone, { color: string; background: string }> = {
  success: { color: "var(--success)", background: "var(--success-soft)" },
  danger: { color: "var(--danger)", background: "var(--danger-soft)" },
  warn: { color: "var(--warn)", background: "var(--warn-soft)" },
  info: { color: "var(--info)", background: "var(--info-soft)" },
  neutral: { color: "var(--ink-3)", background: "var(--surface)" },
};

export default function StatusBadge({
  text,
  tone,
  style,
}: {
  text: string;
  tone: StatusTone;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        padding: "3px 8px",
        ...TONE_STYLE[tone],
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 3,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {text}
    </span>
  );
}
