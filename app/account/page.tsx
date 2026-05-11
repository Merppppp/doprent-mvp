import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import DressCard from "@/components/DressCard";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Dress } from "@/lib/types";

export const metadata: Metadata = { title: "บัญชีของฉัน — DopRent", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/account")}`);

  const { profile, email } = user;
  const sb = createClient();

  let saved: Dress[] = [];
  if (profile.saved_dress_ids && profile.saved_dress_ids.length > 0) {
    const { data } = await sb
      .from("dresses")
      .select("*")
      .in("id", profile.saved_dress_ids)
      .eq("status", "live");
    saved = (data ?? []) as Dress[];
  }

  const initials = (profile.full_name || email)
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="shell" style={{ padding: "36px 24px 80px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: 32,
        }}
      >
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
                color: "#fff",
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
              {profile.full_name || email.split("@")[0]}
              {profile.role === "admin" ? (
                <span
                  style={{
                    background: "var(--info)",
                    color: "#fff",
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
              {email}
            </div>
          </div>

          {profile.role === "admin" ? (
            <Link
              href="/admin"
              style={{
                display: "block",
                padding: "10px 12px",
                borderRadius: 6,
                fontSize: 14,
                background: "var(--info)",
                color: "#fff",
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {saved.map((d, i) => (
                <DressCard
                  key={d.id}
                  dress={d}
                  variant={i}
                  savedSet={new Set(profile.saved_dress_ids)}
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
