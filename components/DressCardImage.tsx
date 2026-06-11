"use client";

import { useState } from "react";
import { DressArt } from "./DressArt";
import type { Color } from "@/lib/types";

/**
 * Card image with graceful degradation: renders the given src and falls back
 * to the DressArt gradient if the image fails to load (e.g. a local
 * /products/<slug>.png that has not been generated yet) or no src is given.
 */
export default function DressCardImage({
  src,
  alt,
  color,
  variant = 0,
}: {
  src: string | null;
  alt: string;
  color: Color;
  variant?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <DressArt color={color} variant={variant} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}
