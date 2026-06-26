import type { Metadata } from "next";
import { listPendingTagRequests, listReviewedTagRequests } from "@/lib/tags";
import TagRequestRow from "./TagRequestRow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "คำขอแท็ก · Admin",
  robots: { index: false, follow: false },
};

export default async function TagRequestsPage() {
  const [pending, reviewed] = await Promise.all([
    listPendingTagRequests(),
    listReviewedTagRequests(),
  ]);

  const toRow = (r: (typeof pending)[number] | (typeof reviewed)[number]) => ({
    id: r.id,
    requestedLabel: r.requestedLabel,
    requestedKey: r.requestedKey,
    status: r.status as "pending" | "approved" | "rejected",
    reviewNotes: "reviewNotes" in r ? (r as { reviewNotes: string | null }).reviewNotes : null,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: "reviewedAt" in r && (r as { reviewedAt: Date | null }).reviewedAt
      ? (r as { reviewedAt: Date }).reviewedAt.toISOString()
      : null,
    tagGroup: r.tagGroup,
    shop: r.shop,
  });

  return (
    <div>
      <h1 className="page-title" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
        คำขอแท็กจากร้านค้า
      </h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 24 }}>
        ตรวจสอบคำขอเพิ่มแท็กใหม่จากผู้ขาย — อนุมัติเพื่อสร้าง Tag จริงในระบบ
      </p>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
          รอตรวจสอบ
          {pending.length > 0 ? (
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                background: "var(--warn)",
                color: "var(--on-dark)",
                borderRadius: 999,
                padding: "2px 8px",
                fontWeight: 600,
              }}
            >
              {pending.length}
            </span>
          ) : null}
        </h2>
        {pending.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              color: "var(--ink-3)",
              fontSize: 14,
            }}
          >
            ไม่มีคำขอที่รอตรวจสอบ
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map((r) => (
              <TagRequestRow key={r.id} req={toRow(r)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>ตรวจสอบแล้ว (50 รายการล่าสุด)</h2>
        {reviewed.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              color: "var(--ink-3)",
              fontSize: 14,
            }}
          >
            ยังไม่มีรายการที่ตรวจสอบแล้ว
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {reviewed.map((r) => (
              <TagRequestRow key={r.id} req={toRow(r)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
