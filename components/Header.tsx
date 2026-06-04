import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import MobileMenu from "./MobileMenu";

export default async function Header() {
  const user = await getCurrentUser().catch(() => null);

  const fullName = user?.name || user?.email.split("@")[0] || "";
  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const savedCount = user?.savedDressIds?.length ?? 0;

  return (
    <header
      style={{
        borderBottom: "1px solid var(--line)",
        background: "var(--surface)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        className="shell"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 0",
        }}
      >
        <Link
          href="/"
          style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em" }}
        >
          DopRent
        </Link>

        <nav
          className="nav-links"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 14,
            color: "var(--ink-2)",
            marginLeft: "auto",
            marginRight: 24,
          }}
        >
          <Link href="/browse" style={{ padding: "6px 0" }}>
            เลือกชุด
          </Link>
          <Link href="/boutiques" style={{ padding: "6px 0" }}>
            ร้านเช่า
          </Link>
        </nav>

        <div
          className="nav-cta-desktop"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          {user ? (
            <>
              <SavedLink count={savedCount} />
              <UserMenu
                fullName={fullName}
                email={user.email}
                isAdmin={user.role === "admin"}
                isSeller={user.role === "seller" || user.role === "admin"}
                initials={initials}
              />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn btn-outline"
                style={{ padding: "9px 14px" }}
              >
                เข้าสู่ระบบ
              </Link>
              <Link href="/signup" className="btn btn-dark">
                สมัครสมาชิก
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger — visibility controlled by CSS */}
        <MobileMenu
          user={
            user
              ? {
                  fullName,
                  email: user.email,
                  isAdmin: user.role === "admin",
                  isSeller: user.role === "seller" || user.role === "admin",
                  initials,
                  savedCount,
                }
              : null
          }
        />
      </div>
    </header>
  );
}

function SavedLink({ count }: { count: number }) {
  return (
    <Link
      href="/account"
      aria-label={`ชุดที่ถูกใจ${count > 0 ? ` (${count})` : ""}`}
      title="ชุดที่ถูกใจ"
      style={{
        position: "relative",
        width: 38,
        height: 38,
        borderRadius: 999,
        border: "1px solid var(--line)",
        background: "var(--surface)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink)",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={count > 0 ? "var(--save)" : "none"}
        stroke={count > 0 ? "var(--save)" : "var(--ink)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {count > 0 ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 999,
            background: "var(--ink)",
            color: "var(--on-dark)",
            fontSize: 10,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu({
  fullName,
  email,
  isAdmin,
  isSeller,
  initials,
}: {
  fullName: string;
  email: string;
  isAdmin: boolean;
  isSeller: boolean;
  initials: string;
}) {
  return (
    <details
      style={{ position: "relative" }}
      // <details>/<summary> gives us a free dropdown with no client JS
    >
      <summary
        style={{
          listStyle: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px 6px 6px",
          borderRadius: 999,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "var(--ink)",
            color: "var(--on-dark)",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {initials || "?"}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            maxWidth: 100,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {fullName.split(" ")[0]}
        </span>
        <span style={{ color: "var(--ink-3)", marginRight: 4, fontSize: 10 }}>▼</span>
      </summary>
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          minWidth: 220,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          zIndex: 30,
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {fullName}
            {isAdmin ? (
              <span
                style={{
                  background: "var(--info)",
                  color: "var(--on-dark)",
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 3,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginLeft: 4,
                }}
              >
                Admin
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{email}</div>
        </div>

        {isAdmin ? (
          <Link
            href="/admin"
            style={{
              display: "block",
              padding: "10px 16px",
              fontSize: 14,
              color: "var(--info)",
              fontWeight: 500,
            }}
          >
            Admin Dashboard
          </Link>
        ) : null}

        {isSeller ? (
          <Link href="/sell/dashboard" style={menuItemStyle}>
            Dashboard ร้านของฉัน
          </Link>
        ) : null}

        {isSeller ? (
          <Link href="/sell/bookings" style={menuItemStyle}>
            การจองของร้าน
          </Link>
        ) : null}

        <Link href="/account/bookings" style={menuItemStyle}>
          การจองของฉัน
        </Link>

        <Link href="/account" style={menuItemStyle}>
          บัญชีของฉัน
        </Link>

        <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />

        <form action="/auth/signout" method="POST">
          <button type="submit" style={{ ...menuItemStyle, width: "100%", textAlign: "left" }}>
            ออกจากระบบ
          </button>
        </form>
      </div>
    </details>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 16px",
  fontSize: 14,
  color: "var(--ink)",
  cursor: "pointer",
};
