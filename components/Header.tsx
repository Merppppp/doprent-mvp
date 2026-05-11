import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Header() {
  const user = await getCurrentUser().catch(() => null);

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
          gap: 24,
          padding: "14px 24px",
        }}
      >
        <Link href="/" style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.01em" }}>
          DopRent
        </Link>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 14,
            color: "var(--ink-2)",
          }}
        >
          <Link href="/browse" style={{ padding: "6px 0" }}>
            เลือกชุด
          </Link>
          <Link href="/boutiques" style={{ padding: "6px 0" }}>
            ร้านเช่า
          </Link>
        </nav>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {user ? (
            <UserMenu
              fullName={user.profile.full_name || user.email.split("@")[0]}
              email={user.email}
              isAdmin={user.profile.role === "admin"}
            />
          ) : (
            <>
              <Link href="/login" className="btn btn-outline" style={{ padding: "9px 14px" }}>
                เข้าสู่ระบบ
              </Link>
              <Link href="/signup" className="btn btn-dark">
                สมัครสมาชิก
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function UserMenu({
  fullName,
  email,
  isAdmin,
}: {
  fullName: string;
  email: string;
  isAdmin: boolean;
}) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
            color: "#fff",
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
                  color: "#fff",
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
