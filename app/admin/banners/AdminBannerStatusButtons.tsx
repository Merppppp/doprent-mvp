"use client";

import { useTransition, useState } from "react";
import { setBannerStatus } from "@/app/actions/admin-banners";

export default function AdminBannerStatusButtons({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatus(status: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      const res = await setBannerStatus(id, status);
      if (!res.ok) setError(res.error ?? "เกิดข้อผิดพลาด");
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, minWidth: 120 }}>
      <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500, marginBottom: 2 }}>
        สถานะ Moderation
      </div>
      <button
        type="button"
        disabled={isPending || currentStatus === "approved"}
        onClick={() => handleStatus("approved")}
        style={{
          padding: "7px 14px",
          fontSize: 13,
          fontWeight: 600,
          background: currentStatus === "approved" ? "var(--success-soft, #d1fae5)" : "var(--ink)",
          color: currentStatus === "approved" ? "var(--success, #065f46)" : "var(--on-dark)",
          border: currentStatus === "approved" ? "1px solid var(--success, #065f46)" : "none",
          borderRadius: 7,
          cursor: isPending || currentStatus === "approved" ? "not-allowed" : "pointer",
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {currentStatus === "approved" ? "✓ อนุมัติแล้ว" : "อนุมัติ"}
      </button>
      <button
        type="button"
        disabled={isPending || currentStatus === "rejected"}
        onClick={() => handleStatus("rejected")}
        style={{
          padding: "7px 14px",
          fontSize: 13,
          fontWeight: 500,
          background: "transparent",
          color: currentStatus === "rejected" ? "var(--ink-3)" : "var(--danger)",
          border: `1px solid ${currentStatus === "rejected" ? "var(--line)" : "var(--danger)"}`,
          borderRadius: 7,
          cursor: isPending || currentStatus === "rejected" ? "not-allowed" : "pointer",
        }}
      >
        {currentStatus === "rejected" ? "ปฏิเสธแล้ว" : "ปฏิเสธ"}
      </button>
      {error && (
        <p style={{ fontSize: 11, color: "var(--danger)", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
