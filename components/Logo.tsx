/**
 * DopRent brand lockup — V7 "Dress Mark".
 *
 * Lowercase wordmark "doprent" where the "o" is replaced by a filled coral
 * circle (#E07A5F) with a white A-line dress silhouette inside (spaghetti
 * straps, cinched waist, flared skirt). Letters 'd' and 'prent' inherit
 * `currentColor` so the mark adapts to any surface.
 *
 * Font: Bricolage Grotesque 800 (loaded in app/layout.tsx). Falls back to the
 * system sans if the webfont hasn't loaded yet.
 */
const CORAL = "#E07A5F";

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
        color: "currentColor",
        userSelect: "none",
      }}
    >
      <span aria-hidden>d</span>
      {/* The "o" — coral circle with white dress silhouette */}
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: "0.88em",
          height: "0.88em",
          margin: "0 0.01em",
          transform: "translateY(0.05em)",
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ width: "100%", height: "100%", display: "block" }}
          aria-hidden
        >
          {/* Coral filled circle */}
          <circle cx="50" cy="50" r="50" fill={CORAL} />
          {/* White A-line dress silhouette:
              - two spaghetti straps at top
              - V-neckline
              - bodice curves to waist
              - flared A-line skirt */}
          <path
            d="M 40,15 L 44,15 L 50,28 L 56,15 L 60,15 L 65,30 C 69,40 67,52 62,56 L 68,85 L 32,85 L 38,56 C 33,52 31,40 35,30 Z"
            fill="white"
          />
        </svg>
      </span>
      <span aria-hidden>prent</span>
    </span>
  );
}
