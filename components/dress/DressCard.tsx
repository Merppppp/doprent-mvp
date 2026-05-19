import Link from "next/link";
import { DressArt } from "./DressArt";
import SaveButton from "./SaveButton";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import type { Dress } from "@/lib/types";

type Props = {
  dress: Dress;
  variant?: number;
  /** Set of dress IDs the current user has saved. */
  savedSet?: Set<string>;
  /** Whether the viewer is logged in (affects save button behavior). */
  isLoggedIn?: boolean;
};

export default function DressCard({ dress, variant = 0, savedSet, isLoggedIn }: Props) {
  const badge = dress.featured ? (
    <span className="ad-badge featured">
      <span className="dot" />
      Featured
    </span>
  ) : dress.sponsored ? (
    <span className="ad-badge sponsored">
      <span className="dot" />
      Sponsored
    </span>
  ) : null;

  const hasImg = Array.isArray(dress.images) && dress.images.length > 0;
  const isSaved = savedSet ? savedSet.has(dress.id) : false;

  return (
    <div className="card" style={{ position: "relative" }}>
      <Link href={`/dress/${dress.slug}`} style={{ display: "block", cursor: "pointer" }}>
        <div
          style={{
            aspectRatio: "3/4",
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 10,
            position: "relative",
            transition: "transform 0.2s",
          }}
        >
          {hasImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dress.images[0]}
              alt={dress.name}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <DressArt color={dress.color} variant={variant} />
          )}
          {badge}
          <SaveButton dressId={dress.id} initialSaved={isSaved} isLoggedIn={isLoggedIn} />
        </div>
        <div style={{ padding: "0 2px" }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-3)",
              marginBottom: 4,
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            {dress.designer || "—"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>
            {dress.name}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
              fontSize: 12,
              color: "var(--ink-2)",
            }}
          >
            <span>
              Size {dress.size} ·{" "}
              <span style={{ color: "var(--ink-2)" }}>{dress.boutique_name}</span>
              {dress.boutique_verified ? (
                <span style={{ marginLeft: 4, display: "inline-flex", verticalAlign: "middle" }}>
                  <VerifiedBadge size="sm" />
                </span>
              ) : null}
            </span>
            <span style={{ fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", fontSize: 14 }}>
              ฿{dress.price_per_day.toLocaleString()}{" "}
              <span style={{ color: "var(--ink-3)", fontSize: 12, fontWeight: 400 }}>/วัน</span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
