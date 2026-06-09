/**
 * DopRent brand lockup — "The Loop".
 *
 * Lowercase wordmark "doprent" where the "o" is replaced by an open loop
 * (the rental cycle) carrying a coral dot (the dopamine hit of getting the
 * piece). The loop stroke + letters inherit `currentColor` so the mark adapts
 * to any surface; only the coral dot is fixed (#FF5232) for instant recall.
 *
 * Font: Bricolage Grotesque 800 (loaded in app/layout.tsx). Falls back to the
 * system sans if the webfont hasn't loaded yet.
 */
const DOPAMINE = "#FF5232";

export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <span
      role="img"
      aria-label="doprent"
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.03em",
        lineHeight: 1,
        color: "var(--ink)",
        userSelect: "none",
      }}
    >
      <span aria-hidden>d</span>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: "0.82em",
          height: "0.82em",
          margin: "0 0.012em",
          transform: "translateY(0.06em)",
        }}
      >
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", display: "block" }}>
          <g transform="rotate(-52 50 50)">
            <circle
              cx="50"
              cy="50"
              r="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="173 28"
            />
            <circle cx="82" cy="50" r="9" fill={DOPAMINE} />
          </g>
        </svg>
      </span>
      <span aria-hidden>prent</span>
    </span>
  );
}
