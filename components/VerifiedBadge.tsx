type Props = {
  size?: "sm" | "md";
  /** Show "ยืนยันตัวตน" text label next to checkmark (otherwise icon only). */
  withLabel?: boolean;
};

/**
 * Verified-seller checkmark. Render only when boutique.verified === true.
 * Sits next to a boutique/seller name to indicate KYC passed.
 */
export default function VerifiedBadge({ size = "sm", withLabel = false }: Props) {
  const dim = size === "md" ? 18 : 14;
  return (
    <span
      title="ร้านที่ยืนยันตัวตน"
      aria-label="ร้านที่ยืนยันตัวตนแล้ว"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: withLabel ? 4 : 0,
        verticalAlign: "middle",
        lineHeight: 1,
      }}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M10 1.5L11.95 3.06L14.36 2.71L15.27 5L17.36 6.27L17 8.68L18.5 10.6L17 12.52L17.36 14.93L15.27 16.2L14.36 18.49L11.95 18.14L10 19.7L8.05 18.14L5.64 18.49L4.73 16.2L2.64 14.93L3 12.52L1.5 10.6L3 8.68L2.64 6.27L4.73 5L5.64 2.71L8.05 3.06L10 1.5Z"
          style={{ fill: "var(--cobalt)" }}
        />
        <path
          d="M6.5 10.5L9 13L13.5 7.5"
          stroke="oklch(0.985 0.005 35)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withLabel ? (
        <span style={{ fontSize: 12, color: "var(--cobalt)", fontWeight: 500 }}>ยืนยันตัวตน</span>
      ) : null}
    </span>
  );
}
