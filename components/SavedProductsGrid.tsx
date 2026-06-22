"use client";

import { useState } from "react";
import ProductCard from "./ProductCard";
import Link from "next/link";
import { type Product } from "@/lib/types";

type Props = {
  products: Product[];
  savedIds: string[];
};

const TYPE_LABELS: Record<string, string> = {
  dress: "ชุดเสื้อผ้า",
  suit: "สูท",
};

export default function SavedProductsGrid({ products, savedIds }: Props) {
  const [activeType, setActiveType] = useState<string | null>(null);

  const typeKeys = Array.from(new Set(products.map((p) => p.product_type_key)));
  const showFilter = typeKeys.length > 1;

  const filtered = activeType
    ? products.filter((p) => p.product_type_key === activeType)
    : products;

  const savedSet = new Set(savedIds);

  if (products.length === 0) {
    return (
      <div
        style={{
          padding: "60px 20px",
          textAlign: "center",
          color: "var(--ink-3)",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
        }}
      >
        <h3 style={{ fontSize: 16, color: "var(--ink)", marginBottom: 6, fontWeight: 600 }}>
          ยังไม่มีสินค้าที่ถูกใจ
        </h3>
        <p style={{ fontSize: 14, marginBottom: 18 }}>
          กดปุ่มหัวใจที่สินค้าที่ชอบเพื่อบันทึก
        </p>
        <Link href="/" className="btn btn-dark">
          เลือกสินค้า
        </Link>
      </div>
    );
  }

  return (
    <>
      {showFilter && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveType(null)}
            className={`saved-filter-chip${activeType === null ? " saved-filter-active" : ""}`}
          >
            ทั้งหมด ({products.length})
          </button>
          {typeKeys.map((key) => {
            const count = products.filter((p) => p.product_type_key === key).length;
            return (
              <button
                key={key}
                onClick={() => setActiveType(key)}
                className={`saved-filter-chip${activeType === key ? " saved-filter-active" : ""}`}
              >
                {TYPE_LABELS[key] || key} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>
        {filtered.length} รายการ
      </div>

      <div className="grid-4" style={{ gap: 16 }}>
        {filtered.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            variant={i}
            savedSet={savedSet}
            isLoggedIn={true}
          />
        ))}
      </div>
    </>
  );
}
