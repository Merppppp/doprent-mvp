"use client";
import { useTransition } from "react";
import { hideReview, unhideReview } from "@/app/actions/admin-reviews";

type RowData = {
  id: string;
  shop_name: string;
  shop_slug: string;
  reviewer_name: string | null;
  reviewer_email: string | null;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
};

export default function ReviewAdminRow({ review }: { review: RowData }) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (review.status === "visible") {
        await hideReview(review.id);
      } else {
        await unhideReview(review.id);
      }
    });
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{review.shop_name}</span>
          <span style={{ fontSize: 13, color: "var(--gold)" }}>{"★".repeat(review.rating)}</span>
          <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{new Date(review.created_at).toLocaleDateString("th-TH")}</span>
        </div>
        {review.comment && <p style={{ fontSize: 13, margin: "4px 0", color: "var(--ink-2)" }}>{review.comment}</p>}
        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
          โดย: {review.reviewer_name ?? review.reviewer_email ?? "ไม่ระบุ"}
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        style={{
          padding: "6px 14px",
          fontSize: 13,
          border: "1px solid var(--line)",
          borderRadius: 6,
          background: review.status === "visible" ? "var(--surface)" : "var(--ink)",
          color: review.status === "visible" ? "var(--ink)" : "var(--on-dark)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {isPending ? "..." : review.status === "visible" ? "ซ่อน" : "แสดง"}
      </button>
    </div>
  );
}
