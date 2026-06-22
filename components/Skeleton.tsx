// Inline-styled skeleton (no Tailwind dependency)
const baseStyle: React.CSSProperties = {
  background: "var(--line-2)",
  borderRadius: 8,
  opacity: 0.6,
};

export function Skeleton({ style }: { style?: React.CSSProperties }) {
  return <div aria-hidden="true" style={{ ...baseStyle, ...style }} />;
}

export function Spinner({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: "dp-spin 0.8s linear infinite", ...style }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="var(--line-2)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--ink-3)" strokeWidth="3" strokeLinecap="round" />
      <style>{`@keyframes dp-spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  );
}

export function LoadingBar({ label = "กำลังโหลด..." }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", marginBottom: 16 }}>
      <Spinner size={18} />
      <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{label}</span>
    </div>
  );
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
