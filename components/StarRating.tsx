type Props = {
  avg: number | null;
  count: number;
  size?: "sm" | "md" | "lg";
};

export default function StarRating({ avg, count, size = "md" }: Props) {
  if (!count) {
    return <span style={{ fontSize: 11, color: "var(--ink-3)" }}>ยังไม่มีรีวิว</span>;
  }
  const fontSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  const filled = Math.round(avg ?? 0);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize, color: s <= filled ? "#F5A623" : "var(--line)", lineHeight: 1 }}>
          ★
        </span>
      ))}
      <span style={{ fontSize: fontSize - 1, color: "var(--ink-2)", marginLeft: 2 }}>
        {avg !== null ? avg.toFixed(1) : "–"} ({count})
      </span>
    </span>
  );
}
