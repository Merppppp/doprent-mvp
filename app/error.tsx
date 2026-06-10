"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[doprent] route error", error);
  }, [error]);

  return (
    <div
      className="container"
      style={{
        padding: "96px 24px",
        textAlign: "center",
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p style={{ fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.12em" }}>
        บางอย่างผิดพลาด
      </p>
      <h1 style={{ marginTop: 12, fontSize: 32, fontWeight: 600 }}>โหลดหน้านี้ไม่สำเร็จ</h1>
      <p style={{ marginTop: 16, color: "var(--ink-2)", maxWidth: 480 }}>
        ลองรีเฟรชอีกครั้ง หรือกลับไปที่หน้ารวมชุดทั้งหมด
      </p>
      <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button type="button" onClick={() => reset()} className="btn btn-dark">
          ลองอีกครั้ง
        </button>
        <Link href="/" className="btn btn-outline">
          ดูชุดทั้งหมด
        </Link>
      </div>
      {error?.digest && (
        <p style={{ marginTop: 24, fontSize: 12, color: "var(--ink-3)" }}>
          รหัสข้อผิดพลาด: {error.digest}
        </p>
      )}
    </div>
  );
}
