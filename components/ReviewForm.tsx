"use client";
import { useRef, useState, useTransition } from "react";
import StarRatingInput from "./StarRatingInput";
import { createReview } from "@/app/actions/reviews";

type Props = {
  bookingId: string;
  onDone?: () => void;
};

export default function ReviewForm({ bookingId, onDone }: Props) {
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const commentRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const comment = commentRef.current?.value ?? "";
    startTransition(async () => {
      const res = await createReview(bookingId, rating, comment);
      if (!res.ok) { setError(res.error); return; }
      setDone(true);
      onDone?.();
    });
  }

  if (done) {
    return <p style={{ color: "var(--success, green)", fontSize: 14 }}>ขอบคุณสำหรับรีวิว!</p>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>ให้คะแนนร้าน</div>
        <StarRatingInput onChange={setRating} />
      </div>
      <div>
        <label style={{ fontSize: 14, fontWeight: 500, display: "block", marginBottom: 4 }}>
          ความเห็น (ไม่บังคับ)
        </label>
        <textarea
          ref={commentRef}
          maxLength={1000}
          rows={3}
          placeholder="แบ่งปันประสบการณ์การเช่ากับร้านนี้..."
          style={{
            width: "100%",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 14,
            resize: "vertical",
          }}
        />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}
      <button
        type="submit"
        disabled={isPending || rating === 0}
        style={{
          alignSelf: "flex-start",
          padding: "8px 20px",
          background: "var(--ink)",
          color: "var(--on-dark)",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          cursor: rating === 0 || isPending ? "not-allowed" : "pointer",
          opacity: rating === 0 || isPending ? 0.5 : 1,
        }}
      >
        {isPending ? "กำลังส่ง..." : "ส่งรีวิว"}
      </button>
    </form>
  );
}
