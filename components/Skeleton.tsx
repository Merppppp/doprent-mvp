// Inline-styled skeleton (no Tailwind dependency)
const baseStyle: React.CSSProperties = {
  background: "var(--line-2)",
  borderRadius: 8,
  opacity: 0.6,
};

export function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div aria-hidden="true" style={{ ...baseStyle, ...style }} />;
}

export function SkeletonCard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Skeleton style={{ aspectRatio: "3/4", width: "100%" }} />
      <Skeleton style={{ height: 12, width: "33%" }} />
      <Skeleton style={{ height: 16, width: "66%" }} />
      <Skeleton style={{ height: 12, width: "50%" }} />
    </div>
  );
}
