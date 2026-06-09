"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const SORT_OPTIONS = [
  { value: "featured", label: "เกี่ยวข้อง" },
  { value: "price-asc", label: "ราคา ต่ำ→สูง" },
  { value: "price-desc", label: "ราคา สูง→ต่ำ" },
] as const;

function SortSelectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "featured";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "featured") {
      params.delete("sort");
    } else {
      params.set("sort", e.target.value);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={handleChange}
      aria-label="เรียงลำดับ"
      style={{
        padding: "7px 12px",
        border: "1px solid var(--line)",
        borderRadius: 8,
        background: "var(--bg)",
        fontSize: 13,
        color: "var(--ink)",
        cursor: "pointer",
        outline: "none",
        fontFamily: "inherit",
      }}
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function SortSelect() {
  return (
    <Suspense fallback={null}>
      <SortSelectInner />
    </Suspense>
  );
}
