import Link from "next/link";
import ProductCardImage from "./ProductCardImage";
import SaveButton from "./SaveButton";
import VerifiedBadge from "./VerifiedBadge";
import DistanceBadge from "./DistanceBadge";
import StarRating from "./StarRating";
import { hasMultipleRates, startingPerDay } from "@/lib/pricing";
import type { Product } from "@/lib/types";

type Props = {
  product: Product;
  variant?: number;
  /** Set of product IDs the current user has saved. */
  savedSet?: Set<string>;
  /** Whether the viewer is logged in (affects save button behavior). */
  isLoggedIn?: boolean;
};

export default function ProductCard({ product, variant = 0, savedSet, isLoggedIn }: Props) {
  const hasImg = Array.isArray(product.images) && product.images.length > 0;
  const imgSrc = hasImg ? product.images[0] : null;
  const isSaved = savedSet ? savedSet.has(product.id) : false;

  return (
    <div className="card" style={{ position: "relative" }}>
      <Link href={`/product/${product.slug}`} style={{ display: "block", cursor: "pointer" }}>
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
          <ProductCardImage src={imgSrc} alt={product.name} color={product.color ?? "rose"} variant={variant} />
          <SaveButton productId={product.id} initialSaved={isSaved} isLoggedIn={isLoggedIn} />
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
            {product.designer || "—"}
          </div>
          <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>
            {product.name}
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
              Size {product.size} ·{" "}
              <span style={{ color: "var(--ink-2)" }}>{product.shop_name}</span>
              {product.shop_verified ? (
                <span style={{ marginLeft: 4, display: "inline-flex", verticalAlign: "middle" }}>
                  <VerifiedBadge size="sm" />
                </span>
              ) : null}
              {product.area_key ? (
                <DistanceBadge areaKey={product.area_key} style={{ marginLeft: 6, verticalAlign: "middle" }} />
              ) : null}
              {product.shop_rating_count ? (
                <span style={{ marginLeft: 6, display: "inline-flex", verticalAlign: "middle" }}>
                  <StarRating avg={product.shop_rating_avg ?? null} count={product.shop_rating_count} size="sm" />
                </span>
              ) : null}
            </span>
            <span style={{ fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", fontSize: 14 }}>
              {hasMultipleRates(product.price_tiers) ? (
                <span style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-3)" }}>เริ่ม </span>
              ) : null}
              ฿{startingPerDay(product.price_tiers, product.price_per_day).toLocaleString()}{" "}
              <span style={{ color: "var(--ink-3)", fontSize: 12, fontWeight: 400 }}>/วัน</span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
