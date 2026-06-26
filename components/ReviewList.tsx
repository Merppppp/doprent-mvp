import type { PublicReview } from "@/lib/reviews";

function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= rating ? "var(--gold)" : "var(--line)", fontSize: 14 }}>
          ★
        </span>
      ))}
    </span>
  );
}

type Props = {
  reviews: PublicReview[];
};

export default function ReviewList({ reviews }: Props) {
  if (!reviews.length) {
    return (
      <p style={{ fontSize: 14, color: "var(--ink-3)", padding: "16px 0" }}>
        ยังไม่มีรีวิว
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {reviews.map((r) => (
        <div
          key={r.id}
          style={{
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Stars rating={r.rating} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{r.reviewer_name}</span>
            </div>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {new Date(r.created_at).toLocaleDateString("th-TH")}
            </span>
          </div>
          {r.comment && (
            <p style={{ fontSize: 14, color: "var(--ink-2)", margin: "4px 0 0" }}>{r.comment}</p>
          )}
          {r.seller_reply && (
            <div
              style={{
                marginTop: 10,
                marginLeft: 16,
                padding: "8px 12px",
                background: "var(--surface, #f8f8f8)",
                borderLeft: "3px solid var(--line)",
                borderRadius: "0 6px 6px 0",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>
                ตอบกลับจากร้าน
              </div>
              <p style={{ fontSize: 13, margin: 0 }}>{r.seller_reply}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
