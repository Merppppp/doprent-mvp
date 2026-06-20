type LoadingIndicatorProps = {
  size?: number;
  label?: string;
  className?: string;
};

export function Spinner({ size = 18, label, className }: LoadingIndicatorProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: label ? 10 : 0,
        color: "var(--ink)",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: "spinner-rotate 1s linear infinite", display: "block" }}
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.25"
        />
        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {label ? (
        <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{label}</span>
      ) : null}
    </span>
  );
}

export function ProgressBar({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: 4,
        borderRadius: 999,
        background: "var(--line-2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "28%",
          height: "100%",
          background: "var(--accent)",
          transform: "translateX(-120%)",
          animation: "progress-indeterminate 1.2s ease-in-out infinite",
        }}
      />
    </div>
  );
}
