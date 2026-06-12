import { PALETTE, type Color } from "@/lib/types";

/**
 * SVG gradient stand-in for a product photo. Mirrors `dressSvg` in the demo —
 * a soft gradient based on the product's color token. Used as a placeholder
 * until real photos are uploaded.
 */
export function ProductArt({
  color,
  variant = 0,
  className,
}: {
  color: Color;
  variant?: number;
  className?: string;
}) {
  const p = PALETTE[color] ?? PALETTE.rose;
  const angle = [165, 135, 195, 150][variant % 4];
  const uid = `d-${color}-${variant}`;
  return (
    <svg
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ width: "100%", height: "100%", display: "block", background: p.c1 }}
    >
      <defs>
        <linearGradient id={uid} gradientTransform={`rotate(${angle})`}>
          <stop offset="0%" stopColor={p.c1} />
          <stop offset="100%" stopColor={p.c2} />
        </linearGradient>
      </defs>
      <rect width="300" height="400" fill={`url(#${uid})`} />
    </svg>
  );
}

export function ShopCover({
  color,
  className,
}: {
  color: Color;
  className?: string;
}) {
  const p = PALETTE[color] ?? PALETTE.rose;
  const uid = `c-${color}`;
  return (
    <svg
      viewBox="0 0 1000 400"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.c1} />
          <stop offset="60%" stopColor={p.c2} />
          <stop offset="100%" stopColor={p.c3} />
        </linearGradient>
      </defs>
      <rect width="1000" height="400" fill={`url(#${uid})`} />
    </svg>
  );
}

export function OccasionTile({ color }: { color: Color }) {
  const p = PALETTE[color] ?? PALETTE.rose;
  const uid = `o-${color}`;
  return (
    <svg
      viewBox="0 0 300 240"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={p.c1} />
          <stop offset="100%" stopColor={p.c3} />
        </linearGradient>
      </defs>
      <rect width="300" height="240" fill={`url(#${uid})`} />
    </svg>
  );
}
