import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import DressCard from "@/components/DressCard";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Dress } from "@/lib/types";

export const metadata: Metadata = { title: "บัญชีของฉัน", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/account")}`);

  let saved: Dress[] = [];
  if (user.savedDressIds.length > 0) {
    const rows = await db.dress.findMany({
      where: { id: { in: user.savedDressIds }, status: "live" },
    });
    type Row = (typeof rows)[number];
    saved = rows.map((d: Row) => ({
      id: d.id, slug: d.slug, tag_code: d.tagCode, name: d.name, designer: d.designer,
      boutique_id: d.boutiqueId, boutique_name: d.boutiqueName, size: d.size as Dress["size"],
      color: d.color as Dress["color"], price_per_day: d.pricePerDay, deposit: d.deposit,
      price_tiers: d.priceTiers as Dress["price_tiers"], description: d.description,
      images: d.images as string[], occasions: d.occasions as Dress["occasions"],
      line_url: d.lineUrl, ads_tier: d.adsTier as Dress["ads_tier"],
      featured: d.featured, sponsored: d.sponsored, status: d.status as Dress["status"],
      reject_reason: d.rejectReason, available: d.available, views: d.views,
      created_at: d.createdAt.toISOString(), updated_at: d.updatedAt.toISOString(),
    }));
  }

  const initials = (user.fullName || user.email)
    .trim()
    .split(/\s+/)
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="shell" style={{ padding: "28px 0 80px" }}>
      <div className="account-grid">
        <aside>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 18,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                background: "var(--ink)",
                color: "var(--on-dark)",
                fontSize: 18,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              {initials || "?"}
            </div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {user.fullName || user.email.split("@")[0]}
              {user.role === "admin" ? (
                <span
                  style={{
                    background: "var(--info)",
                    color: "var(--on-dark)",
                    fontSize: 10,
                    padding: "2px 6px",
                    borderRadius: 3,
                    marginLeft: 6,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Admin
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, wordBreak: "break-all" }}>
              {user.email}
            </div>
          </div>

          {user.role === "admin" ? (
            <Link
              href="/admin"
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--info)",
                color: "var(--on-dark)",
                fontWeight: 500,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Admin Dashboard
            </Link>
          ) : null}

          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="btn btn-outline btn-block"
              style={{ marginTop: 4 }}
            >
              ออกจากระบบ
            </button>
          </form>
        </aside>

        <main>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 6 }}>
            ชุดที่บันทึก
          </h2>
          <div style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
            {saved.length === 0 ? "ยังไม่มีชุดที่บันทึก" : `${saved.length} ชุด`}
          </div>

          {saved.length === 0 ? (
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
                ยังไม่มีชุดที่บันทึก
              </h3>
              <p style={{ fontSize: 14, marginBottom: 18 }}>กดปุ่ม ❤️ ที่ชุดที่ชอบเพื่อบันทึก</p>
              <Link href="/browse" className="btn btn-dark">
                เลือกชุด
              </Link>
            </div>
          ) : (
            <div className="grid-3" style={{ gap: 20 }}>
              {saved.map((d, i) => (
                <DressCard
                  key={d.id}
                  dress={d}
                  variant={i}
                  savedSet={new Set(user.savedDressIds)}
                  isLoggedIn={true}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
