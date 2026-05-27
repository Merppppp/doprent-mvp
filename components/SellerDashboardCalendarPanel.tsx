"use client";

import { useState } from "react";
import SellerAvailabilityPicker from "./SellerAvailabilityPicker";

type DressOption = {
  id: string;
  name: string;
  designer: string | null;
  tag_code: string;
  size: string;
  price_per_day: number;
};

export default function SellerDashboardCalendarPanel({ dresses }: { dresses: DressOption[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        marginBottom: 28,
        padding: 18,
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>ปฏิทินวันว่าง</h2>
          <p style={{ fontSize: 14, color: "var(--ink-3)", margin: "6px 0 0" }}>
            เลือกชุดแล้วจัดการวันว่างได้จากปฏิทิน
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: isOpen ? "var(--surface)" : "var(--bg)",
            color: "var(--ink)",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {isOpen ? "ปิดปฏิทิน" : "จัดการปฏิทิน"}
        </button>
      </div>

      {isOpen ? (
        <div style={{ marginTop: 18 }}>
          <SellerAvailabilityPicker dresses={dresses} />
        </div>
      ) : (
        <div style={{ marginTop: 18, color: "var(--ink-3)", fontSize: 14 }}>
          กดปุ่มด้านบนเพื่อเปิดปฏิทินของชุด
        </div>
      )}
    </div>
  );
}
