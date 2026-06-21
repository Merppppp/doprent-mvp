import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import SavedProductsGrid from "@/components/SavedProductsGrid";
import { getCurrentUser } from "@/lib/auth";
import { listProductsByIds } from "@/lib/products";

export const metadata: Metadata = { title: "สินค้าที่ถูกใจ", robots: { index: false } };

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/account")}`);

  const saved = await listProductsByIds(user.savedProductIds);

  const initials = (user.fullName || user.email)
    .trim()
    .split(/\s+/)
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="container" style={{ padding: "28px 0 80px" }}>
      <div className="account-grid">
        <aside className="account-sidebar">
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
              className="account-nav-item account-nav-admin"
            >
              Admin Dashboard
            </Link>
          ) : null}

          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Link href="/account" className="account-nav-item account-nav-active">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              สินค้าที่ถูกใจ
            </Link>
            <Link href="/account/bookings" className="account-nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              การจองของฉัน
            </Link>
            <Link href="/account/addresses" className="account-nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ที่อยู่จัดส่ง
            </Link>
            <Link href="/account/billing" className="account-nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              ข้อมูลใบกำกับภาษี
            </Link>
          </nav>

          <div style={{ height: 1, background: "var(--line)", margin: "8px 0" }} />

          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="account-nav-item"
              style={{ width: "100%", textAlign: "left", color: "var(--danger)", border: "none", background: "none", cursor: "pointer" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              ออกจากระบบ
            </button>
          </form>
        </aside>

        <main>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", marginBottom: 16 }}>
            สินค้าที่ถูกใจ
          </h2>
          <SavedProductsGrid products={saved} savedIds={user.savedProductIds} />
        </main>
      </div>
    </div>
  );
}
