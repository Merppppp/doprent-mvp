import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { listTagGroups, listTagRequestsForShop } from "@/lib/tags";
import TagRequestForm from "./TagRequestForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ขอเพิ่มแท็ก · Seller",
  robots: { index: false, follow: false },
};

const STATUS_META: Record<string, { text: string; color: string; bg: string }> = {
  pending:  { text: "รอตรวจสอบ",  color: "#d97706",           bg: "color-mix(in oklch, #d97706 12%, transparent)" },
  approved: { text: "อนุมัติแล้ว", color: "var(--success, #16a34a)", bg: "color-mix(in oklch, #16a34a 12%, transparent)" },
  rejected: { text: "ไม่อนุมัติ",  color: "var(--danger)",    bg: "var(--danger-soft)" },
};

export default async function SellerTagsPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/login?next=/sell/tags");

  const shop = await db.shop.findFirst({
    where: { ownerId: user.id },
    select: { id: true, name: true },
  });
  if (!shop) redirect("/sell/signup");

  const [tagGroups, tagRequests] = await Promise.all([
    listTagGroups(),
    listTagRequestsForShop(shop.id),
  ]);

  return (
    <div>
      {/* Page heading */}
      <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>ขอเพิ่มแท็ก</h1>
      <p style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 28 }}>
        หากไม่พบแท็กที่ต้องการในระบบ ส่งคำขอเพิ่มแท็กใหม่ได้ที่นี่
      </p>

      {/* Request form card */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "22px 24px",
          marginBottom: 32,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
          ส่งคำขอแท็กใหม่
        </h2>

        {/* Explanation copy */}
        <p
          style={{
            fontSize: 13,
            color: "var(--ink-3)",
            marginBottom: 20,
            lineHeight: 1.7,
            padding: "10px 14px",
            background: "var(--bg)",
            borderRadius: 6,
            borderLeft: "3px solid var(--line)",
          }}
        >
          แท็กที่คุณขอเพิ่มจะถูกส่งให้แอดมินตรวจสอบก่อน
          เมื่อได้รับการอนุมัติ แท็กนี้จะถูกเผยแพร่ให้ผู้ขายรายอื่นเลือกใช้ได้
          และผู้ใช้ทั่วไปจะเห็นแท็กนี้ในการค้นหา/กรองสินค้า
        </p>

        <TagRequestForm shopId={shop.id} tagGroups={tagGroups} />
      </section>

      {/* Previous requests */}
      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
          คำขอที่ส่งไปแล้ว
        </h2>

        {tagRequests.length === 0 ? (
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
            ยังไม่มีคำขอแท็ก — ส่งคำขอแรกได้ด้านบน
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tagRequests.map((req) => {
              const meta = STATUS_META[req.status] ?? STATUS_META.pending;
              return (
                <div
                  key={req.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    padding: "14px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: req.reviewNotes ? 8 : 0,
                    }}
                  >
                    {/* Tag info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                        {req.tagGroup.label}
                        {" "}
                        /
                        {" "}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{req.requestedLabel}</span>
                      {req.requestedKey && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            color: "var(--ink-3)",
                            fontFamily: "monospace",
                          }}
                        >
                          ({req.requestedKey})
                        </span>
                      )}
                    </div>

                    {/* Status badge */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: meta.bg,
                        color: meta.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {meta.text}
                    </span>

                    {/* Date */}
                    <span style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                      {new Date(req.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Review note (rejected only) */}
                  {req.reviewNotes && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink-3)",
                        padding: "6px 10px",
                        background: "var(--bg)",
                        borderRadius: 5,
                        borderLeft: "2px solid var(--line)",
                        marginTop: 4,
                      }}
                    >
                      หมายเหตุ: {req.reviewNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
